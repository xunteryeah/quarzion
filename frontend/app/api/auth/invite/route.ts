import { NextRequest, NextResponse } from "next/server";
import { ensureDatabase } from "@/db/bootstrap";
import { env } from "@/db/runtime";
import { createSession, getRequestSession, hashPassword, sessionCookie, sha256 } from "@/lib/auth";

type Invitation = { id: string; organizationId: string; organizationName: string; email: string; role: string; status: string; expiresAt: string; existingAccount: number };

async function invitationForToken(token: string) {
  if (!/^[a-f0-9]{64}$/i.test(token)) return null;
  return env.DB.prepare(`SELECT i.id, i.organization_id AS organizationId, o.name AS organizationName, i.email, i.role, i.status, i.expires_at AS expiresAt,
      EXISTS(SELECT 1 FROM users u WHERE u.email = i.email) AS existingAccount
      FROM invitations i JOIN organizations o ON o.id = i.organization_id WHERE i.token_hash = ? LIMIT 1`)
    .bind(await sha256(token)).first<Invitation>();
}

export async function GET(request: NextRequest) {
  await ensureDatabase();
  const invitation = await invitationForToken(request.nextUrl.searchParams.get("token") ?? "");
  if (!invitation) return NextResponse.json({ error: "邀请不存在" }, { status: 404 });
  if (invitation.status !== "pending" || invitation.expiresAt <= new Date().toISOString()) return NextResponse.json({ error: "邀请已失效" }, { status: 410 });
  const session = await getRequestSession(request);
  return NextResponse.json({ organizationName: invitation.organizationName, email: invitation.email, role: invitation.role, expiresAt: invitation.expiresAt, existingAccount: Boolean(invitation.existingAccount), signedInAsMatching: Boolean(session && session.email.toLowerCase() === invitation.email.toLowerCase()) });
}

export async function POST(request: NextRequest) {
  await ensureDatabase();
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "请求格式不正确" }, { status: 400 }); }
  const token = String(body.token ?? "");
  const invitation = await invitationForToken(token);
  const now = new Date().toISOString();
  if (!invitation) return NextResponse.json({ error: "邀请不存在" }, { status: 404 });
  if (invitation.status !== "pending") return NextResponse.json({ error: "邀请已被使用或撤销" }, { status: 410 });
  if (invitation.expiresAt <= now) {
    await env.DB.batch([
      env.DB.prepare("UPDATE invitations SET status = 'expired' WHERE id = ? AND status = 'pending'").bind(invitation.id),
      env.DB.prepare("UPDATE email_outbox SET status = 'cancelled', updated_at = ? WHERE kind = 'invitation' AND reference_id = ? AND status IN ('pending','retry','delivering')").bind(now, invitation.id),
    ]);
    return NextResponse.json({ error: "邀请已过期，请联系管理员重新发送" }, { status: 410 });
  }

  const existing = await env.DB.prepare("SELECT id,email,display_name AS displayName,status FROM users WHERE email = ? LIMIT 1").bind(invitation.email).first<{ id: string; email: string; displayName: string; status: string }>();
  const currentSession = await getRequestSession(request);
  let userId: string;
  let displayName: string;
  let createUserStatement = null;

  if (existing) {
    if (!currentSession || currentSession.userId !== existing.id) return NextResponse.json({ error: "该邮箱已有账号，请先登录后再打开邀请链接" }, { status: 409 });
    if (existing.status !== "active") return NextResponse.json({ error: "账号当前不可用，请联系管理员" }, { status: 403 });
    userId = existing.id;
    displayName = existing.displayName;
  } else {
    displayName = String(body.displayName ?? "").trim();
    const password = String(body.password ?? "");
    if (displayName.length < 2 || displayName.length > 80) return NextResponse.json({ error: "请输入 2–80 个字符的姓名" }, { status: 400 });
    if (password.length < 12 || password.length > 200) return NextResponse.json({ error: "密码至少需要 12 个字符" }, { status: 400 });
    userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    createUserStatement = env.DB.prepare("INSERT INTO users (id,email,display_name,password_hash,status,email_verified_at,created_at,updated_at) VALUES (?,?,?,?,'active',?,?,?)")
      .bind(userId, invitation.email, displayName, passwordHash, now, now, now);
  }

  const statements = [
    env.DB.prepare("UPDATE invitations SET status = 'accepted', accepted_at = ? WHERE id = ? AND status = 'pending' AND expires_at > ?").bind(now, invitation.id, now),
    env.DB.prepare("UPDATE email_outbox SET status = 'cancelled', updated_at = ? WHERE kind = 'invitation' AND reference_id = ? AND status IN ('pending','retry','delivering')").bind(now, invitation.id),
    ...(createUserStatement ? [createUserStatement] : []),
    env.DB.prepare("INSERT INTO organization_members (id,organization_id,user_id,role,status,created_at,updated_at) VALUES (?,?,?,?,'active',?,?)").bind(crypto.randomUUID(), invitation.organizationId, userId, invitation.role, now, now),
    env.DB.prepare("INSERT INTO audit_events (id,organization_id,project_id,actor_user_id,event_type,subject_type,subject_id,message,created_at) VALUES (?,?,NULL,?,'invitation_accepted','user',?,'客户接受组织邀请',?)").bind(crypto.randomUUID(), invitation.organizationId, userId, userId, now),
  ];
  try {
    const results = await env.DB.batch(statements);
    if (Number(results[0]?.meta?.changes ?? 0) !== 1) return NextResponse.json({ error: "邀请已被使用" }, { status: 409 });
  } catch (error) {
    console.error("invitation_accept_failed", error);
    return NextResponse.json({ error: "无法接受邀请，请刷新后重试" }, { status: 409 });
  }

  const response = NextResponse.json({ ok: true, organizationName: invitation.organizationName, user: { id: userId, email: invitation.email, displayName } });
  if (!currentSession) {
    const session = await createSession(userId, request);
    response.cookies.set(sessionCookie(session.token));
  }
  return response;
}
