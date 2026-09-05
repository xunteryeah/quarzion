#!/usr/bin/env node

import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";

const frontendUrl = (process.env.QUARZION_VERIFY_FRONTEND_URL ?? "http://frontend:3000").replace(/\/$/, "");
const adminUrl = (process.env.QUARZION_VERIFY_ADMIN_URL ?? "http://admin:3001").replace(/\/$/, "");
const databasePath = process.env.QUARZION_VERIFY_DB_PATH ?? "/data/quarzion.sqlite";
const adminHeaders = { "x-windcall-admin": "1" };
const nonce = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

const created = {
  organizationIds: [],
  organizationSlugs: [],
  projectIds: [],
  invitationIds: [],
  userIds: [],
  contactIds: [],
  emails: [],
};

async function jsonResponse(response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; }
  catch { throw new Error(`接口返回了非 JSON 内容（HTTP ${response.status}）`); }
}

async function postJson(url, body, headers = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return { response, json: await jsonResponse(response) };
}

function expectStatus(result, expected, label) {
  assert.equal(result.response.status, expected, `${label}：HTTP ${result.response.status} ${JSON.stringify(result.json)}`);
}

function invitationId(result, email, status = "pending") {
  const invitation = result.json.invitations?.find((item) => item.email === email && item.status === status);
  assert.ok(invitation?.id, `没有找到 ${email} 的 ${status} 邀请`);
  return invitation.id;
}

function rawToken(result) {
  const pathname = new URL(String(result.json.invitationUrl)).pathname;
  const value = pathname.split("/").at(-1) ?? "";
  assert.match(value, /^[a-f0-9]{64}$/);
  return value;
}

function placeholders(values) {
  return values.map(() => "?").join(",");
}

function cleanProductionQaData() {
  const db = new DatabaseSync(databasePath);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 10000;");
  db.exec("BEGIN IMMEDIATE");
  try {
    if (created.invitationIds.length || created.contactIds.length || created.emails.length) {
      const references = [...created.invitationIds, ...created.contactIds];
      if (references.length) db.prepare(`DELETE FROM email_outbox WHERE reference_id IN (${placeholders(references)})`).run(...references);
      if (created.emails.length) db.prepare(`DELETE FROM email_outbox WHERE recipient_email IN (${placeholders(created.emails)})`).run(...created.emails);
    }
    if (created.contactIds.length) {
      db.prepare(`DELETE FROM admin_audit_events WHERE subject_type = 'contact_submission' AND subject_id IN (${placeholders(created.contactIds)})`).run(...created.contactIds);
      db.prepare(`DELETE FROM contact_submissions WHERE id IN (${placeholders(created.contactIds)})`).run(...created.contactIds);
    }
    const adminSubjects = [...created.organizationIds, ...created.projectIds, ...created.invitationIds];
    if (adminSubjects.length) db.prepare(`DELETE FROM admin_audit_events WHERE subject_id IN (${placeholders(adminSubjects)})`).run(...adminSubjects);
    if (created.organizationIds.length) db.prepare(`DELETE FROM organizations WHERE id IN (${placeholders(created.organizationIds)})`).run(...created.organizationIds);
    if (created.userIds.length) db.prepare(`DELETE FROM users WHERE id IN (${placeholders(created.userIds)})`).run(...created.userIds);
    if (created.emails.length) db.prepare(`DELETE FROM users WHERE email IN (${placeholders(created.emails)})`).run(...created.emails);
    db.exec("COMMIT");

    const remainingOrganizations = created.organizationSlugs.length
      ? Number(db.prepare(`SELECT COUNT(*) AS count FROM organizations WHERE slug IN (${placeholders(created.organizationSlugs)})`).get(...created.organizationSlugs).count)
      : 0;
    const remainingUsers = created.emails.length
      ? Number(db.prepare(`SELECT COUNT(*) AS count FROM users WHERE email IN (${placeholders(created.emails)})`).get(...created.emails).count)
      : 0;
    const remainingContacts = created.emails.length
      ? Number(db.prepare(`SELECT COUNT(*) AS count FROM contact_submissions WHERE email IN (${placeholders(created.emails)})`).get(...created.emails).count)
      : 0;
    assert.deepEqual({ remainingOrganizations, remainingUsers, remainingContacts }, {
      remainingOrganizations: 0,
      remainingUsers: 0,
      remainingContacts: 0,
    });
  } catch (error) {
    try { db.exec("ROLLBACK"); } catch {}
    throw error;
  } finally {
    db.close();
  }
}

