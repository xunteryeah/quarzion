import { NextRequest, NextResponse } from "next/server";
import { ensureDatabase } from "@/db/bootstrap";
import { revokeSession, SESSION_COOKIE, sessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  await ensureDatabase();
  const allDevices = request.nextUrl.searchParams.get("all") === "1";
  await revokeSession(request.cookies.get(SESSION_COOKIE)?.value, allDevices);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookie("", 0));
  return response;
}
