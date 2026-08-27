import test from "node:test";
import assert from "node:assert/strict";
import { chooseAnswer, detectBlocker, detectPageBlocker, profiles } from "../src/profiles.mjs";

test("三平台都固定为公开网页与匿名输入选择器", () => {
  assert.deepEqual(Object.keys(profiles).sort(), ["deepseek", "doubao", "yuanbao"]);
  for (const profile of Object.values(profiles)) {
    assert.match(profile.url, /^https:\/\//);
    assert.ok(profile.inputSelectors.length >= 3);
    assert.ok(profile.answerSelectors.length >= 3);
  }
});

test("验证码、登录墙与频率保护不会被当成成功回答", () => {
  assert.equal(detectBlocker("请完成人机验证").code, "captcha_required");
  assert.equal(detectBlocker("登录后继续使用").code, "login_required");
  assert.equal(detectBlocker("请求过于频繁，请稍后再试").code, "access_blocked");
  assert.equal(detectBlocker("Request blocked. The request could not be satisfied.").code, "access_blocked");
});

test("真实页面的 403、平台登录跳转和元宝登录输入框会被准确分类", () => {
  assert.equal(detectPageBlocker({ profile: profiles.deepseek, httpStatus: 403 }).code, "access_blocked");
  assert.equal(detectPageBlocker({ profile: profiles.doubao, url: "https://www.doubao.com/security/doubao-region-ban?source=1" }).code, "access_blocked");
  assert.equal(detectPageBlocker({ profile: profiles.doubao, url: "https://www.doubao.com/chat/?from_logout=1" }).code, "login_required");
  assert.equal(detectPageBlocker({ profile: profiles.yuanbao, inputHint: "请登录后输入内容" }).code, "login_required");
  assert.equal(detectPageBlocker({ profile: profiles.deepseek, url: "https://chat.deepseek.com/sign_in" }).code, "login_required");
});

test("回答选择排除原提示词并选择完整候选", () => {
  assert.equal(chooseAnswer(["上海哪家饭店好吃", "简短", "综合口味、交通与稳定性，以下列出三家饭店并说明推荐理由。"], "上海哪家饭店好吃"), "综合口味、交通与稳定性，以下列出三家饭店并说明推荐理由。");
  assert.equal(chooseAnswer(["旧回答内容至少二十个字，不应被重复采集。", "问题新回答内容至少二十个字，应当去掉前面的原问题。"], "问题", ["旧回答内容至少二十个字，不应被重复采集。"]), "新回答内容至少二十个字，应当去掉前面的原问题。");
});
