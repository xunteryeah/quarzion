export const profiles = {
  doubao: {
    name: "豆包",
    url: "https://www.doubao.com/chat/",
    allowedHosts: ["doubao.com", "www.doubao.com"],
    readyTimeoutMs: 15_000,
    blockedUrls: [
      { pattern: /\/security\/doubao-region-ban/i, code: "access_blocked", message: "豆包当前出口地区不可用" },
      { pattern: /[?&]from_logout=1(?:&|$)/i, code: "login_required", message: "豆包匿名提问被退回登录前页面，需要接入可用账号" },
    ],
    inputSelectors: [
      "textarea[placeholder*='问']",
      "textarea[placeholder*='发送']",
      "[contenteditable='true'][data-placeholder]",
      "[contenteditable='true']",
      "textarea",
    ],
    answerSelectors: [
      "[data-testid*='assistant']",
      "[class*='assistant-message']",
      "[class*='markdown']",
      "[class*='answer']",
      "[class*='message-content']",
    ],
    busySelectors: [
      "button[aria-label*='停止']",
      "button[title*='停止']",
      "[data-testid*='stop']",
      "[class*='generating']",
    ],
    sendSelectors: [
      "button[aria-label*='发送']",
      "button[title*='发送']",
      "[data-testid*='send']",
    ],
  },
  yuanbao: {
    name: "腾讯元宝",
    url: "https://yuanbao.tencent.com/chat/",
    allowedHosts: ["yuanbao.tencent.com"],
    readyTimeoutMs: 15_000,
    blockedUrls: [],
    inputSelectors: [
      "textarea[placeholder*='输入']",
      "textarea[placeholder*='问']",
      "[contenteditable='true'][data-placeholder]",
      "[contenteditable='true']",
      "textarea",
    ],
    answerSelectors: [
      "[data-testid*='assistant']",
      "[class*='agent-message']",
      "[class*='markdown']",
      "[class*='answer']",
      "[class*='message-content']",
    ],
    busySelectors: [
      "button[aria-label*='停止']",
      "button[title*='停止']",
      "[class*='generating']",
      "[class*='typing']",
    ],
    sendSelectors: [
      "button[aria-label*='发送']",
      "button[title*='发送']",
      "[class*='send-btn']",
    ],
  },
  deepseek: {
    name: "DeepSeek",
    url: "https://chat.deepseek.com/",
    allowedHosts: ["chat.deepseek.com"],
    readyTimeoutMs: 15_000,
    blockedUrls: [
      { pattern: /\/sign_in(?:[/?#]|$)/i, code: "login_required", message: "DeepSeek 匿名访问跳转登录页，需要接入可用账号" },
    ],
    inputSelectors: [
      "textarea[placeholder*='Message']",
      "textarea[placeholder*='输入']",
      "[contenteditable='true']",
      "textarea",
    ],
    answerSelectors: [
      "[data-testid*='assistant']",
      "[class*='ds-markdown']",
      "[class*='markdown']",
      "[class*='answer']",
      "[class*='message-content']",
    ],
    busySelectors: [
      "button[aria-label*='停止']",
      "button[title*='停止']",
      "[data-testid*='stop']",
      "[class*='loading']",
    ],
    sendSelectors: [
      "button[aria-label*='发送']",
      "button[aria-label*='Send']",
      "[data-testid*='send']",
    ],
  },
};

export function profileFor(platform) {
  const profile = profiles[platform];
  if (!profile) throw new CollectionError("worker_error", `不支持的平台：${platform}`);
  return profile;
}

export class CollectionError extends Error {
  constructor(code, message, metadata = {}) {
    super(message);
    this.name = "CollectionError";
    this.code = code;
    this.metadata = metadata;
  }
}

export function detectBlocker(text) {
  const normalized = String(text ?? "").replace(/\s+/g, " ").slice(0, 50_000);
  if (/验证码|人机验证|安全验证|captcha|verify you are human/i.test(normalized)) return { code: "captcha_required", message: "平台要求完成验证码或人机验证" };
  if (/登录后继续|请登录后|请先登录|扫码登录|手机号登录|log in|sign in to continue/i.test(normalized)) return { code: "login_required", message: "匿名页面要求登录后继续" };
  if (/访问受限|地区不可用|地域限制|请求过于频繁|稍后再试|拒绝访问|request blocked|could not be satisfied|forbidden|access denied|too many requests/i.test(normalized)) return { code: "access_blocked", message: "平台拒绝访问、限制当前地区或触发频率保护" };
  return null;
}

export function detectPageBlocker({ profile, text = "", url = "", title = "", httpStatus = 0, inputHint = "" }) {
  for (const rule of profile?.blockedUrls ?? []) {
    if (rule.pattern.test(String(url))) return { code: rule.code, message: rule.message };
  }
  if ([401, 403, 429, 451].includes(Number(httpStatus))) {
    return { code: "access_blocked", message: `${profile?.name ?? "平台"} 返回 HTTP ${httpStatus}，匿名访问被拒绝` };
  }
  return detectBlocker(`${title}\n${inputHint}\n${text}`);
}

export function chooseAnswer(candidates, query, baseline = []) {
  const normalizedQuery = String(query ?? "").replace(/\s+/g, " ").trim();
  const baselineSet = new Set(baseline.map((value) => String(value ?? "").replace(/\s+/g, " ").trim()));
  const cleaned = candidates
    .map((value) => String(value ?? "").replace(/\s+/g, " ").trim())
    .filter((value) => !baselineSet.has(value))
    .map((value) => value.startsWith(normalizedQuery) ? value.slice(normalizedQuery.length).trim() : value)
    .filter((value) => value.length >= 20 && value !== normalizedQuery);
  return cleaned.sort((left, right) => right.length - left.length)[0] ?? null;
}
