import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const migrationFiles = ["0001_unified.sql", "0002_email_outbox.sql", "0003_p1_collection.sql", "0004_api_monitoring.sql", "0005_scheduler.sql"];
const migrations = migrationFiles.map((file) => readFileSync(new URL(`../database/migrations/${file}`, import.meta.url), "utf8").replaceAll("--> statement-breakpoint", ""));
const migration = migrations.join("\n");

function database() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  for (const source of migrations) {
    const rebuild = source.includes("quarzion:foreign-keys-off");
    if (rebuild) db.exec("PRAGMA foreign_keys = OFF;");
    db.exec(source);
    if (rebuild) db.exec("PRAGMA foreign_keys = ON;");
  }
  return db;
}

test("正式迁移创建空业务库且不写入演示数据", () => {
  const db = database();
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM schema_migrations").get().count, 5);
  for (const table of ["users", "organizations", "projects", "prompts", "runs", "answers", "citations", "email_outbox", "collector_workers", "run_attempts", "evidence_artifacts", "system_alerts"]) {
    assert.equal(db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count, 0, `${table} 应为空`);
  }
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM provider_models").get().count, 6);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM provider_models WHERE supports_direct = 1").get().count, 6);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM provider_models WHERE supports_web_search = 1").get().count, 5);
  assert.doesNotMatch(migration, /Digital Luxury Group|Northstar Mobility|watch-intelligence|demo-collector/i);
});

test("管理端创建的组织和项目由客户查询直接读取", () => {
  const db = database();
  const time = "2026-08-20T05:00:00Z";
  db.prepare("INSERT INTO organizations (id,name,slug,plan,status,owner_display,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)")
    .run("org-a", "统一库客户", "org-a", "standard", "active", "验收管理员", time, time);
  db.prepare("INSERT INTO projects (id,organization_id,name,region,language,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)")
    .run("project-a", "org-a", "统一库项目", "CN", "zh-CN", "active", time, time);
  db.prepare("INSERT INTO brands (id,organization_id,project_id,name,canonical_name,is_primary,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)")
    .run("brand-a", "org-a", "project-a", "验收品牌", "验收品牌", 1, "active", time, time);

  const customerView = db.prepare("SELECT p.id, p.name, o.name AS client_name FROM projects p JOIN organizations o ON o.id = p.organization_id").get();
  const adminView = db.prepare("SELECT p.id, p.name, b.name AS primary_brand FROM projects p JOIN brands b ON b.project_id = p.id AND b.is_primary = 1").get();
  assert.equal(customerView.id, "project-a");
  assert.equal(customerView.name, "统一库项目");
  assert.equal(customerView.client_name, "统一库客户");
  assert.equal(adminView.id, "project-a");
  assert.equal(adminView.name, "统一库项目");
  assert.equal(adminView.primary_brand, "验收品牌");
});

test("数据库拒绝把其他组织的数据挂到当前项目", () => {
  const db = database();
  const time = "2026-08-20T05:00:00Z";
  const insertOrg = db.prepare("INSERT INTO organizations (id,name,slug,created_at,updated_at) VALUES (?,?,?,?,?)");
  insertOrg.run("org-a", "客户 A", "org-a", time, time);
  insertOrg.run("org-b", "客户 B", "org-b", time, time);
  db.prepare("INSERT INTO projects (id,organization_id,name,created_at,updated_at) VALUES (?,?,?,?,?)").run("project-a", "org-a", "项目 A", time, time);
  assert.throws(
    () => db.prepare("INSERT INTO topics (id,organization_id,project_id,name,created_at) VALUES (?,?,?,?,?)").run("topic-b", "org-b", "project-a", "错误归属", time),
    /FOREIGN KEY constraint failed/,
  );
});

test("平台枚举只接受豆包、千问和 DeepSeek", () => {
  const db = database();
  const time = "2026-08-20T05:00:00Z";
  db.prepare("INSERT INTO organizations (id,name,slug,created_at,updated_at) VALUES (?,?,?,?,?)").run("org-a", "客户 A", "org-a", time, time);
  db.prepare("INSERT INTO projects (id,organization_id,name,created_at,updated_at) VALUES (?,?,?,?,?)").run("project-a", "org-a", "项目 A", time, time);
  db.prepare("INSERT INTO prompts (id,organization_id,project_id,query_text,created_at,updated_at) VALUES (?,?,?,?,?,?)").run("prompt-a", "org-a", "project-a", "测试问题", time, time);
  db.prepare("INSERT INTO runs (id,organization_id,project_id,prompt_id,platform,model_version,response_mode,scheduled_at,unique_run_key,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
    .run("run-qwen", "org-a", "project-a", "prompt-a", "qwen", "qwen3.7-plus", "web_search", time, "qwen-good", time);
  assert.equal(db.prepare("SELECT platform FROM runs WHERE id = 'run-qwen'").get().platform, "qwen");
  assert.throws(
    () => db.prepare("INSERT INTO runs (id,organization_id,project_id,prompt_id,platform,scheduled_at,unique_run_key,created_at) VALUES (?,?,?,?,?,?,?,?)")
      .run("run-yuanbao", "org-a", "project-a", "prompt-a", "yuanbao", time, "old-bad", time),
    /CHECK constraint failed/,
  );
  assert.throws(
    () => db.prepare("INSERT INTO runs (id,organization_id,project_id,prompt_id,platform,scheduled_at,unique_run_key,created_at) VALUES (?,?,?,?,?,?,?,?)")
      .run("run-a", "org-a", "project-a", "prompt-a", "ChatGPT", time, "bad", time),
    /CHECK constraint failed/,
  );
});
