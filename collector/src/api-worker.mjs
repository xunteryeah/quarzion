import { ApiClient } from "./api-client.mjs";
import { executeProviderTask, ProviderRequestError } from "./provider-adapters.mjs";
import { PROVIDERS, publicCapabilityMatrix } from "./provider-catalog.mjs";

const configuredPlatforms = String(process.env.COLLECTOR_PLATFORMS || PROVIDERS.join(","))
  .split(",")
  .map((value) => value.trim())
  .filter((value) => PROVIDERS.includes(value));

const config = {
  baseUrl: process.env.QUARZION_API_BASE || "http://frontend:3000",
  secret: process.env.GEO_PROOF_INGEST_KEY || "",
  workerId: process.env.COLLECTOR_WORKER_ID || "collector-cn-shanghai-01",
  label: process.env.COLLECTOR_LABEL || "Shanghai official API worker",
  collectorVersion: `windcall-api-worker/${process.env.COLLECTOR_VERSION || "2.0.0"}`,
  pollMs: Math.max(1_000, Number(process.env.COLLECTOR_POLL_MS || 5_000)),
  platforms: configuredPlatforms.length ? configuredPlatforms : PROVIDERS,
};

if (!config.secret) throw new Error("GEO_PROOF_INGEST_KEY 未配置");

const api = new ApiClient(config);
let stopping = false;
let platformIndex = 0;
process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const log = (event, details = {}) => console.log(JSON.stringify({ time: new Date().toISOString(), event, workerId: config.workerId, ...details }));

await api.register(config.platforms, { executionMode: "official_api", capabilities: publicCapabilityMatrix() });
log("worker_registered", { platforms: config.platforms, collectorVersion: config.collectorVersion });

while (!stopping) {
  let task = null;
  const platform = config.platforms[platformIndex % config.platforms.length];
  platformIndex = (platformIndex + 1) % config.platforms.length;
  try {
    task = await api.next(platform);
    if (!task?.runId) {
      await sleep(Math.max(1_000, Math.floor(config.pollMs / config.platforms.length)));
      continue;
    }
    log("run_claimed", { runId: task.runId, platform: task.platform, model: task.modelVersion, mode: task.responseMode });
    const heartbeat = setInterval(() => api.heartbeat(task.runId, task.leaseToken).catch((error) => log("heartbeat_failed", { runId: task.runId, message: error.message })), 20_000);
    try {
      const result = await executeProviderTask(task);
      await api.ingest(task, result);
      log("run_ingested", { runId: task.runId, platform: task.platform, model: result.modelVersion, mode: result.responseMode, searchPerformed: result.searchPerformed, durationMs: result.durationMs });
    } catch (error) {
      const providerError = error instanceof ProviderRequestError ? error : new ProviderRequestError(error instanceof Error ? error.message : String(error), { provider: task.platform });
      await api.ingest(task, {
        status: "failed",
        failureCode: providerError.status === 429 ? "provider_rate_limited" : providerError.retryable ? "provider_error" : "provider_rejected",
        errorMessage: providerError.message,
        modelVersion: task.modelVersion,
        responseMode: task.responseMode || "direct",
        sourceUrl: null,
      });
      log("run_failed", { runId: task.runId, platform: task.platform, status: providerError.status, retryable: providerError.retryable, message: providerError.message });
    } finally {
      clearInterval(heartbeat);
    }
  } catch (error) {
    log("worker_error", { runId: task?.runId || null, platform, message: error instanceof Error ? error.message : String(error) });
    await sleep(Math.min(30_000, config.pollMs * 2));
  }
}

log("worker_stopped");
