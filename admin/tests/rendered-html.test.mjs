import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("build emits the private self-hosted GEO operations console", async () => {
  const [dashboard, layout, migration, p1Migration, runtime, bootstrap, route, dockerfile, server] = await Promise.all([
    readFile(new URL("components/AdminDashboard.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("../database/migrations/0001_unified.sql", root), "utf8"),
    readFile(new URL("../database/migrations/0003_p1_collection.sql", root), "utf8"),
    readFile(new URL("db/runtime.ts", root), "utf8"),
    readFile(new URL("db/bootstrap.ts", root), "utf8"),
    readFile(new URL("app/api/admin/route.ts", root), "utf8"),
    readFile(new URL("Dockerfile", root), "utf8"),
    readFile(new URL("dist/standalone/server.js", root), "utf8"),
  ]);

  assert.match(layout, /Quarzion Admin｜内部运营系统/);
  assert.match(layout, /\/og-admin-light\.png/);
  assert.match(dashboard, /内部运营系统/);
  assert.match(dashboard, /客户项目/);
  assert.match(dashboard, /采集器与策略/);
  assert.match(dashboard, /采集任务/);
  assert.match(dashboard, /证据抽检/);
  assert.match(dashboard, /异常中心/);
  assert.match(dashboard, /P1-05 与 P1-06 暂不启用/);
  assert.doesNotMatch(dashboard, /react-loading-skeleton|codex-preview/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS collector_accounts/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS collector_tasks/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS admin_audit_events/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS organization_members/);
  assert.match(p1Migration, /CREATE TABLE IF NOT EXISTS collector_workers/);
  assert.match(p1Migration, /CREATE TABLE IF NOT EXISTS evidence_artifacts/);
  assert.match(p1Migration, /CREATE TABLE IF NOT EXISTS system_alerts/);
  assert.match(runtime, /node:sqlite/);
  assert.match(runtime, /QUARZION_DB_PATH/);
  assert.match(bootstrap, /QUARZION_MIGRATION_PATH/);
  assert.doesNotMatch(bootstrap, /seed/i);
  assert.match(route, /x-quarzion-admin/);
  assert.match(route, /worker_offline/);
  assert.match(route, /queue_backlog/);
  assert.match(route, /evidence_inspected/);
  assert.match(dockerfile, /dist\/standalone/);
  assert.match(server, /startProdServer/);
});
