import { createHash } from "node:crypto";
import { CollectionError, chooseAnswer, detectPageBlocker, profileFor } from "./profiles.mjs";

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function firstVisible(page, selectors) {
  for (const selector of selectors) {
    const matches = page.locator(selector);
    const count = await matches.count().catch(() => 0);
    for (let index = count - 1; index >= 0; index -= 1) {
      const locator = matches.nth(index);
      if (await locator.isVisible().catch(() => false) && await locator.isEnabled().catch(() => true)) return locator;
    }
  }
  return null;
}

async function candidateTexts(page, selectors) {
  const values = [];
  for (const selector of selectors) {
    const texts = await page.locator(selector).allTextContents().catch(() => []);
    values.push(...texts);
  }
  return [...new Set(values.map((value) => value.replace(/\s+/g, " ").trim()).filter(Boolean))];
}

async function inputHint(input) {
  if (!input) return "";
  const values = await Promise.all(["placeholder", "data-placeholder", "aria-label", "title"].map((name) => input.getAttribute(name).catch(() => "")));
  return values.filter(Boolean).join(" ");
}

async function blockerFromPage(page, profile, httpStatus = 0, input = null) {
  const body = await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "");
  return detectPageBlocker({
    profile,
    text: body,
    url: page.url(),
    title: await page.title().catch(() => ""),
    httpStatus,
    inputHint: await inputHint(input),
  });
}

async function waitForInput(page, profile, httpStatus) {
  const started = Date.now();
  while (Date.now() - started < profile.readyTimeoutMs) {
    const input = await firstVisible(page, profile.inputSelectors);
    const blocker = await blockerFromPage(page, profile, httpStatus, input);
    if (blocker) throw new CollectionError(blocker.code, blocker.message);
    if (input) return input;
    await sleep(500);
  }
  throw new CollectionError("selector_changed", `${profile.name} 页面在 ${Math.round(profile.readyTimeoutMs / 1000)} 秒内未出现可用的公开提问输入框`);
}

async function isBusy(page, profile) {
  return Boolean(await firstVisible(page, profile.busySelectors ?? []));
}

async function waitForAnswer(page, profile, query, timeoutMs, baseline) {
  const started = Date.now();
  let last = "";
  let stableSince = 0;
  while (Date.now() - started < timeoutMs) {
    const blocker = await blockerFromPage(page, profile);
    if (blocker) throw new CollectionError(blocker.code, blocker.message);
    const busy = await isBusy(page, profile);
    const answer = chooseAnswer(await candidateTexts(page, profile.answerSelectors), query, baseline);
    if (answer && answer === last) {
      if (!stableSince) stableSince = Date.now();
      if (!busy && Date.now() - stableSince >= 5_000) return answer;
    } else {
      last = answer ?? "";
      stableSince = answer ? Date.now() : 0;
    }
    await sleep(1_000);
  }
  if (last) return last;
  throw new CollectionError("answer_timeout", `等待 ${profile.name} 完整回答超时`);
}

