import { chromium } from "playwright";
import { profileFor } from "./profiles.mjs";

const platform = process.argv[2];
const profile = profileFor(platform);
const waitMs = Math.max(1_000, Math.min(30_000, Number(process.argv[3] || 10_000)));
const prompt = process.argv.slice(4).join(" ").trim();
const browser = await chromium.launch({ headless: true, args: ["--disable-dev-shm-usage"] });
const context = await browser.newContext({ locale: "zh-CN", timezoneId: "Asia/Shanghai", viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

try {
  const response = await page.goto(profile.url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(waitMs);
  if (prompt) {
    let input = null;
    for (const selector of profile.inputSelectors) {
      const matches = page.locator(selector);
      for (let index = (await matches.count().catch(() => 0)) - 1; index >= 0; index -= 1) {
        const candidate = matches.nth(index);
        if (await candidate.isVisible().catch(() => false)) {
          input = candidate;
          break;
        }
      }
      if (input) break;
    }
    if (!input) throw new Error(`${profile.name} 未找到可见输入框`);
    if ((await input.getAttribute("contenteditable")) === "true") {
      await input.click();
      await input.pressSequentially(prompt, { delay: 10 });
    } else {
      await input.fill(prompt);
    }
    await input.press("Enter");
    await page.waitForTimeout(1_000);
    const remainingText = (await input.inputValue().catch(() => "")) || (await input.innerText().catch(() => ""));
    if (remainingText.includes(prompt)) {
      for (const selector of profile.sendSelectors ?? []) {
        const send = page.locator(selector).last();
        if (await send.isVisible().catch(() => false)) {
          await send.click();
          break;
        }
      }
    }
    await page.waitForTimeout(Math.max(12_000, waitMs));
  }
  const snapshot = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    body: (document.body?.innerText || "").replace(/\s+/g, " ").slice(0, 5_000),
    controls: [...document.querySelectorAll("textarea,[contenteditable],input,button")]
      .map((element, index) => ({
        index,
        tag: element.tagName,
        className: String(element.className).slice(0, 300),
        placeholder: element.getAttribute("placeholder"),
        dataPlaceholder: element.getAttribute("data-placeholder"),
        ariaLabel: element.getAttribute("aria-label"),
        text: String(element.innerText || element.value || "").replace(/\s+/g, " ").slice(0, 180),
        visible: Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length),
      }))
      .filter((item) => item.visible)
      .slice(0, 100),
    textBlocks: [...document.querySelectorAll("main article,main [class], [data-testid]")]
      .map((element) => ({
        tag: element.tagName,
        className: String(element.className).slice(0, 300),
        testId: element.getAttribute("data-testid"),
        text: String(element.innerText || "").replace(/\s+/g, " ").trim().slice(0, 500),
      }))
      .filter((item) => item.text.length >= 20)
      .slice(-80),
    dialogs: [...document.querySelectorAll("[role='dialog'],[aria-modal='true'],dialog")]
      .map((element) => ({
        tag: element.tagName,
        className: String(element.className).slice(0, 300),
        text: String(element.innerText || "").replace(/\s+/g, " ").trim().slice(0, 1_000),
        visible: Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length),
      }))
      .filter((item) => item.visible),
    richTextBlocks: [...document.querySelectorAll("p,li,pre,blockquote,[class]")]
      .map((element) => ({
        tag: element.tagName,
        className: String(element.className).slice(0, 300),
        text: String(element.innerText || "").replace(/\s+/g, " ").trim().slice(0, 1_000),
      }))
      .filter((item) => item.text.length >= 20 && item.text.length <= 2_000)
      .slice(-120),
  }));
  console.log(JSON.stringify({ platform, prompt: prompt || null, httpStatus: response?.status() ?? 0, ...snapshot }, null, 2));
} finally {
  await context.close();
  await browser.close();
}
