import test from "node:test";
import assert from "node:assert/strict";
import { ApiClient } from "../src/api-client.mjs";

test("采集器按平台轮询并在注册时声明真实支持范围", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, init = {}) => {
    requests.push({ url: String(url), init });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const api = new ApiClient({ baseUrl: "https://quarzion.test/", secret: "secret", workerId: "worker-01", collectorVersion: "collector/test", label: "测试采集器" });
    await api.register(["doubao", "deepseek"]);
    await api.next("yuanbao");
    assert.equal(requests[0].url, "https://quarzion.test/api/collector/register");
    assert.deepEqual(JSON.parse(requests[0].init.body).supportedPlatforms, ["doubao", "deepseek"]);
    assert.equal(requests[1].url, "https://quarzion.test/api/collector/next?platform=yuanbao");
    assert.equal(requests[1].init.headers["X-Quarzion-Worker-Id"], "worker-01");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