async function citations(page, profile, answerLocator) {
  const root = answerLocator ?? page;
  const links = await root.locator("a[href]").evaluateAll((anchors) => anchors.map((anchor) => ({ url: anchor.href, title: (anchor.textContent || anchor.getAttribute("aria-label") || "").trim() }))).catch(() => []);
  const seen = new Set();
  return links.filter((link) => {
    try {
      const url = new URL(link.url);
      const host = url.hostname.toLowerCase();
      if (!/^https?:$/.test(url.protocol) || profile.allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`)) || seen.has(url.href)) return false;
      seen.add(url.href);
      return true;
    } catch {
      return false;
    }
  }).slice(0, 100);
}

async function screenshot(page) {
  let bytes = await page.screenshot({ type: "webp", quality: 55, fullPage: true });
  if (bytes.byteLength > 700_000) bytes = await page.screenshot({ type: "webp", quality: 48, fullPage: false });
  if (bytes.byteLength > 750_000) return null;
  return bytes.toString("base64");
}

async function pageEvidence(page) {
  const title = await page.title().catch(() => "");
  const bodySample = (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 8_000);
  const htmlEvidence = (await page.locator("body").evaluate((element) => element.outerHTML).catch(() => "")).slice(0, 250_000);
  const screenshotBase64 = await screenshot(page).catch(() => null);
  return {
    sourceUrl: page.url(),
    pageTitle: title,
    pageFingerprint: createHash("sha256").update(`${title}\n${bodySample}`).digest("hex"),
    htmlEvidence,
    screenshotBase64,
    screenshotMime: screenshotBase64 ? "image/webp" : null,
  };
}

async function editableText(input) {
  const editable = await input.getAttribute("contenteditable");
  return editable === "true" ? (await input.innerText().catch(() => "")) : (await input.inputValue().catch(() => ""));
}

async function submitPrompt(page, profile, input, query) {
  const editable = await input.getAttribute("contenteditable");
  if (editable === "true") {
    await input.click();
    await input.pressSequentially(query, { delay: 12 });
  } else {
    await input.fill(query);
  }
  await input.press("Enter");
  await page.waitForTimeout(750);
  if ((await editableText(input)).includes(query)) {
    const send = await firstVisible(page, profile.sendSelectors ?? []);
    if (send) {
      await send.click();
      await page.waitForTimeout(500);
    }
  }
  const blocker = await blockerFromPage(page, profile, 0, input);
  if (blocker) throw new CollectionError(blocker.code, blocker.message);
}

export async function collectWithBrowser(browser, task) {
  const profile = profileFor(task.platform);
  const context = await browser.newContext({
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const started = Date.now();
  try {
    const response = await page.goto(task.sourceUrl || profile.url, { waitUntil: "domcontentloaded", timeout: Math.min(90_000, task.timeoutSeconds * 1_000) });
    const input = await waitForInput(page, profile, response?.status() ?? 0);
    const baseline = await candidateTexts(page, profile.answerSelectors);
    await submitPrompt(page, profile, input, task.queryText);
    const rawText = await waitForAnswer(page, profile, task.queryText, Math.max(30_000, task.timeoutSeconds * 1_000 - (Date.now() - started)), baseline);
    const answerLocator = await firstVisible(page, profile.answerSelectors);
    const htmlEvidence = answerLocator ? (await answerLocator.evaluate((element) => element.outerHTML)).slice(0, 250_000) : "";
    const evidence = await pageEvidence(page);
    return {
      status: "success",
      rawText,
      citations: await citations(page, profile, answerLocator),
      screenshotBase64: evidence.screenshotBase64,
      screenshotMime: evidence.screenshotMime,
      htmlEvidence,
      sourceUrl: evidence.sourceUrl,
      pageTitle: evidence.pageTitle,
      pageFingerprint: evidence.pageFingerprint,
      modelVersion: null,
      durationMs: Date.now() - started,
    };
  } catch (error) {
    const known = error instanceof CollectionError ? error : new CollectionError(/timeout/i.test(String(error?.message)) ? "navigation_timeout" : "worker_error", String(error?.message ?? error));
    const evidence = await pageEvidence(page).catch(() => ({ sourceUrl: page.url() || profile.url, pageTitle: "", pageFingerprint: null, htmlEvidence: "", screenshotBase64: null, screenshotMime: null }));
    return {
      status: known.code === "captcha_required" || known.code === "login_required" || known.code === "access_blocked" || known.code === "selector_changed" ? "blocked" : "failed",
      failureCode: known.code,
      errorMessage: known.message,
      sourceUrl: evidence.sourceUrl,
      pageTitle: evidence.pageTitle,
      pageFingerprint: evidence.pageFingerprint,
      htmlEvidence: evidence.htmlEvidence,
      screenshotBase64: evidence.screenshotBase64,
      screenshotMime: evidence.screenshotMime,
      durationMs: Date.now() - started,
    };
  } finally {
    await context.close();
  }
}
