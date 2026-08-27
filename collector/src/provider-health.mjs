const providers = [
  {
    id: "doubao",
    key: process.env.DOUBAO_ARK_API_KEY || process.env.DOUBAO_ARK_KEY || "",
    models: String(process.env.DOUBAO_ARK_MODELS || "doubao-seed-2-1-pro-260628,doubao-seed-2-1-turbo-260628").split(",").map((value) => value.trim()).filter(Boolean),
    modelsUrl: "https://ark.cn-beijing.volces.com/api/v3/models",
    responseUrl: "https://ark.cn-beijing.volces.com/api/v3/responses",
    request(model) {
      return { model, input: "只回复 OK", thinking: { type: "disabled" }, max_output_tokens: 16 };
    },
  },
  {
    id: "qwen",
    key: process.env.DASHSCOPE_API_KEY || "",
    models: String(process.env.QWEN_MODELS || "qwen3.8-max,qwen3.7-plus").split(",").map((value) => value.trim()).filter(Boolean),
    modelsUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1/models",
    responseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1/responses",
    request(model) {
      return { model, input: "只回复 OK", max_output_tokens: 16 };
    },
  },
  {
    id: "deepseek",
    key: process.env.DEEPSEEK_API_KEY || "",
    models: String(process.env.DEEPSEEK_MODELS || "deepseek-v4-pro,deepseek-v4-flash").split(",").map((value) => value.trim()).filter(Boolean),
    modelsUrl: "https://api.deepseek.com/models",
    responseUrl: "https://api.deepseek.com/chat/completions",
    request(model) {
      return { model, messages: [{ role: "user", content: "只回复 OK" }], thinking: { type: "disabled" }, max_tokens: 16, stream: false };
    },
  },
];

const generate = process.argv.includes("--generate");

async function requestJson(url, key, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
    });
    const raw = await response.text();
    let body = {};
    try { body = JSON.parse(raw); } catch { body = {}; }
    return { response, body };
  } finally {
    clearTimeout(timeout);
  }
}

function errorMessage(body) {
  return String(body?.error?.message || body?.message || "").slice(0, 500) || null;
}

const report = [];
for (const provider of providers) {
  if (!provider.key) {
    report.push({ provider: provider.id, configured: false, credential: "missing", requiredModels: provider.models });
    continue;
  }
  try {
    const { response, body } = await requestJson(provider.modelsUrl, provider.key);
    const available = Array.isArray(body.data) ? body.data.map((model) => String(model.id)) : [];
    const item = {
      provider: provider.id,
      configured: true,
      credential: response.ok ? "valid" : "invalid",
      modelsListed: provider.models.filter((model) => available.includes(model)),
      requiredModels: provider.models,
      generation: "not_tested",
      error: response.ok ? null : errorMessage(body),
    };
    if (generate && response.ok && provider.models[provider.models.length - 1]) {
      const model = provider.models[provider.models.length - 1];
      const generated = await requestJson(provider.responseUrl, provider.key, { method: "POST", body: JSON.stringify(provider.request(model)) });
      item.generation = generated.response.ok ? "ready" : /not activated|未开通|activate/i.test(errorMessage(generated.body) || "") ? "model_not_activated" : "failed";
      item.generationModel = model;
      item.error = generated.response.ok ? null : errorMessage(generated.body);
    }
    report.push(item);
  } catch (error) {
    report.push({ provider: provider.id, configured: true, credential: "unknown", generation: "failed", requiredModels: provider.models, error: error instanceof Error ? error.message : String(error) });
  }
}

console.log(JSON.stringify({ ok: report.every((item) => item.credential === "valid"), generated: generate, providers: report }, null, 2));
if (report.some((item) => item.credential === "invalid" || item.credential === "unknown")) process.exitCode = 1;
