import { env } from "@/db/runtime";
import { ensureDatabase } from "@/db/bootstrap";
import {
  emergencyStop,
  isPlatform,
  normalizeWorkerId,
  PLATFORMS,
  randomToken,
  recordAlert,
  safeJsonArray,
  sha256,
} from "@/lib/collection";
import { collectorAuthorized } from "@/lib/collector-auth";
import { NextRequest, NextResponse } from "next/server";

type Candidate = {
  id: string;
  organizationId: string;
  projectId: string;
  promptId: string;
  platform: string;
  region: string;
  modelVersion: string | null;
  modelTier: string | null;
  responseMode: "direct" | "web_search";
  attempt: number;
  maxAttempts: number;
  queryText: string;
  intent: string;
  timeoutSeconds: number;
  sourceUrl: string | null;
};

async function recoverExpiredLeases(now: string) {
  const expired = (
    await env.DB.prepare(
      "SELECT id, organization_id AS organizationId, project_id AS projectId, platform, attempt, max_attempts AS maxAttempts FROM runs WHERE status = 'running' AND lease_expires_at IS NOT NULL AND lease_expires_at < ?",
    )
      .bind(now)
      .all<{
        id: string;
        organizationId: string;
        projectId: string;
        platform: string;
        attempt: number;
        maxAttempts: number;
      }>()
  ).results;
  for (const run of expired) {
    if (Number(run.attempt) >= Number(run.maxAttempts)) {
      await env.DB.prepare(
        "UPDATE runs SET status = 'failed', completed_at = ?, failure_code = 'lease_expired', failure_category = 'system', error_message = '采集器租约到期且达到最大尝试次数', worker_id = NULL, lease_token_hash = NULL, lease_expires_at = NULL WHERE id = ? AND status = 'running'",
      )
        .bind(now, run.id)
        .run();
    } else {
      await env.DB.prepare(
        "UPDATE runs SET status = 'queued', attempt = attempt + 1, next_attempt_at = ?, worker_id = NULL, lease_token_hash = NULL, lease_expires_at = NULL, error_message = '采集器租约到期，任务已回收' WHERE id = ? AND status = 'running'",
      )
        .bind(now, run.id)
        .run();
    }
    await env.DB.prepare(
      "UPDATE collector_workers SET current_run_id = NULL, status = CASE WHEN status = 'disabled' THEN status ELSE 'offline' END, updated_at = ? WHERE current_run_id = ?",
    )
      .bind(now, run.id)
      .run();
    await recordAlert({
      organizationId: run.organizationId,
      projectId: run.projectId,
      runId: run.id,
      platform: run.platform,
      kind: "lease_expired",
      severity: "warning",
      fingerprint: `lease_expired:${run.id}:${run.attempt}`,
      message: `采集任务 ${run.id.slice(0, 8)} 的工作租约已到期`,
      metadata: { attempt: run.attempt, maxAttempts: run.maxAttempts },
    });
  }
}

