import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

const root = path.resolve(import.meta.dirname, "..");
const migration = path.join(root, "database/migrations/0001_unified.sql");

function startServer(cwd, port, database, extra = {}) {
  const logs = [];
  const child = spawn(process.execPath, ["dist/standalone/server.js"], {
    cwd,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      QUARZION_DB_PATH: database,
      QUARZION_MIGRATION_PATH: migration,
      QUARZION_AUDIT_SALT: "automated-runtime-isolation-test",
      QUARZION_OUTBOX_ENCRYPTION_KEY: "11".repeat(32),
      QUARZION_DELIVERY_KEY: "22".repeat(32),
      GEO_PROOF_INGEST_KEY: "automated-collector-test-key",
      ...extra,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => logs.push(String(chunk)));
  child.stderr.on("data", (chunk) => logs.push(String(chunk)));
  return { child, logs };
}

async function waitFor(url, options = {}) {
  const started = Date.now();
  while (Date.now() - started < 12_000) {
    try {
      const response = await fetch(url, options);
      if (response.status < 500) return response;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`服务未能按时启动：${url}`);
}

async function postJson(url, body, headers = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  return { response, json };
}

async function stopServer(server) {
  if (!server) return;
  if (server.child.exitCode != null) return;
  server.child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => server.child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
  if (server.child.exitCode == null) server.child.kill("SIGKILL");
}

test("正式运行时强制登录、组织隔离、一次性邀请和无演示数据", { timeout: 30_000 }, async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "quarzion-p0-runtime-"));
  const database = path.join(directory, "quarzion.sqlite");
  const frontendPort = 45_000 + process.pid % 500;
  const adminPort = frontendPort + 1;
  const frontend = startServer(path.join(root, "frontend"), frontendPort, database);
  let admin;
  const frontendUrl = `http://127.0.0.1:${frontendPort}`;
  const adminUrl = `http://127.0.0.1:${adminPort}`;
  const adminHeaders = { "x-quarzion-admin": "1" };

  try {
    await waitFor(`${frontendUrl}/api/health`);
    admin = startServer(path.join(root, "admin"), adminPort, database, {
      QUARZION_SELF_HOSTED_ADMIN: "1",
      QUARZION_APP_URL: `http://127.0.0.1:${frontendPort}`,
    });
    await waitFor(`${adminUrl}/api/admin`, { headers: adminHeaders });

    const anonymous = await fetch(`${frontendUrl}/api/dashboard`);
    assert.equal(anonymous.status, 401);
    const internalDelivery = await fetch(`${frontendUrl}/api/internal/email-delivery`, { method: "POST" });
    assert.equal(internalDelivery.status, 404);

    const createOrganization = async (name, slug) => {
      const result = await postJson(`${adminUrl}/api/admin`, { command: "create_organization", name, slug }, adminHeaders);
      assert.equal(result.response.status, 200, JSON.stringify(result.json));
      return result.json.createdOrganizationId;
    };
    const organizationA = await createOrganization("客户公司 A", "customer-a");
    const organizationB = await createOrganization("客户公司 B", "customer-b");

    const createProject = async (organizationId, name, brandName) => {
      const result = await postJson(`${adminUrl}/api/admin`, { command: "create_project", organizationId, name, brandName, website: "https://brand.example" }, adminHeaders);
      assert.equal(result.response.status, 200, JSON.stringify(result.json));
      return result.json.createdProjectId;
    };
    const projectA = await createProject(organizationA, "A 正式项目", "A 品牌");
    const projectB = await createProject(organizationB, "B 正式项目", "B 品牌");

    const invitation = await postJson(`${adminUrl}/api/admin`, {
      command: "create_invitation",
      organizationId: organizationA,
      email: "owner-a@example.com",
      role: "organization_admin",
    }, adminHeaders);
    assert.equal(invitation.response.status, 200, JSON.stringify(invitation.json));
    const token = new URL(invitation.json.invitationUrl).pathname.split("/").at(-1);
    assert.match(token, /^[a-f0-9]{64}$/);

    const revokedInvitation = await postJson(`${adminUrl}/api/admin`, {
      command: "create_invitation",
      organizationId: organizationA,
      email: "revoked@example.com",
      role: "viewer",
    }, adminHeaders);
    assert.equal(revokedInvitation.response.status, 200, JSON.stringify(revokedInvitation.json));
    const revokedToken = new URL(revokedInvitation.json.invitationUrl).pathname.split("/").at(-1);
    const revokedId = revokedInvitation.json.invitations.find((item) => item.email === "revoked@example.com" && item.status === "pending").id;
    const revokeResult = await postJson(`${adminUrl}/api/admin`, { command: "revoke_invitation", invitationId: revokedId }, adminHeaders);
    assert.equal(revokeResult.response.status, 200, JSON.stringify(revokeResult.json));
    assert.equal(revokeResult.json.invitations.find((item) => item.id === revokedId).status, "revoked");
    const revokedLookup = await fetch(`${frontendUrl}/api/auth/invite?token=${encodeURIComponent(revokedToken)}`);
    assert.equal(revokedLookup.status, 410);

    const resendCandidate = await postJson(`${adminUrl}/api/admin`, {
      command: "create_invitation",
      organizationId: organizationA,
      email: "resend@example.com",
      role: "member",
    }, adminHeaders);
    assert.equal(resendCandidate.response.status, 200, JSON.stringify(resendCandidate.json));
    const oldResendToken = new URL(resendCandidate.json.invitationUrl).pathname.split("/").at(-1);
    const oldResendId = resendCandidate.json.invitations.find((item) => item.email === "resend@example.com" && item.status === "pending").id;
    const resendResult = await postJson(`${adminUrl}/api/admin`, { command: "resend_invitation", invitationId: oldResendId }, adminHeaders);
    assert.equal(resendResult.response.status, 200, JSON.stringify(resendResult.json));
    const newResendToken = new URL(resendResult.json.invitationUrl).pathname.split("/").at(-1);
    assert.notEqual(newResendToken, oldResendToken);
    assert.equal(resendResult.json.invitations.find((item) => item.id === oldResendId).status, "revoked");
    assert.equal(await fetch(`${frontendUrl}/api/auth/invite?token=${encodeURIComponent(oldResendToken)}`).then((response) => response.status), 410);
    assert.equal(await fetch(`${frontendUrl}/api/auth/invite?token=${encodeURIComponent(newResendToken)}`).then((response) => response.status), 200);

    const accepted = await postJson(`${frontendUrl}/api/auth/invite`, {
      token,
      displayName: "客户 A 管理员",
      password: "A-strong-password-2026!",
    });
    assert.equal(accepted.response.status, 200, JSON.stringify(accepted.json));
    const cookie = accepted.response.headers.get("set-cookie")?.split(";", 1)[0];
    assert.match(cookie ?? "", /^quarzion_session=/);

    const dashboardResponse = await fetch(`${frontendUrl}/api/dashboard`, { headers: { cookie } });
    assert.equal(dashboardResponse.status, 200);
    const dashboard = await dashboardResponse.json();
    assert.deepEqual(dashboard.projects.map((project) => project.id), [projectA]);
    assert.equal(dashboard.selectedProjectId, projectA);
    assert.equal(dashboard.answers.length, 0);
    assert.deepEqual(dashboard.trend, []);
    assert.equal(dashboard.brandStats[0].website, "https://brand.example");

    const tamperedRead = await fetch(`${frontendUrl}/api/dashboard?projectId=${encodeURIComponent(projectB)}`, { headers: { cookie } });
    const tamperedDashboard = await tamperedRead.json();
    assert.equal(tamperedRead.status, 200);
    assert.equal(tamperedDashboard.selectedProjectId, projectA);
    assert.ok(tamperedDashboard.projects.every((project) => project.id !== projectB));

    const tamperedWrite = await postJson(`${frontendUrl}/api/dashboard`, {
      command: "update_project",
      projectId: projectB,
      name: "不应成功",
    }, { cookie });
    assert.equal(tamperedWrite.response.status, 404);

    const reused = await postJson(`${frontendUrl}/api/auth/invite`, { token, displayName: "重复", password: "Another-strong-password!" });
    assert.equal(reused.response.status, 410);

    const logout = await postJson(`${frontendUrl}/api/auth/logout`, {}, { cookie });
    assert.equal(logout.response.status, 200);
    const afterLogout = await fetch(`${frontendUrl}/api/dashboard`, { headers: { cookie } });
    assert.equal(afterLogout.status, 401);

    const contact = await postJson(`${frontendUrl}/api/contact`, {
      name: "验收联系人",
      company: "验收咨询公司",
      email: "lead@example.com",
      message: "希望了解豆包、腾讯元宝和 DeepSeek 的正式监测方案。",
      consent: true,
    }, { "x-forwarded-for": "203.0.113.91" });
    assert.equal(contact.response.status, 201, JSON.stringify(contact.json));
    const adminWithLead = await fetch(`${adminUrl}/api/admin`, { headers: adminHeaders }).then((response) => response.json());
    assert.equal(adminWithLead.contacts.length, 1);
    assert.equal(adminWithLead.contacts[0].delivery_status, "pending");
    const updateLead = await postJson(`${adminUrl}/api/admin`, { command: "set_contact_status", contactId: adminWithLead.contacts[0].id, status: "contacted" }, adminHeaders);
    assert.equal(updateLead.response.status, 200, JSON.stringify(updateLead.json));
    assert.equal(updateLead.json.contacts[0].status, "contacted");

    await stopServer(frontend);
    await stopServer(admin);
    const db = new DatabaseSync(database);
    const storedInvitation = db.prepare("SELECT token_hash FROM invitations WHERE email = ?").get("owner-a@example.com");
    const storedDelivery = db.prepare(`SELECT eo.payload_ciphertext,eo.status
      FROM email_outbox eo JOIN invitations i ON i.id = eo.reference_id
      WHERE eo.kind = 'invitation' AND i.email = ? ORDER BY eo.created_at DESC LIMIT 1`).get("owner-a@example.com");
    const storedUser = db.prepare("SELECT password_hash FROM users WHERE email = ?").get("owner-a@example.com");
    assert.notEqual(storedInvitation.token_hash, token);
    assert.equal(storedDelivery.status, "cancelled");
    assert.ok(!String(storedDelivery.payload_ciphertext).includes(token));
    assert.ok(!String(storedUser.password_hash).includes("A-strong-password-2026!"));
    assert.match(String(storedUser.password_hash), /^pbkdf2_sha256\$600000\$/);
    db.close();
  } catch (error) {
    error.message += `\nFrontend logs:\n${frontend.logs.join("")}\nAdmin logs:\n${admin?.logs.join("") ?? "not started"}`;
    throw error;
  } finally {
    await stopServer(frontend);
    await stopServer(admin);
    await rm(directory, { recursive: true, force: true });
  }
});
