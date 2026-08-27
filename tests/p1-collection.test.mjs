import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

const root = path.resolve(import.meta.dirname, "..");
const migration = path.join(root, "database/migrations/0001_unified.sql");
const collectorKey = "p1-collector-integration-secret";
const previousCollectorKey = "p1-collector-previous-secret";

function startServer(port, database, { rotatingKeys = `${previousCollectorKey},${collectorKey}` } = {}) {
  const logs = [];
  const child = spawn(process.execPath, ["dist/standalone/server.js"], {
    cwd: path.join(root, "frontend"),
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      QUARZION_DB_PATH: database,
      QUARZION_MIGRATION_PATH: migration,
      QUARZION_AUDIT_SALT: "p1-collection-test",
      QUARZION_OUTBOX_ENCRYPTION_KEY: "11".repeat(32),
      QUARZION_DELIVERY_KEY: "22".repeat(32),
      GEO_PROOF_INGEST_KEY: collectorKey,
      GEO_PROOF_INGEST_KEYS: rotatingKeys,
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

function authHeaders(workerId = "collector-test-01") {
  return { authorization: `Bearer ${collectorKey}`, "content-type": "application/json", "x-quarzion-worker-id": workerId };
}

async function json(url, method, body, headers = {}) {
  const response = await fetch(url, { method, headers: { "content-type": "application/json", ...headers }, body: body == null ? undefined : JSON.stringify(body) });
  const payload = response.status === 204 ? null : await response.json();
  return { response, payload };
}

function sha(value) {
  return createHash("sha256").update(value).digest("hex");
}

test("P1 任务租约、幂等回传、证据权限和阻断告警形成闭环", { timeout: 35_000 }, async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "quarzion-p1-"));
  const database = path.join(directory, "quarzion.sqlite");
  const port = 46_000 + process.pid % 500;
  const base = `http://127.0.0.1:${port}`;
  const server = startServer(port, database);
  try {
    await waitFor(`${base}/api/health`);
    const db = new DatabaseSync(database);
    db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    const now = new Date().toISOString();
    db.prepare("INSERT INTO organizations (id,name,slug,created_at,updated_at) VALUES (?,?,?,?,?)").run("org-a", "客户 A", "org-a", now, now);
    db.prepare("INSERT INTO organizations (id,name,slug,created_at,updated_at) VALUES (?,?,?,?,?)").run("org-b", "客户 B", "org-b", now, now);
    db.prepare("INSERT INTO projects (id,organization_id,name,created_at,updated_at) VALUES (?,?,?,?,?)").run("project-a", "org-a", "监测项目 A", now, now);
    db.prepare("INSERT INTO projects (id,organization_id,name,created_at,updated_at) VALUES (?,?,?,?,?)").run("project-b", "org-b", "监测项目 B", now, now);
    db.prepare("INSERT INTO brands (id,organization_id,project_id,name,canonical_name,is_primary,status,created_at,updated_at) VALUES (?,?,?,?,?,1,'active',?,?)").run("brand-a", "org-a", "project-a", "Quarzion", "Quarzion", now, now);
    db.prepare("INSERT INTO prompts (id,organization_id,project_id,query_text,target_platforms,created_at,updated_at) VALUES (?,?,?,?,?,?,?)").run("prompt-a", "org-a", "project-a", "哪家 GEO 监测工具值得推荐？", '["doubao"]', now, now);
    db.prepare("INSERT INTO prompts (id,organization_id,project_id,query_text,target_platforms,created_at,updated_at) VALUES (?,?,?,?,?,?,?)").run("prompt-b", "org-a", "project-a", "测试阻断", '["yuanbao"]', now, now);
    db.prepare("INSERT INTO runs (id,organization_id,project_id,prompt_id,platform,source_url,scheduled_at,status,unique_run_key,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)").run("run-a", "org-a", "project-a", "prompt-a", "doubao", "https://www.doubao.com/chat/", now, "queued", "run-a-key", now);
    db.prepare("INSERT INTO runs (id,organization_id,project_id,prompt_id,platform,source_url,scheduled_at,status,unique_run_key,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)").run("run-b", "org-a", "project-a", "prompt-b", "yuanbao", "https://yuanbao.tencent.com/chat/", now, "queued", "run-b-key", now);

    const tokenA = "a".repeat(64);
    const tokenB = "b".repeat(64);
    for (const [suffix, organizationId, projectId, token] of [["a", "org-a", "project-a", tokenA], ["b", "org-b", "project-b", tokenB]]) {
      db.prepare("INSERT INTO users (id,email,display_name,status,created_at,updated_at) VALUES (?,?,?,'active',?,?)").run(`user-${suffix}`, `user-${suffix}@example.com`, `用户 ${suffix}`, now, now);
      db.prepare("INSERT INTO organization_members (id,organization_id,user_id,role,status,created_at,updated_at) VALUES (?,?,?,'organization_admin','active',?,?)").run(`member-${suffix}`, organizationId, `user-${suffix}`, now, now);
      db.prepare("INSERT INTO sessions (id,user_id,token_hash,expires_at,last_seen_at,created_at) VALUES (?,?,?,?,?,?)").run(`session-${suffix}`, `user-${suffix}`, sha(token), new Date(Date.now() + 86_400_000).toISOString(), now, now);
    }
    db.close();

    const register = await json(`${base}/api/collector/register`, "POST", { workerId: "collector-test-01", label: "测试匿名采集器", collectorVersion: "quarzion-collector/test", supportedPlatforms: ["doubao"] }, authHeaders());
    assert.equal(register.response.status, 200, JSON.stringify(register.payload));
    assert.equal(register.payload.executionMode, "anonymous");
    assert.equal((await json(`${base}/api/collector/heartbeat`, "POST", { workerId: "collector-test-01" }, { authorization: `Bearer ${previousCollectorKey}` })).response.status, 200, "轮换窗口内旧密钥仍应有效");
    assert.equal((await json(`${base}/api/collector/heartbeat`, "POST", { workerId: "collector-test-01" }, { authorization: "Bearer invalid-secret" })).response.status, 401);
    assert.equal((await fetch(`${base}/api/collector/next?platform=yuanbao`, { headers: authHeaders() })).status, 400, "采集器不能领取未声明支持的平台");

    const claimed = await fetch(`${base}/api/collector/next?platform=doubao`, { headers: authHeaders() });
    assert.equal(claimed.status, 200);
    const task = await claimed.json();
    assert.equal(task.runId, "run-a");
    assert.match(task.leaseToken, /^[a-f0-9]{64}$/);
    assert.equal((await fetch(`${base}/api/collector/next`, { headers: authHeaders() })).status, 204, "平台并发为 1 时不应重复领取");

    const heartbeat = await json(`${base}/api/collector/heartbeat`, "POST", { workerId: "collector-test-01", runId: task.runId, leaseToken: task.leaseToken }, authHeaders());
    assert.equal(heartbeat.response.status, 200, JSON.stringify(heartbeat.payload));

    const result = {
      runId: task.runId,
      workerId: "collector-test-01",
      leaseToken: task.leaseToken,
      status: "success",
      rawText: "Quarzion 是值得关注的 GEO 监测工具。参考 https://example.com/report",
      citations: [{ url: "https://example.com/report", title: "行业报告" }],
      screenshotBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nGQAAAAASUVORK5CYII=",
      screenshotMime: "image/png",
      sourceUrl: "https://www.doubao.com/chat/",
      pageTitle: "豆包",
      pageFingerprint: "fixture-fingerprint",
      collectorVersion: "quarzion-collector/test",
      durationMs: 1234,
    };
    const ingested = await json(`${base}/api/collector/ingest`, "POST", result, authHeaders());
    assert.equal(ingested.response.status, 200, JSON.stringify(ingested.payload));
    assert.equal(ingested.payload.status, "parsed");
    assert.equal(ingested.payload.evidence.screenshot, true);
    const repeated = await json(`${base}/api/collector/ingest`, "POST", result, authHeaders());
    assert.equal(repeated.response.status, 200, JSON.stringify(repeated.payload));
    assert.equal(repeated.payload.idempotent, true);

    const inspect = new DatabaseSync(database);
    inspect.exec("PRAGMA busy_timeout = 5000;");
    assert.equal(inspect.prepare("SELECT COUNT(*) AS count FROM answers WHERE run_id = 'run-a'").get().count, 1);
    assert.equal(inspect.prepare("SELECT COUNT(*) AS count FROM citations WHERE answer_id = (SELECT id FROM answers WHERE run_id = 'run-a')").get().count, 1);
    const artifact = inspect.prepare("SELECT id,sha256,byte_size FROM evidence_artifacts WHERE run_id = 'run-a' AND kind = 'screenshot'").get();
    assert.match(artifact.sha256, /^[a-f0-9]{64}$/);
    assert.ok(artifact.byte_size > 0);
    assert.equal(inspect.prepare("SELECT status FROM run_attempts WHERE run_id = 'run-a'").get().status, "completed");
    inspect.close();

    assert.equal((await fetch(`${base}/api/evidence/${artifact.id}`)).status, 401);
    const ownEvidence = await fetch(`${base}/api/evidence/${artifact.id}`, { headers: { cookie: `quarzion_session=${tokenA}` } });
    assert.equal(ownEvidence.status, 200);
    assert.equal(ownEvidence.headers.get("x-quarzion-sha256"), artifact.sha256);
    assert.equal((await fetch(`${base}/api/evidence/${artifact.id}`, { headers: { cookie: `quarzion_session=${tokenB}` } })).status, 403);

    const registerYuanbao = await json(`${base}/api/collector/register`, "POST", { workerId: "collector-test-01", label: "测试匿名采集器", collectorVersion: "quarzion-collector/test", supportedPlatforms: ["yuanbao"] }, authHeaders());
    assert.equal(registerYuanbao.response.status, 200, JSON.stringify(registerYuanbao.payload));
    const taskBResponse = await fetch(`${base}/api/collector/next?platform=yuanbao`, { headers: authHeaders() });
    assert.equal(taskBResponse.status, 200);
    const taskB = await taskBResponse.json();
    assert.equal(taskB.runId, "run-b");
    const blocked = await json(`${base}/api/collector/ingest`, "POST", { runId: taskB.runId, workerId: "collector-test-01", leaseToken: taskB.leaseToken, status: "blocked", failureCode: "captcha_required", errorMessage: "平台要求完成人机验证码", sourceUrl: "https://yuanbao.tencent.com/chat/", pageTitle: "腾讯元宝安全验证", pageFingerprint: "blocked-fixture-fingerprint", htmlEvidence: "<body><main>平台要求完成人机验证码</main></body>", screenshotBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nGQAAAAASUVORK5CYII=", screenshotMime: "image/png" }, authHeaders());
    assert.equal(blocked.response.status, 200, JSON.stringify(blocked.payload));
    assert.equal(blocked.payload.status, "blocked");
    assert.deepEqual(blocked.payload.evidence, { screenshot: true, html: true });
    const final = new DatabaseSync(database);
    assert.equal(final.prepare("SELECT status FROM runs WHERE id = 'run-b'").get().status, "blocked");
    assert.equal(final.prepare("SELECT kind FROM system_alerts WHERE run_id = 'run-b'").get().kind, "verification");
    assert.equal(final.prepare("SELECT COUNT(*) AS count FROM evidence_artifacts WHERE run_id = 'run-b' AND answer_id IS NULL").get().count, 2, "失败运行也必须保存页面证据");
    assert.equal(final.prepare("SELECT page_fingerprint AS fingerprint FROM run_attempts WHERE run_id = 'run-b'").get().fingerprint, "blocked-fixture-fingerprint");
    final.close();
  } catch (error) {
    error.message += `\nFrontend logs:\n${server.logs.join("")}`;
    throw error;
  } finally {
    await stopServer(server);
    await rm(directory, { recursive: true, force: true });
  }
});

test("未配置轮换列表时继续使用单一采集密钥", { timeout: 15_000 }, async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "quarzion-p1-key-"));
  const database = path.join(directory, "quarzion.sqlite");
  const port = 46_600 + process.pid % 300;
  const server = startServer(port, database, { rotatingKeys: "" });
  try {
    await waitFor(`http://127.0.0.1:${port}/api/health`);
    const registered = await json(`http://127.0.0.1:${port}/api/collector/register`, "POST", { workerId: "collector-fallback-01", label: "单密钥采集器", collectorVersion: "quarzion-collector/test", supportedPlatforms: ["doubao"] }, authHeaders("collector-fallback-01"));
    assert.equal(registered.response.status, 200, JSON.stringify(registered.payload));
  } catch (error) {
    error.message += `\nFrontend logs:\n${server.logs.join("")}`;
    throw error;
  } finally {
    await stopServer(server);
    await rm(directory, { recursive: true, force: true });
  }
});