export async function GET(request: NextRequest) {
  if (!collectorAuthorized(request))
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  await ensureDatabase();
  const workerId = normalizeWorkerId(
    request.headers.get("x-quarzion-worker-id") ??
      request.nextUrl.searchParams.get("workerId"),
  );
  if (!workerId)
    return NextResponse.json(
      { error: "缺少有效的 x-quarzion-worker-id" },
      { status: 400 },
    );
  const worker = await env.DB.prepare(
    "SELECT id, status, collector_version AS collectorVersion, supported_platforms AS supportedPlatforms FROM collector_workers WHERE id = ?",
  )
    .bind(workerId)
    .first<{
      id: string;
      status: string;
      collectorVersion: string;
      supportedPlatforms: string;
    }>();
  if (!worker)
    return NextResponse.json({ error: "采集器尚未注册" }, { status: 403 });
  if (worker.status === "disabled" || worker.status === "draining")
    return new NextResponse(null, { status: 204 });
  const stop = await emergencyStop();
  if (stop.enabled)
    return NextResponse.json(
      { error: "采集已紧急停止", reason: stop.reason },
      { status: 423 },
    );

  const now = new Date().toISOString();
  await recoverExpiredLeases(now);
  const platforms = safeJsonArray(worker.supportedPlatforms).filter(
    (platform) => PLATFORMS.includes(platform as (typeof PLATFORMS)[number]),
  );
  if (!platforms.length)
    return NextResponse.json({ error: "采集器没有可用平台" }, { status: 409 });
  const requestedPlatform = request.nextUrl.searchParams.get("platform");
  if (
    requestedPlatform &&
    (!isPlatform(requestedPlatform) || !platforms.includes(requestedPlatform))
  ) {
    return NextResponse.json(
      { error: "请求的平台不在该采集器的支持范围内" },
      { status: 400 },
    );
  }
  const eligiblePlatforms = requestedPlatform ? [requestedPlatform] : platforms;
  const projectId = request.nextUrl.searchParams.get("projectId");
  const placeholders = eligiblePlatforms.map(() => "?").join(",");
  const projectClause = projectId ? "AND r.project_id = ?" : "";
  const candidate = await env.DB.prepare(
    `SELECT r.id, r.organization_id AS organizationId, r.project_id AS projectId, r.prompt_id AS promptId, r.platform, r.region, r.model_version AS modelVersion, r.model_tier AS modelTier, r.response_mode AS responseMode, r.attempt, r.max_attempts AS maxAttempts, r.source_url AS sourceUrl, p.query_text AS queryText, p.intent, cp.timeout_seconds AS timeoutSeconds
    FROM runs r
    JOIN prompts p ON p.id = r.prompt_id
    JOIN collection_policies cp ON cp.platform = r.platform
    WHERE r.status = 'queued'
      AND r.platform IN (${placeholders})
      AND cp.enabled = 1
      AND r.attempt <= r.max_attempts
      AND r.scheduled_at <= ?
      AND (r.next_attempt_at IS NULL OR r.next_attempt_at <= ?)
      ${projectClause}
      AND (SELECT COUNT(*) FROM runs active WHERE active.platform = r.platform AND active.status = 'running') < cp.max_concurrency
      AND (SELECT COUNT(*) FROM runs daily WHERE daily.platform = r.platform AND daily.status != 'queued' AND COALESCE(daily.claimed_at, daily.started_at, daily.completed_at, daily.scheduled_at) >= substr(?, 1, 10) || 'T00:00:00.000Z') < cp.daily_budget
    ORDER BY r.priority DESC, r.scheduled_at ASC
    LIMIT 1`,
  )
    .bind(
      ...eligiblePlatforms,
      now,
      now,
      ...(projectId ? [projectId] : []),
      now,
    )
    .first<Candidate>();
  if (!candidate) {
    await env.DB.prepare(
      "UPDATE collector_workers SET status = 'online', current_run_id = NULL, last_seen_at = ?, updated_at = ? WHERE id = ?",
    )
      .bind(now, now, workerId)
      .run();
    return new NextResponse(null, { status: 204 });
  }

  const leaseToken = randomToken();
  const leaseHash = await sha256(leaseToken);
  const leaseExpiresAt = new Date(
    Date.now() +
      Math.min(300, Math.max(30, Number(candidate.timeoutSeconds))) * 1000,
  ).toISOString();
  const claimed = await env.DB.prepare(
    "UPDATE runs SET status = 'running', execution_mode = 'official_api', source_url = COALESCE(source_url, ?), claimed_at = ?, started_at = COALESCE(started_at, ?), lease_expires_at = ?, lease_token_hash = ?, worker_id = ?, last_heartbeat_at = ?, collector_version = ? WHERE id = ? AND status = 'queued'",
  )
    .bind(
      candidate.sourceUrl,
      now,
      now,
      leaseExpiresAt,
      leaseHash,
      workerId,
      now,
      worker.collectorVersion,
      candidate.id,
    )
    .run();
  if (!claimed.meta.changes) return new NextResponse(null, { status: 409 });
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO run_attempts (id, organization_id, project_id, run_id, attempt_number, worker_id, status, started_at, collector_version, created_at) VALUES (?, ?, ?, ?, ?, ?, 'running', ?, ?, ?) ON CONFLICT(run_id, attempt_number) DO UPDATE SET worker_id = excluded.worker_id, status = 'running', started_at = excluded.started_at, collector_version = excluded.collector_version",
    ).bind(
      crypto.randomUUID(),
      candidate.organizationId,
      candidate.projectId,
      candidate.id,
      candidate.attempt,
      workerId,
      now,
      worker.collectorVersion,
      now,
    ),
    env.DB.prepare(
      "UPDATE collector_workers SET status = 'online', current_run_id = ?, last_seen_at = ?, updated_at = ? WHERE id = ?",
    ).bind(candidate.id, now, now, workerId),
  ]);
  return NextResponse.json({
    runId: candidate.id,
    organizationId: candidate.organizationId,
    projectId: candidate.projectId,
    promptId: candidate.promptId,
    platform: candidate.platform,
    region: candidate.region,
    modelVersion: candidate.modelVersion,
    modelTier: candidate.modelTier,
    responseMode: candidate.responseMode,
    attempt: candidate.attempt,
    maxAttempts: candidate.maxAttempts,
    queryText: candidate.queryText,
    intent: candidate.intent,
    executionMode: "official_api",
    sourceUrl: candidate.sourceUrl,
    timeoutSeconds: candidate.timeoutSeconds,
    leaseToken,
    leaseExpiresAt,
  });
}
