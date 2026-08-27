import { chromium } from "playwright";
import { ApiClient } from "./api-client.mjs";
import { collectWithBrowser } from "./browser-adapter.mjs";
import { profiles } from "./profiles.mjs";

const configuredPlatforms = String(process.env.COLLECTOR_PLATFORMS || "doubao,yuanbao,deepseek")
  .split(",")
  .map((value) => value.trim())
  .filter((value) => Object.hasOwn(profiles, value));

const config = {
  baseUrl: process.env.QUARZION_API_BASE || "http://frontend:3000",
  secret: process.env.GEO_PROOF_INGEST_KEY || "",
  workerId: process.env.COLLECTOR_WORKER_ID || "collector-sg-01",
  label: process.env.COLLECTOR_LABEL || "Quarzion anonymous collector",
  collectorVersion: `quarzion-collector/${process.env.COLLECTOR_VERSION || "1.1.0"}`,
  pollMs: Math.max(1_000, Number(process.env.COLLECTOR_POLL_MS || 5_000)),
  headless: process.env.COLLECTOR_HEADLESS !== "0",
  platforms: configuredPlatforms.length ? configuredPlatforms : ["doubao", "yuanbao", "deepseek"],
};

if (!config.secret) throw new Error("GEO_PROOF_INGEST_KEY 未配置");

const api = new ApiClient(config);
let stopping = false;
let platformIndex = 0;
process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const log = (event, details = {}) => console.log(JSON.stringify({ time: new Date().toISOString(), event, workerId: config.workerId, ...details }));

const browser = await chromium.launch({ headless: config.headless, args: ["--disable-dev-shm-usage"] });
try {
  await api.register(config.platforms);
  log("collector_registered", { platforms: config.platforms, collectorVersion: config.collectorVersion });
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
      log("run_claimed", { runId: task.runId, platform: task.platform, attempt: task.attempt });
      const heartbeat = setInterval(() => api.heartbeat(task.runId, task.leaseToken).catch((error) => console.error("heartbeat", error.message)), 20_000);
      let result;
      try {
        result = await collectWithBrowser(browser, task);
      } finally {
        clearInterval(heartbeat);
      }
      await api.ingest(task, result);
      log("run_ingested", { runId: task.runId, platform: task.platform, status: result.status, failureCode: result.failureCode ?? null, durationMs: result.durationMs ?? null });
    } catch (error) {
      console.error(JSON.stringify({ time: new Date().toISOString(), event: "collector_error", runId: task?.runId ?? null, platform, message: error instanceof Error ? error.message : String(error) }));
      await sleep(Math.min(30_000, config.pollMs * 2));
    }
  }
} finally {
  await browser.close();
}
