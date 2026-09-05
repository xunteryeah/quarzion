import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("build emits the self-hosted WindCall application and SQLite runtime", async () => {
  const [dashboard, layout, migration, runtime, bootstrap, dockerfile, server] = await Promise.all([
    readFile(new URL("components/Dashboard.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("../database/migrations/0001_unified.sql", root), "utf8"),
    readFile(new URL("db/runtime.ts", root), "utf8"),
    readFile(new URL("db/bootstrap.ts", root), "utf8"),
    readFile(new URL("Dockerfile", root), "utf8"),
    readFile(new URL("dist/standalone/server.js", root), "utf8"),
  ]);

  assert.match(layout, /AI 搜索可见度监测与 GEO 效果证明平台/);
  assert.match(layout, /\/og-scrunch-light\.png/);
  assert.match(dashboard, /监测报告/);
  assert.match(dashboard, /品牌管理/);
  assert.match(dashboard, /引用溯源/);
  assert.match(dashboard, /应答分析/);
  assert.match(dashboard, /行动任务/);
  assert.match(dashboard, /原始回答/);
  assert.match(dashboard, /影响/);
  assert.doesNotMatch(dashboard, /react-loading-skeleton|codex-preview/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS runs/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS evidence_snapshots/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS organizations/);
  assert.match(runtime, /node:sqlite/);
  assert.match(runtime, /QUARZION_DB_PATH/);
  assert.match(bootstrap, /QUARZION_MIGRATION_PATH/);
  assert.doesNotMatch(bootstrap, /seed/i);
  assert.match(dockerfile, /dist\/standalone/);
  assert.match(server, /startProdServer/);
});

test("marketing system includes the complete deep content architecture", async () => {
  const [content, route, renderer, home, sitemap, robots] = await Promise.all([
    readFile(new URL("lib/marketing-content.ts", root), "utf8"),
    readFile(new URL("app/[...slug]/page.tsx", root), "utf8"),
    readFile(new URL("components/DeepMarketingPage.tsx", root), "utf8"),
    readFile(new URL("components/MarketingHome.tsx", root), "utf8"),
    readFile(new URL("app/sitemap.ts", root), "utf8"),
    readFile(new URL("app/robots.ts", root), "utf8"),
  ]);

  for (const path of [
    "platform/agent-experience",
    "platform/site-maps",
    "platform/monitoring/citations",
    "platform/monitoring/insights",
    "platform/ai-search-trends",
    "enterprise",
    "agencies",
    "platform/ai-visibility",
    "platform/account-pool",
    "solutions/agencies",
    "resources/guides/geo-basics",
    "how-tos/track-brand-presence",
    "faqs/account-pool-management",
    "labs/citation-dynamics",
    "case-studies/consumer-brand",
    "blog/geo-roi",
    "tools/brand-audit",
    "faqs/category/security",
    "how-tos/category/site-auditing",
  ]) assert.match(content, new RegExp(path.replaceAll("/", "\\/")));

  assert.match(route, /generateStaticParams/);
  assert.match(route, /generateMetadata/);
  assert.match(renderer, /FAQPage/);
  assert.match(renderer, /Article/);
  assert.match(renderer, /ProductOrSolutionPage/);
  assert.match(renderer, /PricingPage/);
  assert.match(renderer, /ToolPage/);
  assert.match(renderer, /StructuredProductPage/);
  assert.match(renderer, /AudiencePage/);
  assert.match(renderer, /StructuredPricingPage/);
  assert.match(home, /<MarketingNav \/>/);
  assert.match(home, /<MarketingFooter \/>/);
  assert.match(home, /geo-motion-forest\.png/);
  assert.match(home, /ApiPreview/);
  assert.match(sitemap, /marketingPages\.map/);
  assert.match(robots, /disallow: \["\/dashboard", "\/api\/"\]/);
});

test("textless UI reference preserves the full visual site without indexing it", async () => {
  const [wrapper, home, deep, styles] = await Promise.all([
    readFile(new URL("components/TextlessReference.tsx", root), "utf8"),
    readFile(new URL("app/ui-reference/page.tsx", root), "utf8"),
    readFile(new URL("app/ui-reference/[...slug]/page.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
  ]);

  assert.match(wrapper, /textless-reference/);
  assert.match(wrapper, /ui-reference/);
  assert.match(home, /<MarketingHome \/>/);
  assert.match(deep, /marketingPages\.map/);
  assert.match(deep, /<DeepMarketingPage page=\{page\} \/>/);
  assert.match(home, /index: false/);
  assert.match(styles, /\.textless-reference \.marketing-site \*/);
  assert.match(styles, /color: transparent !important/);
});
