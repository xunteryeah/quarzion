import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

const root = path.resolve(import.meta.dirname, "..");

function statements(file) {
  return readFileSync(file, "utf8").split("--> statement-breakpoint").map((sql) => sql.trim()).filter(Boolean);
}

function apply(db, file) {
  for (const sql of statements(file)) db.exec(sql);
}

function shared(db) {
  for (const file of ["0001_unified.sql", "0002_email_outbox.sql", "0003_p1_collection.sql"]) apply(db, path.join(root, "database/migrations", file));
}

test("客户预览站旧结构可无损桥接到统一 P1 空业务库", () => {
  const db = new DatabaseSync(":memory:");
  apply(db, path.join(root, "frontend/drizzle/0000_great_supernaut.sql"));
  apply(db, path.join(root, "frontend/drizzle-sites/0000_legacy_frontend_bridge.sql"));
  shared(db);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM projects").get().count, 0);
  assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='legacy_frontend_projects_20260820'").get());
  assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='evidence_artifacts'").get());
  assert.equal(db.prepare("SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1").get().version, "0003_p1_collection");
});

test("管理员预览站演示数据被保留在 legacy 表且正式业务库为空", () => {
  const db = new DatabaseSync(":memory:");
  apply(db, path.join(root, "admin/drizzle/0000_married_bucky.sql"));
  apply(db, path.join(root, "admin/drizzle-sites/0000_legacy_admin_bridge.sql"));
  shared(db);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM legacy_admin_organizations_20260820").get().count, 3);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM organizations").get().count, 0);
  assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='system_alerts'").get());
  assert.equal(db.prepare("SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1").get().version, "0003_p1_collection");
});
