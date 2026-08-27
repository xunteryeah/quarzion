import { ensureDatabase } from "@/db/bootstrap";
import { sha256 } from "@/lib/collection";
import { generateMonitoringRuns } from "@/lib/scheduler";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function authorized(request: NextRequest) {
  const expected = process.env.QUARZION_SCHEDULER_KEY ?? "";
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return expected.length >= 32 && supplied.length >= 32 && await sha256(expected) === await sha256(supplied);
}

export async function POST(request: NextRequest) {
  await ensureDatabase();
  if (!process.env.QUARZION_SCHEDULER_KEY) return NextResponse.json({ error: "调度密钥未配置" }, { status: 503 });
  if (!await authorized(request)) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { projectId?: unknown };
  const projectId = typeof body.projectId === "string" ? body.projectId.trim().slice(0, 120) : null;
  return NextResponse.json({ ok: true, ...(await generateMonitoringRuns({ projectId })) });
}
