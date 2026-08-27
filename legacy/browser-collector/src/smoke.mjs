import { chromium } from "playwright";
import { collectWithBrowser } from "./browser-adapter.mjs";
import { profileFor } from "./profiles.mjs";

const platform = process.argv[2];
const queryText = process.argv.slice(3).join(" ").trim() || "请用一句话说明什么是生成式引擎优化（GEO）。";
const profile = profileFor(platform);
const browser = await chromium.launch({ headless: true, args: ["--disable-dev-shm-usage"] });

try {
  const result = await collectWithBrowser(browser, {
    platform,
    queryText,
    sourceUrl: profile.url,
    timeoutSeconds: 45,
  });
  const { screenshotBase64, htmlEvidence, ...summary } = result;
  console.log(JSON.stringify({
    platform,
    ...summary,
    screenshotCaptured: Boolean(screenshotBase64),
    htmlEvidenceBytes: Buffer.byteLength(htmlEvidence || ""),
  }, null, 2));
} finally {
  await browser.close();
}
