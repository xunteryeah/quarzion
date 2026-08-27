import assert from "node:assert/strict";
import test from "node:test";
import { extractUrls, parseBrandMentions } from "../frontend/lib/parser.ts";

test("解析器使用中性基线并对重叠别名去重", () => {
  const brands = [{ id: "brand-a", name: "Quarzion", canonicalName: "Quarzion", isPrimary: 1, aliases: ["Quar"] }];
  const positive = parseBrandMentions("Quarzion 很稳定、专业，值得推荐。", brands);
  const negative = parseBrandMentions("Quarzion 存在风险、不稳定和错误，不推荐。", brands);
  assert.equal(positive[0].mentionCount, 1, "Quar 不应与 Quarzion 在同一位置重复计数");
  assert.ok(positive[0].sentimentScore > 50);
  assert.ok(negative[0].sentimentScore < 50);
});

test("引用 URL 去重并排除中文标点", () => {
  assert.deepEqual(extractUrls("来源 https://example.com/a，重复 https://example.com/a。另见 https://example.org/b"), ["https://example.com/a", "https://example.org/b"]);
});
