export const PROVIDERS = ["doubao", "qwen", "deepseek"];
export const RESPONSE_MODES = ["direct", "web_search"];

const definitions = {
  doubao: {
    displayName: "豆包",
    keyNames: ["DOUBAO_ARK_API_KEY", "DOUBAO_ARK_KEY"],
    modelEnv: "DOUBAO_ARK_MODELS",
    defaultModels: ["doubao-seed-2-1-pro-260628", "doubao-seed-2-1-turbo-260628"],
    tiers: ["flagship", "secondary"],
    endpoints: {
      direct: "https://ark.cn-beijing.volces.com/api/v3/responses",
      web_search: "https://ark.cn-beijing.volces.com/api/v3/responses",
    },
  },
  qwen: {
    displayName: "千问",
    keyNames: ["DASHSCOPE_API_KEY"],
    modelEnv: "QWEN_MODELS",
    defaultModels: ["qwen3.8-max", "qwen3.7-plus"],
    tiers: ["flagship", "secondary"],
    endpoints: {
      direct: "https://dashscope.aliyuncs.com/compatible-mode/v1/responses",
      web_search: "https://dashscope.aliyuncs.com/compatible-mode/v1/responses",
    },
  },
  deepseek: {
    displayName: "DeepSeek",
    keyNames: ["DEEPSEEK_API_KEY"],
    modelEnv: "DEEPSEEK_MODELS",
    defaultModels: ["deepseek-v4-pro", "deepseek-v4-flash"],
    tiers: ["flagship", "secondary"],
    endpoints: {
      direct: "https://api.deepseek.com/responses",
      web_search: "https://api.deepseek.com/responses",
    },
  },
};

function endpointsFor(provider, model) {
  const endpoints = { ...definitions[provider].endpoints };
  // DeepSeek Responses API currently supports V4 Flash only. V4 Pro direct
  // monitoring therefore uses the official Chat Completions endpoint.
  if (provider === "deepseek" && model === "deepseek-v4-pro") {
    endpoints.direct = "https://api.deepseek.com/chat/completions";
  }
  return endpoints;
}

function protocolFor(provider, model, mode) {
  if (provider === "deepseek" && model === "deepseek-v4-pro" && mode === "direct") return "chat_completions";
  return "responses";
}

function configuredModels(provider, environment) {
  const definition = definitions[provider];
  return String(environment[definition.modelEnv] || definition.defaultModels.join(","))
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 2);
}

function supportsWebSearch(provider, index) {
  return provider !== "deepseek" || index === 1;
}

export function providerCatalog(environment = process.env) {
  return PROVIDERS.flatMap((provider) => {
    const definition = definitions[provider];
    return configuredModels(provider, environment).map((model, index) => ({
      provider,
      displayName: definition.displayName,
      model,
      tier: definition.tiers[index] || `tier_${index + 1}`,
      endpoint: endpointsFor(provider, model),
      protocol: {
        direct: protocolFor(provider, model, "direct"),
        web_search: protocolFor(provider, model, "web_search"),
      },
      supports: { direct: true, web_search: supportsWebSearch(provider, index) },
      keyNames: definition.keyNames,
    }));
  });
}

export function providerKey(provider, environment = process.env) {
  const definition = definitions[provider];
  if (!definition) return "";
  return definition.keyNames.map((name) => environment[name]).find(Boolean) || "";
}

export function resolveCapability(provider, model, mode, environment = process.env) {
  if (!PROVIDERS.includes(provider)) throw new Error(`不支持的平台：${provider}`);
  if (!RESPONSE_MODES.includes(mode)) throw new Error(`不支持的回答模式：${mode}`);
  const capability = providerCatalog(environment).find((item) => item.provider === provider && item.model === model);
  if (!capability) throw new Error(`${provider} 未配置模型 ${model}`);
  if (!capability.supports[mode]) throw new Error(`${provider}/${model} 不支持 ${mode}`);
  return capability;
}

export function publicCapabilityMatrix(environment = process.env) {
  return providerCatalog(environment).map(({ keyNames, endpoint, ...item }) => item);
}
