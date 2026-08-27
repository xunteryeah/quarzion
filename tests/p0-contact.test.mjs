import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

const root = path.resolve(import.meta.dirname, "..");

async function waitFor(url) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { const response = await fetch(url); if (response.status < 500) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("联系表单测试服务启动超时");
}

async function post(url, body) {
  return fetch(url, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7" }, body: JSON.stringify(body) });
}

test("联系表单校验、保存、隐私哈希和应用限流", { timeout: 25_000 }, async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "quarzion-contact-"));
  const database = path.join(directory, "contact.sqlite");
  const port = 45_600 + process.pid % 300;
  const child = spawn(process.execPath, ["dist/standalone/server.js"], {
    cwd: path.join(root, "frontend"),
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      QUARZION_DB_PATH: database,
      QUARZION_MIGRATION_PATH: path.join(root, "database/migrations/0001_unified.sql"),
      QUARZION_AUDIT_SALT: "contact-test-audit-salt",
      QUARZION_OUTBOX_ENCRYPTION_KEY: "33".repeat(32),
      QUARZION_DELIVERY_KEY: "44".repeat(32),
      GEO_PROOF_INGEST_KEY: "contact-test-collector-key",
      RESEND_API_KEY: "",
    },
    stdio: "ignore",
  });
  const base = `http://127.0.0.1:${port}`;

  try {
    await waitFor(`${base}/api/health`);
    const invalid = await post(`${base}/api/contact`, { name: "A", company: "", email: "bad", message: "短", consent: false });
    assert.equal(invalid.status, 400);

    const payload = { name: "张三", company: "示例客户公司", email: "contact@example.com", phone: "13800000000", message: "希望监测豆包、腾讯元宝和 DeepSeek 的品牌可见度。", consent: true };
    for (let index = 0; index < 5; index += 1) {
      const response = await post(`${base}/api/contact`, { ...payload, email: `contact${index}@example.com` });
      assert.equal(response.status, 201, await response.text());
    }
    const limited = await post(`${base}/api/contact`, payload);
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get("retry-after"), "900");

    child.kill("SIGTERM");
    await new Promise((resolve) => child.once("exit", resolve));
    const db = new DatabaseSync(database);
    const row = db.prepare("SELECT email,delivery_status,delivery_error,ip_hash,user_agent FROM contact_submissions ORDER BY created_at LIMIT 1").get();
    assert.equal(row.delivery_status, "pending");
    assert.equal(row.delivery_error, "邮件服务尚未配置");
    assert.match(String(row.ip_hash), /^[a-f0-9]{64}$/);
    assert.notEqual(row.ip_hash, "203.0.113.7");
    assert.ok(!String(row.user_agent ?? "").includes("contact-test-audit-salt"));
    const outbox = db.prepare("SELECT status,payload_ciphertext,payload_iv FROM email_outbox ORDER BY created_at LIMIT 1").get();
    assert.equal(outbox.status, "pending");
    assert.match(String(outbox.payload_ciphertext), /^[A-Za-z0-9+/=]+$/);
    assert.match(String(outbox.payload_iv), /^[A-Za-z0-9+/=]+$/);
    assert.ok(!String(outbox.payload_ciphertext).includes("contact0@example.com"));
    db.close();
  } finally {
    if (child.exitCode == null) child.kill("SIGKILL");
    await rm(directory, { recursive: true, force: true });
  }
});
