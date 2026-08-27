import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

const root = path.resolve(import.meta.dirname, "..");
const schedulerKey = "33".repeat(32);

function startServer(port, database) {
  const logs = [];
  const child = spawn(process.execPath, ["dist/standalone/server.js"], {
    cwd: path.join(root, "frontend"),
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      QUARZION_DB_PATH: database,
      QUARZION_MIGRATION_DIR: path.join(root, "database/migrations"),
      QUARZION_SCHEDULER_KEY: schedulerKey,
      QUARZION_AUDIT_SALT: "scheduler-test",
      QUARZION_OUTBOX_ENCRYPTION_KEY: "11".repeat(32),
      QUARZION_DELIVERY_KEY: "22".repeat(32),
      GEO_PROOF_INGEST_KEY: "44".repeat(32),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => logs.push(String(chunk)));
  child.stderr.on("data", (chunk) => logs.push(String(chunk)));
  return { child, logs };
}

async function waitFor(url) {
  const started = Date.now();
  while (Date.now() - started < 12_000) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`服务未按时启动：${url}`);
}

async function stopServer(server) {
  if (server.child.exitCode != null) return;
  server.child.kill("SIGTERM");
  await Promise.race([new Promise((resolve) => server.child.once("exit", resolve)), new Promise((resolve) => setTimeout(resolve, 2_000))]);
  if (server.child.exitCode == null) server.child.kill("SIGKILL");
}

test("每日调度为 10 条提示词生成 110 个有效官方 API 组合且保持幂等", { timeout: 30_000 }, async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "quarzion-scheduler-"));
  const database = path.join(directory, "quarzion.sqlite");
  const port = 47_000 + process.pid % 500;
  const base = `http://127.0.0.1:${port}`;
  const server = startServer(port, database);
  try {
    await waitFor(`${base}/api/health`);
    const db = new DatabaseSync(database);
    const now = new Date().toISOString();
    db.exec("PRAGMA foreign_keys = ON");
    db.prepare("INSERT INTO organizations (id,name,slug,created_at,updated_at) VALUES (?,?,?,?,?)").run("org-s", "调度测试客户", "scheduler-test", now, now);
    db.prepare("INSERT INTO projects (id,organization_id,name,created_at,updated_at) VALUES (?,?,?,?,?)").run("project-s", "org-s", "腕表监测", now, now);
    db.prepare("INSERT INTO brands (id,organization_id,project_id,name,canonical_name,is_primary,status,created_at,updated_at) VALUES (?,?,?,?,?,1,'active',?,?)").run("brand-s", "org-s", "project-s", "劳力士", "劳力士", now, now);
    for (let index = 1; index <= 10; index += 1) {
      db.prepare("INSERT INTO prompts (id,organization_id,project_id,query_text,target_platforms,created_at,updated_at) VALUES (?,?,?,?,?,?,?)")
        .run(`prompt-${index}`, "org-s", "project-s", `高端腕表推荐问题 ${index}`, '["doubao","qwen","deepseek"]', now, now);
    }
    db.prepare("INSERT INTO monitoring_schedules (id,organization_id,project_id,frequency,timezone,local_run_time,prompt_limit,enabled,next_run_at,created_at,updated_at) VALUES (?,?,?,'daily','Asia/Shanghai','02:00',10,1,?,?,?)")
      .run("schedule-s", "org-s", "project-s", now, now, now);
    db.close();

    const schedule = () => fetch(`${base}/api/internal/schedule`, {
      method: "POST",
      headers: { authorization: `Bearer ${schedulerKey}`, "content-type": "application/json" },
      body: "{}",
    });
    assert.equal((await fetch(`${base}/api/internal/schedule`, { method: "POST", headers: { authorization: "Bearer invalid" }, body: "{}" })).status, 401);
    const first = await schedule();
    assert.equal(first.status, 200);
    const firstBody = await first.json();
    assert.equal(firstBody.createdRuns, 110);
    assert.equal(firstBody.details[0].combinations, 110);

    const inspect = new DatabaseSync(database);
    assert.deepEqual(inspect.prepare("SELECT platform,count(*) AS count FROM runs GROUP BY platform ORDER BY platform").all().map((row) => ({ ...row })), [
      { platform: "deepseek", count: 30 },
      { platform: "doubao", count: 40 },
      { platform: "qwen", count: 40 },
    ]);
    assert.equal(inspect.prepare("SELECT count(*) AS count FROM runs WHERE model_version='deepseek-v4-pro' AND response_mode='web_search'").get().count, 0);
    assert.equal(inspect.prepare("SELECT count(*) AS count FROM runs WHERE execution_mode='official_api' AND status='queued'").get().count, 110);
    inspect.close();

    const second = await schedule();
    assert.equal(second.status, 200);
    assert.equal((await second.json()).createdRuns, 0);
  } catch (error) {
    error.message += `\nFrontend logs:\n${server.logs.join("")}`;
    throw error;
  } finally {
    await stopServer(server);
    await rm(directory, { recursive: true, force: true });
  }
});
