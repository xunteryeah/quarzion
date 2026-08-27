import { createHash } from "node:crypto";
import { providerKey, resolveCapability } from "./provider-catalog.mjs";
import { extractAnswerText, extractCitations, extractUsage, responseRequestId, searchWasPerformed } from "./provider-response.mjs";

export class ProviderRequestError extends Error {
  constructor(message, { provider, status = null, retryable = true, responseBody = null } = {}) {
    super(message);
    this.name = "ProviderRequestError";
    this.provider = provider;
    this.status = status;
    this.retryable = retryable;
    this.responseBody = responseBody;
  }
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function chatCompletionsRequest(model, prompt, maxOutputTokens) {
  return {
    model,
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: maxOutputTokens,
    thinking: { type: "enabled" },
    reasoning_effort: "low",
  };
}

function responsesRequest(capability, mode, prompt, maxOutputTokens) {
  const request = { model: capability.model, input: prompt, max_output_tokens: maxOutputTokens };
  if (capability.provider === "doubao") request.thinking = { type: "disabled" };
  if (capability.provider === "qwen") request.reasoning = { effort: "none" };
  if (capability.provider === "deepseek") request.reasoning = { effort: "low" };
  if (mode === "web_search") {
    request.tools = [{ type: "web_search" }];
    if (capability.provider === "qwen") request.instructions = "这是联网监测任务。回答前必须先调用 web_search 工具检索公开网页；答案必须基于检索结果，并列出可核验的来源。不要仅凭模型记忆回答。";
    if (capability.provider === "deepseek") request.tool_choice = { type: "web_search" };
    if (capability.provider === "doubao") request.tool_choice = "required";
  }
  return request;
}

function requestFor(capability, mode, prompt, maxOutputTokens) {
  if (capability.protocol[mode] === "chat_completions") return chatCompletionsRequest(capability.model, prompt, maxOutputTokens);
  return responsesRequest(capability, mode, prompt, maxOutputTokens);
}

function failureMessage(body, status) {
  return String(body?.error?.message || body?.message || body?.code || `HTTP ${status}`).slice(0, 1000);
}

async function fetchJson(url, key, body, { fetchImpl, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const raw = await response.text();
    let json;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new ProviderRequestError("供应商返回了非 JSON 响应", { status: response.status, responseBody: raw.slice(0, 1000) });
    }
    return { response, json, raw };
  } finally {
    clearTimeout(timer);
  }
}

export async function executeProviderTask(task, options = {}) {
  const environment = options.environment || process.env;
  const fetchImpl = options.fetchImpl || fetch;
  const provider = String(task.platform || task.provider || "");
  const model = String(task.modelVersion || task.model || "");
  const mode = String(task.responseMode || "direct");
  const capability = resolveCapability(provider, model, mode, environment);
  const key = providerKey(provider, environment);
  if (!key) throw new ProviderRequestError(`${capability.displayName} API Key 未配置`, { provider, retryable: false });
  const maxOutputTokens = Math.max(64, Math.min(16384, Number(task.maxOutputTokens || 8192)));
  const requestBody = requestFor(capability, mode, String(task.queryText || "").trim(), maxOutputTokens);
  const requestJson = stableJson(requestBody);
  const started = performance.now();
  let exchange;
  try {
    exchange = await fetchJson(capability.endpoint[mode], key, requestBody, {
      fetchImpl,
      timeoutMs: Math.max(5_000, Math.min(300_000, Number(task.timeoutSeconds || 120) * 1000)),
    });
  } catch (error) {
    if (error instanceof ProviderRequestError) {
      error.provider ||= provider;
      throw error;
    }
    const timedOut = error instanceof Error && error.name === "AbortError";
    throw new ProviderRequestError(timedOut ? "供应商请求超时" : error instanceof Error ? error.message : String(error), { provider, retryable: true });
  }
  const durationMs = Math.round(performance.now() - started);
  if (!exchange.response.ok) {
    const retryable = exchange.response.status === 408 || exchange.response.status === 409 || exchange.response.status === 429 || exchange.response.status >= 500;
    throw new ProviderRequestError(failureMessage(exchange.json, exchange.response.status), { provider, status: exchange.response.status, retryable, responseBody: exchange.raw.slice(0, 2000) });
  }
  const rawText = extractAnswerText(exchange.json);
  if (!rawText) throw new ProviderRequestError("供应商返回成功但回答为空", { provider, retryable: true, responseBody: exchange.raw.slice(0, 2000) });
  const citations = extractCitations(exchange.json);
  const searchPerformed = searchWasPerformed(exchange.json);
  return {
    status: "success",
    rawText,
    citations,
    sourceUrl: capability.endpoint[mode],
    pageTitle: `${capability.displayName} 官方 API`,
    providerRequestId: responseRequestId(exchange.json, exchange.response.headers),
    modelVersion: capability.model,
    modelTier: capability.tier,
    responseMode: mode,
    searchPerformed,
    usage: extractUsage(exchange.json),
    durationMs,
    requestSha256: sha256(requestJson),
    providerResponseSha256: sha256(exchange.raw),
    rawResponseJson: exchange.raw,
    capabilitySnapshot: {
      provider,
      model: capability.model,
      tier: capability.tier,
      mode,
      protocol: capability.protocol[mode],
      supports: capability.supports,
      searchPolicy: mode === "web_search" ? (provider === "qwen" ? "model_decides_with_mandatory_instruction" : "required_tool_choice") : "disabled",
    },
  };
}
