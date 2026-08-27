import { env } from "@/db/runtime";
import { ensureDatabase } from "@/db/bootstrap";
import { emergencyStop, normalizeWorkerId, PLATFORMS, safeJsonArray } from "@/lib/collection";
import { collectorAuthorized } from "@/lib/collector-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  if (!collectorAuthorized(request)) return NextResponse.json({ error: "未授权" }, { status: 401 });
  await ensureDatabase();
  const body = await request.json() as Record<string, unknown>;
  const workerId = normalizeWorkerId(body.workerId);
  if (!workerId) return NextResponse.json({ error: "workerId 格式无效" }, { status: 400 });
  const version = String(body.collectorVersion ?? "").trim().slice(0, 120);
  if (!version) return NextResponse.json({ error: "缺少 collectorVersion" }, { status: 400 });
  const supported = safeJsonArray(body.supportedPlatforms, [...PLATFORMS]).filter((platform) => PLATFORMS.includes(platform as (typeof PLATFORMS)[number]));
  const executionMode = body.executionMode === "official_api" ? "official_api" : "official_api";
  const capabilities = Array.isArray(body.capabilities) ? body.capabilities.slice(0, 20) : [];
  const now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO collector_workers (id, label, status, collector_version, supported_platforms, execution_mode, capabilities_json, current_run_id, last_seen_at, created_at, updated_at)
    VALUES (?, ?, 'online', ?, ?, ?, ?, NULL, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET label = excluded.label, status = CASE WHEN collector_workers.status = 'disabled' THEN 'disabled' ELSE 'online' END, collector_version = excluded.collector_version, supported_platforms = excluded.supported_platforms, execution_mode = excluded.execution_mode, capabilities_json = excluded.capabilities_json, last_seen_at = excluded.last_seen_at, updated_at = excluded.updated_at`).bind(workerId, String(body.label ?? workerId).trim().slice(0, 100), version, JSON.stringify(supported), executionMode, JSON.stringify(capabilities), now, now, now).run();
  const policies = (await env.DB.prepare("SELECT platform, display_name AS displayName, enabled, paused_reason AS pausedReason, max_concurrency AS maxConcurrency, timeout_seconds AS timeoutSeconds, max_attempts AS maxAttempts, base_retry_seconds AS baseRetrySeconds, daily_budget AS dailyBudget, execution_mode AS executionMode FROM collection_policies ORDER BY platform").all()).results;
  return NextResponse.json({ ok: true, workerId, executionMode, emergencyStop: await emergencyStop(), policies });
}
