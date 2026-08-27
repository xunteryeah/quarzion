import { NextRequest, NextResponse } from "next/server";
import { ensureDatabase } from "@/db/bootstrap";
import { env } from "@/db/runtime";
import { authIdentityHashes, createSession, sessionCookie, verifyPassword } from "@/lib/auth";

const DUMMY_PASSWORD_HASH = "pbkdf2_sha256$600000$00112233445566778899aabbccddeeff$5b72bdc321dbb7d751ebed59b6f27dc30888c1cafff9bc1eed59d02e5c00f8c4";

export async function POST(request: NextRequest) {
  await ensureDatabase();
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "请求格式不正确" }, { status: 400 }); }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!/^\S+@\S+\.\S+$/.test(email) || !password) return NextResponse.json({ error: "请输入正确的邮箱和密码" }, { status: 400 });

  const now = new Date();
  const nowIso = now.toISOString();
  const windowStart = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
  const { emailHash, ipHash } = await authIdentityHashes(request, email);
  const recent = await env.DB.prepare(`SELECT
      SUM(CASE WHEN email_hash = ? AND succeeded = 0 THEN 1 ELSE 0 END) AS emailFailures,
      SUM(CASE WHEN ip_hash = ? AND succeeded = 0 THEN 1 ELSE 0 END) AS ipFailures
      FROM auth_attempts WHERE created_at >= ?`).bind(emailHash, ipHash, windowStart).first<{ emailFailures: number | null; ipFailures: number | null }>();
  if (Number(recent?.emailFailures ?? 0) >= 8 || Number(recent?.ipFailures ?? 0) >= 20) {
    return NextResponse.json({ error: "登录尝试过多，请 15 分钟后再试" }, { status: 429, headers: { "Retry-After": "900" } });
  }

  const user = await env.DB.prepare("SELECT id,email,display_name AS displayName,password_hash AS passwordHash,status,failed_login_count AS failedLoginCount,locked_until AS lockedUntil FROM users WHERE email = ? LIMIT 1")
    .bind(email).first<{ id: string; email: string; displayName: string; passwordHash: string | null; status: string; failedLoginCount: number; lockedUntil: string | null }>();
  const validPassword = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  const locked = Boolean(user?.lockedUntil && user.lockedUntil > nowIso);
  const valid = Boolean(user && user.status === "active" && validPassword && !locked);

  await env.DB.prepare("INSERT INTO auth_attempts (id,email_hash,ip_hash,succeeded,created_at) VALUES (?,?,?,?,?)")
    .bind(crypto.randomUUID(), emailHash, ipHash, valid ? 1 : 0, nowIso).run();

  if (!valid || !user) {
    if (user) {
      const failures = Number(user.failedLoginCount ?? 0) + 1;
      const lockedUntil = failures >= 8 ? new Date(now.getTime() + 15 * 60 * 1000).toISOString() : null;
      await env.DB.prepare("UPDATE users SET failed_login_count = ?, locked_until = COALESCE(?, locked_until), updated_at = ? WHERE id = ?")
        .bind(failures, lockedUntil, nowIso, user.id).run();
    }
    return NextResponse.json({ error: "邮箱或密码不正确" }, { status: 401 });
  }

  await env.DB.prepare("UPDATE users SET failed_login_count = 0, locked_until = NULL, last_login_at = ?, updated_at = ? WHERE id = ?").bind(nowIso, nowIso, user.id).run();
  const memberships = (await env.DB.prepare("SELECT organization_id AS organizationId FROM organization_members WHERE user_id = ? AND status = 'active'").bind(user.id).all<{ organizationId: string }>()).results ?? [];
  if (memberships.length) {
    await env.DB.batch(memberships.map((membership) => env.DB.prepare("INSERT INTO audit_events (id,organization_id,project_id,actor_user_id,event_type,subject_type,subject_id,message,created_at) VALUES (?,?,NULL,?,'user_login','user',?,'客户用户登录',?)")
      .bind(crypto.randomUUID(), membership.organizationId, user.id, user.id, nowIso)));
  }
  const session = await createSession(user.id, request);
  const response = NextResponse.json({ user: { id: user.id, email: user.email, displayName: user.displayName } });
  response.cookies.set(sessionCookie(session.token));
  return response;
}
