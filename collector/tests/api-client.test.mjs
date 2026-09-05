import test from "node:test";
import assert from "node:assert/strict";
import { ApiClient } from "../src/api-client.mjs";

test("官方 API Worker 按平台轮询并声明能力范围", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, init = {}) => {
    requests.push({ url: String(url), init });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const api = new ApiClient({
      baseUrl: "https://quarzion.test/",
      secret: "secret",
      workerId: "worker-01",
      collectorVersion: "collector/test",
      label: "测试采集器",
    });
    await api.register(["doubao", "qwen", "deepseek"], {
      executionMode: "official_api",
      capabilities: [{ provider: "qwen", model: "qwen3.7-plus" }],
    });
    await api.next("qwen");
    assert.equal(
      requests[0].url,
      "https://quarzion.test/api/collector/register",
    );
    const registration = JSON.parse(requests[0].init.body);
    assert.deepEqual(registration.supportedPlatforms, [
      "doubao",
      "qwen",
      "deepseek",
    ]);
    assert.equal(registration.executionMode, "official_api");
    assert.equal(
      requests[1].url,
      "https://quarzion.test/api/collector/next?platform=qwen",
    );
    assert.equal(requests[1].init.headers["X-WindCall-Worker-Id"], "worker-01");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
