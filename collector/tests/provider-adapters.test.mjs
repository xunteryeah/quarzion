import assert from "node:assert/strict";
import test from "node:test";
import { executeProviderTask } from "../src/provider-adapters.mjs";
import { providerCatalog, resolveCapability } from "../src/provider-catalog.mjs";

const environment = {
  DOUBAO_ARK_API_KEY: "test-doubao",
  DASHSCOPE_API_KEY: "test-qwen",
  DEEPSEEK_API_KEY: "test-deepseek",
};

function response(body, headers = {}) {
  return new Response(JSON.stringify(body), { status: 200, headers });
}

test("能力表拒绝 DeepSeek V4 Pro 原生联网并保留 11 个有效组合", () => {
  const catalog = providerCatalog(environment);
  assert.equal(catalog.length, 6);
  const supported = catalog.flatMap((item) => Object.entries(item.supports).filter(([, enabled]) => enabled).map(([mode]) => `${item.provider}:${item.model}:${mode}`));
  assert.equal(supported.length, 11);
  assert.throws(() => resolveCapability("deepseek", "deepseek-v4-pro", "web_search", environment), /不支持/);
});

test("豆包 Responses API 解析回答、引用、搜索调用、Token 和请求 ID", async () => {
  let sent;
  const result = await executeProviderTask({ platform: "doubao", modelVersion: "doubao-seed-2-1-pro-260628", responseMode: "web_search", queryText: "中国腕表品牌推荐" }, {
    environment,
    fetchImpl: async (url, init) => {
      sent = { url, body: JSON.parse(init.body) };
      return response({
        id: "resp-doubao",
        output: [
          { type: "web_search_call", action: { sources: [{ url: "https://example.com/watch", title: "腕表报告" }] } },
          { type: "message", content: [{ type: "output_text", text: "劳力士在高端腕表中具有较高知名度。" }] },
        ],
        usage: { input_tokens: 20, output_tokens: 30 },
      }, { "x-request-id": "ark-request-1" });
    },
  });
  assert.match(sent.url, /volces\.com/);
  assert.deepEqual(sent.body.tools, [{ type: "web_search" }]);
  assert.equal(result.searchPerformed, true);
  assert.equal(result.citations[0].url, "https://example.com/watch");
  assert.equal(result.usage.outputTokens, 30);
  assert.equal(result.providerRequestId, "ark-request-1");
});

test("千问联网使用原生 DashScope 搜索并解析 search_info", async () => {
  let sent;
  const result = await executeProviderTask({ platform: "qwen", modelVersion: "qwen3.7-plus", responseMode: "web_search", queryText: "最新腕表行业趋势" }, {
    environment,
    fetchImpl: async (url, init) => {
      sent = { url, body: JSON.parse(init.body) };
      return response({
        request_id: "qwen-request-1",
        output: {
          choices: [{ message: { content: "行业趋势回答", search_info: { search_results: [{ url: "https://example.cn/report", title: "行业趋势", snippet: "摘要" }] } } }],
        },
        usage: { input_tokens: 15, output_tokens: 25 },
      });
    },
  });
  assert.match(sent.url, /text-generation\/generation/);
  assert.equal(sent.body.parameters.enable_search, true);
  assert.equal(sent.body.parameters.search_options.forced_search, true);
  assert.equal(result.rawText, "行业趋势回答");
  assert.equal(result.searchPerformed, true);
  assert.equal(result.citations[0].snippet, "摘要");
});

test("DeepSeek Flash Responses API 记录原生搜索调用", async () => {
  const result = await executeProviderTask({ platform: "deepseek", modelVersion: "deepseek-v4-flash", responseMode: "web_search", queryText: "今天的腕表新闻" }, {
    environment,
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(init.body);
      assert.deepEqual(body.tool_choice, { type: "web_search" });
      return response({
        id: "deepseek-response-1",
        output: [
          { type: "web_search_call", action: { sources: [{ url: "https://news.example.com/a" }] } },
          { type: "message", content: [{ type: "output_text", text: "今日新闻摘要" }] },
        ],
        usage: { input_tokens: 11, output_tokens: 19, output_tokens_details: { reasoning_tokens: 4 } },
      });
    },
  });
  assert.equal(result.rawText, "今日新闻摘要");
  assert.equal(result.usage.reasoningTokens, 4);
  assert.match(result.requestSha256, /^[a-f0-9]{64}$/);
  assert.match(result.providerResponseSha256, /^[a-f0-9]{64}$/);
});

test("DeepSeek V4 Pro 直答使用官方 Chat Completions 而不是不支持的 Responses", async () => {
  let sent;
  const result = await executeProviderTask({ platform: "deepseek", modelVersion: "deepseek-v4-pro", responseMode: "direct", queryText: "高端腕表品牌有哪些？" }, {
    environment,
    fetchImpl: async (url, init) => {
      sent = { url, body: JSON.parse(init.body) };
      return response({
        id: "deepseek-chat-1",
        choices: [{ message: { content: "劳力士、欧米茄与百达翡丽是常见高端腕表品牌。" } }],
        usage: { prompt_tokens: 9, completion_tokens: 13 },
      });
    },
  });
  assert.match(sent.url, /chat\/completions$/);
  assert.equal(sent.body.messages[0].role, "user");
  assert.equal(sent.body.max_completion_tokens, 2048);
  assert.equal(result.rawText, "劳力士、欧米茄与百达翡丽是常见高端腕表品牌。");
  assert.equal(result.capabilitySnapshot.protocol, "chat_completions");
});
