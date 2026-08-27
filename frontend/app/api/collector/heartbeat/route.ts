import { env } from "@/db/runtime";
import { ensureDatabase } from "@/db/bootstrap";
import { emergencyStop, normalizeWorkerId, sha256 } from "@/lib/collection";
import { collectorAuthorized } from "@/lib/collector-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  if (!collectorAuthorized(request)) return NextResponse.json({ error: "未授权" }, { status: 401 });
  await ensureDatabase();
  const body = await request.json() as Record<string, unknown>;
  const workerId = normalizeWorkerId(body.workerId);
  if (!workerId) return NextResponse.json({ error: "workerId 格式无效" }, { status: 400 });
  const runId = String(body.runId ?? "");
  const leaseToken = String(body.leaseToken ?? "");
  const now = new Date();
  const nowIso = now.toISOString();
  const worker = await env.DB.prepare("SELECT id, status FROM collector_workers WHERE id = ?").bind(workerId).first<{ id: string; status: string }>();
  if (!worker || worker.status === "disabled") return NextResponse.json({ error: "采集器未注册或已禁用" }, { status: 403 });
  await env.DB.prepare("UPDATE collector_workers SET last_seen_at = ?, updated_at = ? WHERE id = ?").bind(nowIso, nowIso, workerId).run();
  if (!runId) return NextResponse.json({ ok: true, emergencyStop: await emergencyStop() });
  if (!leaseToken) return NextResponse.json({ error: "缺少租约令牌" }, { status: 400 });
  const leaseHash = await sha256(leaseToken);
  const run = await env.DB.prepare("SELECT r.id, p.timeout_seconds AS timeoutSeconds FROM runs r JOIN collection_policies p ON p.platform = r.platform WHERE r.id = ? AND r.worker_id = ? AND r.status = 'running' AND r.lease_token_hash = ?").bind(runId, workerId, leaseHash).first<{ id: string; timeoutSeconds: number }>();
  if (!run) return NextResponse.json({ error: "租约无效或已经结束" }, { status: 409 });
  const leaseExpires = new Date(now.getTime() + Math.min(300, Math.max(30, Number(run.timeoutSeconds))) * 1000).toISOString();
  await env.DB.batch([
    env.DB.prepare("UPDATE runs SET lease_expires_at = ?, last_heartbeat_at = ? WHERE id = ? AND worker_id = ? AND lease_token_hash = ?").bind(leaseExpires, nowIso, runId, workerId, leaseHash),
    env.DB.prepare("UPDATE collector_workers SET current_run_id = ?, last_seen_at = ?, updated_at = ? WHERE id = ?").bind(runId, nowIso, nowIso, workerId),
  ]);
  return NextResponse.json({ ok: true, leaseExpiresAt: leaseExpires, emergencyStop: await emergencyStop() });
}
