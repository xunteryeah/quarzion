import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

const root = path.resolve(import.meta.dirname, "..");
const collectorKey = "p1-collector-integration-secret";
const previousCollectorKey = "p1-collector-previous-secret";

function startServer(
  port,
  database,
  rotatingKeys = `${previousCollectorKey},${collectorKey}`,
) {
  const logs = [];
  const child = spawn(process.execPath, ["dist/standalone/server.js"], {
    cwd: path.join(root, "frontend"),
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      QUARZION_DB_PATH: database,
      QUARZION_MIGRATION_DIR: path.join(root, "database/migrations"),
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
  await Promise.race([
    new Promise((resolve) => server.child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
  if (server.child.exitCode == null) server.child.kill("SIGKILL");
}

function headers(workerId = "collector-api-test-01", key = collectorKey) {
  return {
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
    "x-quarzion-worker-id": workerId,
  };
}

async function json(url, method, body, requestHeaders = {}) {
  const response = await fetch(url, {
    method,
    headers: { "content-type": "application/json", ...requestHeaders },
    body: body == null ? undefined : JSON.stringify(body),
  });
  return {
    response,
    payload: response.status === 204 ? null : await response.json(),
  };
}

function sha(value) {
  return createHash("sha256").update(value).digest("hex");
}

test(
  "P1 官方 API 任务完成租约、回传、引用、请求元数据和幂等闭环",
  { timeout: 35_000 },
  async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "quarzion-p1-api-"));
    const database = path.join(directory, "quarzion.sqlite");
    const port = 46_000 + (process.pid % 500);
    const base = `http://127.0.0.1:${port}`;
    const server = startServer(port, database);
    try {
      await waitFor(`${base}/api/health`);
      const db = new DatabaseSync(database);
      const now = new Date().toISOString();
      db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
      db.prepare(
        "INSERT INTO organizations (id,name,slug,created_at,updated_at) VALUES (?,?,?,?,?)",
      ).run("org-a", "客户 A", "org-a", now, now);
      db.prepare(
        "INSERT INTO projects (id,organization_id,name,created_at,updated_at) VALUES (?,?,?,?,?)",
      ).run("project-a", "org-a", "监测项目 A", now, now);
      db.prepare(
        "INSERT INTO brands (id,organization_id,project_id,name,canonical_name,is_primary,status,created_at,updated_at) VALUES (?,?,?,?,?,1,'active',?,?)",
      ).run("brand-a", "org-a", "project-a", "劳力士", "劳力士", now, now);
      db.prepare(
        "INSERT INTO prompts (id,organization_id,project_id,query_text,target_platforms,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",
      ).run(
        "prompt-a",
        "org-a",
        "project-a",
        "中国市场前三腕表品牌有哪些？",
        '["qwen"]',
        now,
        now,
      );
      db.prepare(
        `INSERT INTO runs
      (id,organization_id,project_id,prompt_id,platform,region,model_version,model_tier,response_mode,execution_mode,source_url,scheduled_at,status,unique_run_key,created_at)
      VALUES (?,?,?,?,?,'CN','qwen3.7-plus','secondary','web_search','official_api','https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',?,'queued',?,?)`,
      ).run(
        "run-a",
        "org-a",
        "project-a",
        "prompt-a",
        "qwen",
        now,
        "run-a-key",
        now,
      );
      db.close();

      const registered = await json(
        `${base}/api/collector/register`,
        "POST",
        {
          workerId: "collector-api-test-01",
          label: "测试官方 API Worker",
          collectorVersion: "quarzion-api-worker/test",
          executionMode: "official_api",
          supportedPlatforms: ["qwen"],
          capabilities: [
            { provider: "qwen", model: "qwen3.7-plus", mode: "web_search" },
          ],
        },
        headers(),
      );
      assert.equal(
        registered.response.status,
        200,
        JSON.stringify(registered.payload),
      );
      assert.equal(registered.payload.executionMode, "official_api");
      assert.equal(
        (
          await json(
            `${base}/api/collector/heartbeat`,
            "POST",
            { workerId: "collector-api-test-01" },
            headers("collector-api-test-01", previousCollectorKey),
          )
        ).response.status,
        200,
      );
      assert.equal(
        (
          await fetch(`${base}/api/collector/next?platform=doubao`, {
            headers: headers(),
          })
        ).status,
        400,
      );

      const claimed = await fetch(`${base}/api/collector/next?platform=qwen`, {
        headers: headers(),
      });
      assert.equal(claimed.status, 200);
      const task = await claimed.json();
      assert.equal(task.runId, "run-a");
      assert.equal(task.executionMode, "official_api");
      assert.equal(task.responseMode, "web_search");
      assert.equal(task.modelVersion, "qwen3.7-plus");

      const rawText = "劳力士、欧米茄和卡地亚是常被推荐的腕表品牌。";
      const result = {
        runId: task.runId,
        workerId: "collector-api-test-01",
        leaseToken: task.leaseToken,
        status: "success",
        rawText,
        citations: [
          {
            url: "https://example.com/watch-report",
            title: "腕表行业报告",
            snippet: "品牌推荐样本",
          },
        ],
        sourceUrl:
          "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
        pageTitle: "千问官方 API",
        providerRequestId: "qwen-provider-request-01",
        modelVersion: "qwen3.7-plus",
        modelTier: "secondary",
        responseMode: "web_search",
        searchPerformed: true,
        usage: {
          inputTokens: 18,
          outputTokens: 32,
          reasoningTokens: 0,
          cachedTokens: 0,
        },
        requestSha256: sha("request"),
        providerResponseSha256: sha("provider-response"),
        rawResponseJson: JSON.stringify({
          request_id: "qwen-provider-request-01",
        }),
        capabilitySnapshot: {
          provider: "qwen",
          protocol: "dashscope_generation",
        },
        collectorVersion: "quarzion-api-worker/test",
        durationMs: 321,
      };
      const ingested = await json(
        `${base}/api/collector/ingest`,
        "POST",
        result,
        headers(),
      );
      assert.equal(
        ingested.response.status,
        200,
        JSON.stringify(ingested.payload),
      );
      assert.equal(ingested.payload.status, "parsed");
      assert.equal(ingested.payload.evidence.screenshot, false);
      const repeated = await json(
        `${base}/api/collector/ingest`,
        "POST",
        result,
        headers(),
      );
      assert.equal(repeated.response.status, 200);
      assert.equal(repeated.payload.idempotent, true);

      const inspect = new DatabaseSync(database);
      const run = inspect
        .prepare(
          `SELECT status,execution_mode,response_mode,search_performed,provider_request_id,input_tokens,output_tokens,response_sha256
      FROM runs WHERE id='run-a'`,
        )
        .get();
      assert.deepEqual(
        { ...run },
        {
          status: "parsed",
          execution_mode: "official_api",
          response_mode: "web_search",
          search_performed: 1,
          provider_request_id: "qwen-provider-request-01",
          input_tokens: 18,
          output_tokens: 32,
          response_sha256: sha(rawText),
        },
      );
      assert.equal(
        inspect
          .prepare("SELECT COUNT(*) AS count FROM answers WHERE run_id='run-a'")
          .get().count,
        1,
      );
      assert.equal(
        inspect
          .prepare(
            "SELECT COUNT(*) AS count FROM citations WHERE answer_id=(SELECT id FROM answers WHERE run_id='run-a')",
          )
          .get().count,
        1,
      );
      assert.equal(
        inspect
          .prepare(
            "SELECT COUNT(*) AS count FROM evidence_artifacts WHERE run_id='run-a'",
          )
          .get().count,
        0,
      );
      assert.equal(
        inspect
          .prepare("SELECT status FROM run_attempts WHERE run_id='run-a'")
          .get().status,
        "completed",
      );
      inspect.close();
    } catch (error) {
      error.message += `\nFrontend logs:\n${server.logs.join("")}`;
      throw error;
    } finally {
      await stopServer(server);
      await rm(directory, { recursive: true, force: true });
    }
  },
);

test("未配置轮换列表时继续使用单一采集密钥", { timeout: 15_000 }, async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "quarzion-p1-key-"));
  const database = path.join(directory, "quarzion.sqlite");
  const port = 46_600 + (process.pid % 300);
  const server = startServer(port, database, "");
  try {
    await waitFor(`http://127.0.0.1:${port}/api/health`);
    const registered = await json(
      `http://127.0.0.1:${port}/api/collector/register`,
      "POST",
      {
        workerId: "collector-fallback-01",
        label: "单密钥官方 API Worker",
        collectorVersion: "quarzion-api-worker/test",
        supportedPlatforms: ["doubao"],
      },
      headers("collector-fallback-01"),
    );
    assert.equal(
      registered.response.status,
      200,
      JSON.stringify(registered.payload),
    );
  } finally {
    await stopServer(server);
    await rm(directory, { recursive: true, force: true });
  }
});
