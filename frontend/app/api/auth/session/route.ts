import { NextRequest, NextResponse } from "next/server";
import { ensureDatabase } from "@/db/bootstrap";
import { env } from "@/db/runtime";
import { getRequestSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  await ensureDatabase();
  const session = await getRequestSession(request);
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const memberships = (await env.DB.prepare(`SELECT m.organization_id AS organizationId, o.name AS organizationName, m.role
      FROM organization_members m JOIN organizations o ON o.id = m.organization_id
      WHERE m.user_id = ? AND m.status = 'active' AND o.status = 'active' ORDER BY o.name`)
    .bind(session.userId).all()).results ?? [];
  return NextResponse.json({ user: { id: session.userId, email: session.email, displayName: session.displayName }, memberships, expiresAt: session.expiresAt });
}