let passed = false;
try {
  const health = await fetch(`${frontendUrl}/api/health`);
  assert.equal(health.status, 200, "客户应用健康接口不可用");
  const adminHealth = await fetch(`${adminUrl}/api/admin`, { headers: adminHeaders });
  assert.equal(adminHealth.status, 200, "管理端内部接口不可用");
  assert.equal((await fetch(`${frontendUrl}/api/dashboard`)).status, 401, "未登录请求应被拒绝");
  assert.equal((await fetch(`${frontendUrl}/api/internal/email-delivery`, { method: "POST" })).status, 404, "内部邮件接口不应公开");
  assert.equal((await fetch(`${frontendUrl}/api/collector/next`)).status, 401, "采集接口应拒绝无密钥请求");
  assert.equal((await fetch(`${frontendUrl}/api/collector/ingest`, { method: "POST" })).status, 401, "采集回传应拒绝无密钥请求");

  const createOrganization = async (suffix) => {
    const slug = `p0-qa-${suffix}-${nonce}`.toLowerCase();
    const result = await postJson(`${adminUrl}/api/admin`, {
      command: "create_organization",
      name: `P0 生产验收公司 ${suffix}`,
      slug,
    }, adminHeaders);
    expectStatus(result, 200, `创建公司 ${suffix}`);
    created.organizationIds.push(result.json.createdOrganizationId);
    created.organizationSlugs.push(slug);
    return result.json.createdOrganizationId;
  };

  const organizationA = await createOrganization("A");
  const organizationB = await createOrganization("B");

  const createProject = async (organizationId, suffix) => {
    const result = await postJson(`${adminUrl}/api/admin`, {
      command: "create_project",
      organizationId,
      name: `P0 生产验收项目 ${suffix}`,
      brandName: `P0 验收品牌 ${suffix}`,
      website: `https://${suffix.toLowerCase()}.example.invalid`,
    }, adminHeaders);
    expectStatus(result, 200, `创建项目 ${suffix}`);
    created.projectIds.push(result.json.createdProjectId);
    return result.json.createdProjectId;
  };

  const projectA = await createProject(organizationA, "A");
  const projectB = await createProject(organizationB, "B");
  const ownerEmail = `p0-owner-${nonce}@example.invalid`;
  const revokeEmail = `p0-revoke-${nonce}@example.invalid`;
  const resendEmail = `p0-resend-${nonce}@example.invalid`;
  const contactEmail = `p0-contact-${nonce}@example.invalid`;
  created.emails.push(ownerEmail, revokeEmail, resendEmail, contactEmail);

  const ownerInvitation = await postJson(`${adminUrl}/api/admin`, {
    command: "create_invitation",
    organizationId: organizationA,
    email: ownerEmail,
    role: "organization_admin",
  }, adminHeaders);
  expectStatus(ownerInvitation, 200, "创建管理员邀请");
  const ownerToken = rawToken(ownerInvitation);
  const ownerInvitationId = invitationId(ownerInvitation, ownerEmail);
  created.invitationIds.push(ownerInvitationId);

  const revokeInvitation = await postJson(`${adminUrl}/api/admin`, {
    command: "create_invitation",
    organizationId: organizationA,
    email: revokeEmail,
    role: "viewer",
  }, adminHeaders);
  expectStatus(revokeInvitation, 200, "创建待撤销邀请");
  const revokeToken = rawToken(revokeInvitation);
  const revokeInvitationId = invitationId(revokeInvitation, revokeEmail);
  created.invitationIds.push(revokeInvitationId);
  const revoked = await postJson(`${adminUrl}/api/admin`, { command: "revoke_invitation", invitationId: revokeInvitationId }, adminHeaders);
  expectStatus(revoked, 200, "撤销邀请");
  assert.equal((await fetch(`${frontendUrl}/api/auth/invite?token=${encodeURIComponent(revokeToken)}`)).status, 410);

  const resendInvitation = await postJson(`${adminUrl}/api/admin`, {
    command: "create_invitation",
    organizationId: organizationA,
    email: resendEmail,
    role: "member",
  }, adminHeaders);
  expectStatus(resendInvitation, 200, "创建待重发邀请");
  const oldResendToken = rawToken(resendInvitation);
  const oldResendId = invitationId(resendInvitation, resendEmail);
  created.invitationIds.push(oldResendId);
  const resent = await postJson(`${adminUrl}/api/admin`, { command: "resend_invitation", invitationId: oldResendId }, adminHeaders);
  expectStatus(resent, 200, "重新发送邀请");
  const newResendToken = rawToken(resent);
  const newResendId = invitationId(resent, resendEmail);
  created.invitationIds.push(newResendId);
  assert.notEqual(oldResendToken, newResendToken);
  assert.equal((await fetch(`${frontendUrl}/api/auth/invite?token=${encodeURIComponent(oldResendToken)}`)).status, 410);
  assert.equal((await fetch(`${frontendUrl}/api/auth/invite?token=${encodeURIComponent(newResendToken)}`)).status, 200);

  const password = `P0-${crypto.randomUUID()}-Strong!`;
  const accepted = await postJson(`${frontendUrl}/api/auth/invite`, {
    token: ownerToken,
    displayName: "P0 生产验收管理员",
    password,
  });
  expectStatus(accepted, 200, "接受邀请");
  created.userIds.push(accepted.json.user.id);
  const setCookie = accepted.response.headers.get("set-cookie") ?? "";
  const cookie = setCookie.split(";", 1)[0];
  assert.match(cookie ?? "", /^windcall_session=/);
  assert.match(setCookie, /;\s*HttpOnly/i);
  assert.match(setCookie, /;\s*Secure/i);
  assert.match(setCookie, /;\s*SameSite=Lax/i);

  const dashboardResponse = await fetch(`${frontendUrl}/api/dashboard`, { headers: { cookie } });
  assert.equal(dashboardResponse.status, 200);
  const dashboard = await jsonResponse(dashboardResponse);
  assert.deepEqual(dashboard.projects.map((project) => project.id), [projectA]);
  assert.equal(dashboard.selectedProjectId, projectA);
  assert.deepEqual(dashboard.answers, []);
  assert.deepEqual(dashboard.trend, []);

  const tampered = await fetch(`${frontendUrl}/api/dashboard?projectId=${encodeURIComponent(projectB)}`, { headers: { cookie } });
  assert.equal(tampered.status, 200);
  const tamperedDashboard = await jsonResponse(tampered);
  assert.equal(tamperedDashboard.selectedProjectId, projectA);
  assert.ok(tamperedDashboard.projects.every((project) => project.id !== projectB));
  const tamperedWrite = await postJson(`${frontendUrl}/api/dashboard`, {
    command: "update_project",
    projectId: projectB,
    name: "P0 不应成功",
  }, { cookie });
  expectStatus(tamperedWrite, 404, "跨组织修改必须失败");
  assert.equal((await postJson(`${frontendUrl}/api/auth/invite`, { token: ownerToken, displayName: "重复", password })).response.status, 410);

  const logout = await postJson(`${frontendUrl}/api/auth/logout`, {}, { cookie });
  expectStatus(logout, 200, "退出登录");
  assert.equal((await fetch(`${frontendUrl}/api/dashboard`, { headers: { cookie } })).status, 401);

  const contact = await postJson(`${frontendUrl}/api/contact`, {
    name: "生产验收",
    company: "P0 生产验收咨询",
    email: contactEmail,
    message: "验证网站咨询是否进入内部客户线索，并在邮箱延期期间安全暂存。",
    consent: true,
  }, { "x-forwarded-for": "203.0.113.231" });
  expectStatus(contact, 201, "提交咨询线索");
  const adminAfterContact = await fetch(`${adminUrl}/api/admin`, { headers: adminHeaders }).then(jsonResponse);
  const storedContact = adminAfterContact.contacts.find((item) => item.email === contactEmail);
  assert.ok(storedContact?.id, "管理端没有找到咨询线索");
  created.contactIds.push(storedContact.id);
  assert.equal(storedContact.delivery_status, "pending");
  const updatedContact = await postJson(`${adminUrl}/api/admin`, {
    command: "set_contact_status",
    contactId: storedContact.id,
    status: "contacted",
  }, adminHeaders);
  expectStatus(updatedContact, 200, "更新咨询状态");
  assert.equal(updatedContact.json.contacts.find((item) => item.id === storedContact.id)?.status, "contacted");

  const db = new DatabaseSync(databasePath, { readOnly: true });
  const storedInvitation = db.prepare("SELECT token_hash FROM invitations WHERE id = ?").get(ownerInvitationId);
  const storedUser = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(accepted.json.user.id);
  const storedOwnerDelivery = db.prepare("SELECT payload_ciphertext,status FROM email_outbox WHERE kind = 'invitation' AND reference_id = ?").get(ownerInvitationId);
  const storedPendingDelivery = db.prepare("SELECT status FROM email_outbox WHERE kind = 'invitation' AND reference_id = ?").get(newResendId);
  const storedContactDelivery = db.prepare("SELECT status FROM email_outbox WHERE kind = 'contact' AND reference_id = ?").get(storedContact.id);
  db.close();
  assert.notEqual(storedInvitation.token_hash, ownerToken);
  assert.ok(!String(storedOwnerDelivery.payload_ciphertext).includes(ownerToken));
  assert.equal(storedOwnerDelivery.status, "cancelled");
  assert.equal(storedPendingDelivery.status, "pending");
  assert.equal(storedContactDelivery.status, "pending");
  assert.ok(!String(storedUser.password_hash).includes(password));
  assert.match(String(storedUser.password_hash), /^pbkdf2_sha256\$600000\$/);

  passed = true;
  console.log(JSON.stringify({
    ok: true,
    checks: [
      "anonymous_denied",
      "collector_key_required",
      "internal_email_hidden",
      "organization_isolation",
      "cross_organization_write_denied",
      "one_time_invitation",
      "revoke_and_resend",
      "secure_session_cookie",
      "logout_revokes_session",
      "contact_crm_queue_only",
      "secrets_hashed_or_encrypted",
    ],
  }));
} finally {
  cleanProductionQaData();
  if (passed) console.log(JSON.stringify({ ok: true, cleanup: "verified" }));
}
