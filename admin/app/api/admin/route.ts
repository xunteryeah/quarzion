import { env } from "@/db/runtime";
import { NextRequest, NextResponse } from "next/server";
import { getChatGPTUser } from "../../chatgpt-auth";
import { ensureAdminDatabase } from "@/db/bootstrap";
import { sealInvitationEmail } from "@/lib/email-outbox";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

function rows(result: D1Result<unknown>) {
  return (result.results ?? []) as Row[];
}

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function token() {
  return [...crypto.getRandomValues(new Uint8Array(32))]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function upsertOperationalAlert(input: {
  fingerprint: string;
  kind: string;
  severity: "info" | "warning" | "critical";
  message: string;
  platform?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const createdAt = now();
  const existing = await env.DB.prepare(
    "SELECT id FROM system_alerts WHERE fingerprint = ? AND status != 'resolved' LIMIT 1",
  )
    .bind(input.fingerprint)
    .first<{ id: string }>();
  if (existing) {
    await env.DB.prepare(
      "UPDATE system_alerts SET last_seen_at = ?, message = ?, metadata_json = ?, updated_at = ? WHERE id = ?",
    )
      .bind(
        createdAt,
        input.message,
        JSON.stringify(input.metadata ?? {}),
        createdAt,
        existing.id,
      )
      .run();
    return;
  }
  await env.DB.prepare(
    "INSERT INTO system_alerts (id,platform,kind,severity,fingerprint,status,occurrence_count,message,metadata_json,first_seen_at,last_seen_at,created_at,updated_at) VALUES (?,?,?,?,?,'open',1,?,?,?,?,?,?)",
  )
    .bind(
      id("alert"),
      input.platform ?? null,
      input.kind,
      input.severity,
      input.fingerprint,
      input.message,
      JSON.stringify(input.metadata ?? {}),
      createdAt,
      createdAt,
      createdAt,
      createdAt,
    )
    .run();
}

async function resolveOperationalAlert(fingerprint: string) {
  const createdAt = now();
  await env.DB.prepare(
    "UPDATE system_alerts SET status = 'resolved', resolved_at = ?, updated_at = ? WHERE fingerprint = ? AND status != 'resolved'",
  )
    .bind(createdAt, createdAt, fingerprint)
    .run();
}

async function refreshOperationalHealth() {
  const createdAt = now();
  const offlineBefore = new Date(Date.now() - 3 * 60_000).toISOString();
  const staleWorkers = rows(
    await env.DB.prepare(
      "SELECT id,label,last_seen_at FROM collector_workers WHERE status IN ('online','draining') AND last_seen_at < ?",
    )
      .bind(offlineBefore)
      .all(),
  );
  for (const worker of staleWorkers) {
    await env.DB.prepare(
      "UPDATE collector_workers SET status = 'offline', updated_at = ? WHERE id = ? AND status IN ('online','draining')",
    )
      .bind(createdAt, String(worker.id))
      .run();
    await upsertOperationalAlert({
      fingerprint: `worker_offline:${String(worker.id)}`,
      kind: "worker_offline",
      severity: "critical",
      message: `采集器 ${String(worker.label)} 已超过 3 分钟没有心跳`,
      metadata: { workerId: worker.id, lastSeenAt: worker.last_seen_at },
    });
  }
  const liveWorkers = rows(
    await env.DB.prepare(
      "SELECT id FROM collector_workers WHERE status = 'online' AND last_seen_at >= ?",
    )
      .bind(offlineBefore)
      .all(),
  );
  for (const worker of liveWorkers)
    await resolveOperationalAlert(`worker_offline:${String(worker.id)}`);

  const queue = await env.DB.prepare(
    "SELECT COUNT(*) AS count, MIN(scheduled_at) AS oldest FROM runs WHERE status = 'queued' AND scheduled_at <= ?",
  )
    .bind(createdAt)
    .first<{ count: number; oldest: string | null }>();
  const queueCount = Number(queue?.count ?? 0);
  const oldestAgeMinutes = queue?.oldest
    ? Math.floor((Date.now() - new Date(queue.oldest).getTime()) / 60_000)
    : 0;
  if (queueCount >= 20 || (queueCount > 0 && oldestAgeMinutes >= 15)) {
    await upsertOperationalAlert({
      fingerprint: "queue_backlog:global",
      kind: "queue_backlog",
      severity:
        queueCount >= 100 || oldestAgeMinutes >= 60 ? "critical" : "warning",
      message: `采集队列积压 ${queueCount} 条，最久等待 ${Math.max(0, oldestAgeMinutes)} 分钟`,
      metadata: { queueCount, oldestAgeMinutes },
    });
  } else await resolveOperationalAlert("queue_backlog:global");

  const since = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const platformHealth = rows(
    await env.DB.prepare(
      `SELECT platform, COUNT(*) AS total, SUM(CASE WHEN status = 'parsed' THEN 1 ELSE 0 END) AS successes
    FROM runs WHERE status IN ('parsed','failed','blocked') AND COALESCE(completed_at,scheduled_at) >= ? GROUP BY platform`,
    )
      .bind(since)
      .all(),
  );
  for (const platform of ["doubao", "qwen", "deepseek"]) {
    const row = platformHealth.find((item) => item.platform === platform);
    const total = Number(row?.total ?? 0);
    const successes = Number(row?.successes ?? 0);
    const rate = total ? Math.round((successes * 1000) / total) / 10 : 100;
    const fingerprint = `success_rate:${platform}`;
    if (total >= 5 && rate < 70)
      await upsertOperationalAlert({
        fingerprint,
        kind: "success_rate_drop",
        severity: rate < 40 ? "critical" : "warning",
        platform,
        message: `${platform} 最近 24 小时采集成功率下降到 ${rate}%`,
        metadata: { total, successes, rate },
      });
    else await resolveOperationalAlert(fingerprint);
  }
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function authorize(request: NextRequest) {
  const user = await getChatGPTUser();
  const local = new URL(request.url).hostname === "localhost";
  const trustedSelfHosted =
    process.env.QUARZION_SELF_HOSTED_ADMIN === "1" &&
    request.headers.get("x-quarzion-admin") === "1";
  return (
    user ??
    (local || trustedSelfHosted
      ? { email: "admin@quarzion.local", displayName: "Quarzion 管理员" }
      : null)
  );
}

async function dashboard() {
  await refreshOperationalHealth();
  const [
    organizations,
    projects,
    invitations,
    tasks,
    events,
    contacts,
    audits,
    workers,
    policies,
    artifacts,
    emergency,
  ] = await Promise.all([
    env.DB.prepare(
      "SELECT id, name, plan, status, COALESCE(owner_display, '—') AS owner, created_at FROM organizations ORDER BY created_at DESC",
    ).all(),
    env.DB.prepare(
      `SELECT p.id, p.organization_id, o.name AS organization_name, p.name,
      COALESCE((SELECT b.name FROM brands b WHERE b.project_id = p.id AND b.is_primary = 1 LIMIT 1), '未设置') AS primary_brand,
      COALESCE((SELECT json_group_array(platform) FROM (SELECT DISTINCT r.platform AS platform FROM runs r WHERE r.project_id = p.id ORDER BY r.platform)), '[]') AS platforms,
      (SELECT COUNT(*) FROM prompts pr WHERE pr.project_id = p.id AND pr.active = 1) AS prompt_count,
      p.status AS run_status,
      (SELECT MAX(r.scheduled_at) FROM runs r WHERE r.project_id = p.id) AS last_run_at,
      p.created_at
      FROM projects p JOIN organizations o ON o.id = p.organization_id
      WHERE p.status != 'archived' ORDER BY p.created_at DESC`,
    ).all(),
    env.DB.prepare(
      `SELECT i.id, i.organization_id, o.name AS organization_name, i.email, i.role, i.status, i.expires_at, i.accepted_at, i.created_at,
      COALESCE((SELECT eo.status FROM email_outbox eo WHERE eo.kind = 'invitation' AND eo.reference_id = i.id LIMIT 1), 'not_queued') AS delivery_status,
      (SELECT eo.last_error FROM email_outbox eo WHERE eo.kind = 'invitation' AND eo.reference_id = i.id LIMIT 1) AS delivery_error
      FROM invitations i JOIN organizations o ON o.id = i.organization_id ORDER BY i.created_at DESC LIMIT 100`,
    ).all(),
    env.DB.prepare(
      `SELECT r.id, r.organization_id, r.project_id, p.name AS project_name, r.platform, pr.query_text AS prompt_text, NULL AS account_id, r.worker_id AS account_label, r.worker_id, r.status,
      CASE WHEN r.priority >= 80 THEN 'high' WHEN r.priority < 30 THEN 'low' ELSE 'normal' END AS priority,
      r.attempt, r.max_attempts, r.execution_mode, r.response_mode, r.model_version, r.model_tier, r.search_performed,
      r.provider_request_id, r.input_tokens, r.output_tokens, r.reasoning_tokens, r.cached_tokens, r.cost_micros,
      r.region, r.scheduled_at, r.started_at, r.completed_at, r.lease_expires_at, r.duration_ms,
      r.failure_code AS error_code, r.failure_category, r.error_message, r.response_sha256,
      r.provider_response_sha256, r.source_url, r.raw_text AS answer_text, r.collector_version,
      (SELECT COUNT(*) FROM citations c JOIN answers a ON a.id = c.answer_id WHERE a.run_id = r.id) AS citation_count
      FROM runs r JOIN projects p ON p.id = r.project_id JOIN prompts pr ON pr.id = r.prompt_id ORDER BY r.scheduled_at DESC LIMIT 500`,
    ).all(),
    env.DB.prepare(
      `SELECT a.id, NULL AS account_id, NULL AS account_label, a.run_id AS task_id, a.kind AS event_type, a.severity, a.message,
      CASE WHEN a.status = 'open' THEN 0 ELSE 1 END AS acknowledged, a.status, a.occurrence_count, a.platform, a.first_seen_at, a.last_seen_at AS created_at
      FROM system_alerts a ORDER BY CASE a.status WHEN 'open' THEN 0 WHEN 'acknowledged' THEN 1 ELSE 2 END, CASE a.severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, a.last_seen_at DESC LIMIT 200`,
    ).all(),
    env.DB.prepare(
      `SELECT id,name,company,email,phone,message,source,status,delivery_status,delivery_error,created_at,updated_at
      FROM contact_submissions ORDER BY created_at DESC LIMIT 200`,
    ).all(),
    env.DB.prepare(
      "SELECT * FROM admin_audit_events ORDER BY created_at DESC LIMIT 100",
    ).all(),
    env.DB.prepare(
      "SELECT id,label,status,collector_version,supported_platforms,execution_mode,current_run_id,last_seen_at,created_at,updated_at FROM collector_workers ORDER BY last_seen_at DESC",
    ).all(),
    env.DB.prepare(
      "SELECT platform,display_name,enabled,paused_reason,max_concurrency,timeout_seconds,max_attempts,base_retry_seconds,daily_budget,execution_mode,updated_at FROM collection_policies ORDER BY platform",
    ).all(),
    env.DB.prepare(
      `SELECT e.id,e.organization_id,e.project_id,p.name AS project_name,e.run_id,e.answer_id,e.kind,e.mime_type,e.sha256,e.byte_size,e.source_url,e.captured_at,
      r.platform,r.region,r.model_version,r.collector_version,r.page_title,r.raw_text AS answer_text,r.response_sha256
      FROM evidence_artifacts e JOIN projects p ON p.id = e.project_id JOIN runs r ON r.id = e.run_id ORDER BY e.captured_at DESC LIMIT 200`,
    ).all(),
    env.DB.prepare(
      "SELECT value_json FROM system_settings WHERE key = 'collector.emergency_stop'",
    ).first(),
  ]);

  return {
    organizations: rows(organizations),
    projects: rows(projects).map((project) => ({
      ...project,
      platforms: JSON.parse(String(project.platforms ?? "[]")),
    })),
    invitations: rows(invitations),
    pools: [],
    accounts: [],
    tasks: rows(tasks),
    events: rows(events),
    contacts: rows(contacts),
    audits: rows(audits),
    workers: rows(workers).map((worker) => ({
      ...worker,
      supported_platforms: JSON.parse(
        String(worker.supported_platforms ?? "[]"),
      ),
    })),
    policies: rows(policies),
    artifacts: rows(artifacts),
    emergencyStop: (() => {
      try {
        return JSON.parse(
          String((emergency as Row | null)?.value_json ?? "{}"),
        );
      } catch {
        return { enabled: true, reason: "配置损坏" };
      }
    })(),
    generatedAt: now(),
  };
}

export async function GET(request: NextRequest) {
  await ensureAdminDatabase();
  const user = await authorize(request);
  if (!user)
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });
  const evidenceId = new URL(request.url).searchParams.get("evidenceId");
  if (evidenceId) {
    const artifact = await env.DB.prepare(
      "SELECT id,kind,mime_type AS mimeType,content,sha256 FROM evidence_artifacts WHERE id = ?",
    )
      .bind(evidenceId)
      .first<{
        id: string;
        kind: string;
        mimeType: string;
        content: Uint8Array;
        sha256: string;
      }>();
    if (!artifact)
      return NextResponse.json({ error: "证据不存在" }, { status: 404 });
    await env.DB.prepare(
      "INSERT INTO admin_audit_events (id,actor,action,subject_type,subject_id,message,created_at) VALUES (?,?,?,?,?,?,?)",
    )
      .bind(
        id("audit"),
        String(user.email),
        "evidence_inspected",
        "evidence",
        artifact.id,
        `抽检 ${artifact.kind} 证据（${artifact.sha256.slice(0, 12)}）`,
        now(),
      )
      .run();
    const extension =
      artifact.kind === "screenshot"
        ? artifact.mimeType.includes("png")
          ? "png"
          : artifact.mimeType.includes("jpeg")
            ? "jpg"
            : "webp"
        : "html";
    return new NextResponse(artifact.content as BodyInit, {
      headers: {
        "Content-Type": artifact.mimeType,
        "Content-Disposition": `inline; filename=quarzion-evidence-${artifact.id}.${extension}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Quarzion-SHA256": artifact.sha256,
      },
    });
  }
  return NextResponse.json({ ...(await dashboard()), currentUser: user });
}

export async function POST(request: NextRequest) {
  await ensureAdminDatabase();
  const user = await authorize(request);
  if (!user)
    return NextResponse.json({ error: "需要管理员登录" }, { status: 401 });

  const body = (await request.json()) as Record<string, unknown>;
  const command = String(body.command ?? "");
  const createdAt = now();
  const actor = String(user.email);
  let commandResult: Record<string, unknown> = {};

  if (command === "create_organization") {
    const organizationId = id("org");
    const name = String(body.name ?? "").trim();
    const organizationSlug = slug(String(body.slug ?? name));
    if (name.length < 2 || name.length > 120)
      return NextResponse.json(
        { error: "客户公司名称需要 2–120 个字符" },
        { status: 400 },
      );
    if (organizationSlug.length < 2)
      return NextResponse.json(
        { error: "请输入可用的公司英文简称" },
        { status: 400 },
      );
    const exists = await env.DB.prepare(
      "SELECT id FROM organizations WHERE slug = ? LIMIT 1",
    )
      .bind(organizationSlug)
      .first();
    if (exists)
      return NextResponse.json(
        { error: "公司英文简称已存在" },
        { status: 409 },
      );
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO organizations (id,name,slug,plan,status,owner_display,created_at,updated_at) VALUES (?,?,?,?,'active',?,?,?)",
      ).bind(
        organizationId,
        name,
        organizationSlug,
        String(body.plan ?? "standard"),
        String(body.owner ?? actor),
        createdAt,
        createdAt,
      ),
      env.DB.prepare(
        "INSERT INTO admin_audit_events (id,actor,action,subject_type,subject_id,message,created_at) VALUES (?,?,?,?,?,?,?)",
      ).bind(
        id("audit"),
        actor,
        "organization_created",
        "organization",
        organizationId,
        `创建客户组织 ${name}`,
        createdAt,
      ),
    ]);
    commandResult = { createdOrganizationId: organizationId };
  } else if (command === "create_project") {
    const projectId = id("project");
    const brandId = id("brand");
    const organizationId = String(body.organizationId ?? "");
    const name = String(body.name ?? "").trim();
    const brandName = String(body.brandName ?? "").trim();
    const organization = await env.DB.prepare(
      "SELECT name FROM organizations WHERE id = ? AND status = 'active'",
    )
      .bind(organizationId)
      .first<{ name: string }>();
    if (!organization)
      return NextResponse.json(
        { error: "客户组织不存在或已停用" },
        { status: 404 },
      );
    if (name.length < 2 || brandName.length < 1)
      return NextResponse.json(
        { error: "项目名称和主品牌不能为空" },
        { status: 400 },
      );
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO projects (id,organization_id,name,region,language,status,created_at,updated_at) VALUES (?,?,?,?,?,'active',?,?)",
      ).bind(
        projectId,
        organizationId,
        name,
        String(body.region ?? "CN"),
        String(body.language ?? "zh-CN"),
        createdAt,
        createdAt,
      ),
      env.DB.prepare(
        "INSERT INTO brands (id,organization_id,project_id,name,canonical_name,website,is_primary,status,created_at,updated_at) VALUES (?,?,?,?,?,?,1,'active',?,?)",
      ).bind(
        brandId,
        organizationId,
        projectId,
        brandName,
        brandName,
        body.website ? String(body.website) : null,
        createdAt,
        createdAt,
      ),
      env.DB.prepare(
        "INSERT INTO monitoring_schedules (id,organization_id,project_id,frequency,timezone,local_run_time,prompt_limit,enabled,last_generated_for_date,next_run_at,created_at,updated_at) VALUES (?,?,?,'daily','Asia/Shanghai','02:00',10,1,NULL,?,?,?)",
      ).bind(
        id("schedule"),
        organizationId,
        projectId,
        createdAt,
        createdAt,
        createdAt,
      ),
      env.DB.prepare(
        "INSERT INTO admin_audit_events (id,actor,action,subject_type,subject_id,message,created_at) VALUES (?,?,?,?,?,?,?)",
      ).bind(
        id("audit"),
        actor,
        "project_created",
        "project",
        projectId,
        `为 ${organization.name} 创建项目 ${name}`,
        createdAt,
      ),
    ]);
    commandResult = { createdProjectId: projectId };
  } else if (command === "create_invitation") {
    const invitationId = id("invite");
    const organizationId = String(body.organizationId ?? "");
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const role = ["organization_admin", "member", "viewer"].includes(
      String(body.role),
    )
      ? String(body.role)
      : "member";
    const organization = await env.DB.prepare(
      "SELECT name FROM organizations WHERE id = ? AND status = 'active'",
    )
      .bind(organizationId)
      .first<{ name: string }>();
    if (!organization)
      return NextResponse.json(
        { error: "客户组织不存在或已停用" },
        { status: 404 },
      );
    if (!/^\S+@\S+\.\S+$/.test(email))
      return NextResponse.json(
        { error: "请输入正确的邀请邮箱" },
        { status: 400 },
      );
    const existingPending = await env.DB.prepare(
      "SELECT id FROM invitations WHERE organization_id = ? AND email = ? AND status = 'pending' AND expires_at > ? LIMIT 1",
    )
      .bind(organizationId, email, createdAt)
      .first();
    if (existingPending)
      return NextResponse.json(
        { error: "该邮箱已经有一条未过期邀请，请先撤销或等待过期" },
        { status: 409 },
      );
    const rawToken = token();
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const appUrl = (
      process.env.QUARZION_APP_URL ?? "https://app.quarzion.com"
    ).replace(/\/$/, "");
    const invitationUrl = `${appUrl}/invite/${rawToken}`;
    let sealed: Awaited<ReturnType<typeof sealInvitationEmail>>;
    try {
      sealed = await sealInvitationEmail({
        kind: "invitation",
        id: invitationId,
        organizationName: organization.name,
        email,
        role,
        invitationUrl,
        expiresAt,
      });
    } catch {
      return NextResponse.json(
        { error: "邀请邮件安全队列尚未配置，请联系系统管理员" },
        { status: 503 },
      );
    }
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO invitations (id,organization_id,email,role,token_hash,invited_by_user_id,status,expires_at,accepted_at,created_at) VALUES (?,?,?,?,?,NULL,'pending',?,NULL,?)",
      ).bind(
        invitationId,
        organizationId,
        email,
        role,
        await sha256(rawToken),
        expiresAt,
        createdAt,
      ),
      env.DB.prepare(
        `INSERT INTO email_outbox
        (id,kind,reference_id,recipient_email,payload_ciphertext,payload_iv,status,attempt_count,max_attempts,next_attempt_at,last_error,delivered_at,created_at,updated_at)
        VALUES (?,'invitation',?,?,?,?,'pending',0,8,?,NULL,NULL,?,?)`,
      ).bind(
        id("email"),
        invitationId,
        email,
        sealed.ciphertext,
        sealed.iv,
        createdAt,
        createdAt,
        createdAt,
      ),
      env.DB.prepare(
        "INSERT INTO admin_audit_events (id,actor,action,subject_type,subject_id,message,created_at) VALUES (?,?,?,?,?,?,?)",
      ).bind(
        id("audit"),
        actor,
        "invitation_created",
        "invitation",
        invitationId,
        `邀请 ${email} 加入 ${organization.name}`,
        createdAt,
      ),
    ]);
    commandResult = {
      invitationUrl,
      invitationExpiresAt: expiresAt,
      invitationDeliveryStatus: "pending",
    };
  } else if (command === "resend_invitation") {
    const previousId = String(body.invitationId ?? "");
    const previous = await env.DB.prepare(
      "SELECT i.organization_id AS organizationId,i.email,i.role,o.name AS organizationName FROM invitations i JOIN organizations o ON o.id = i.organization_id WHERE i.id = ? AND i.status = 'pending'",
    )
      .bind(previousId)
      .first<{
        organizationId: string;
        email: string;
        role: string;
        organizationName: string;
      }>();
    if (!previous)
      return NextResponse.json({ error: "待处理邀请不存在" }, { status: 404 });
    const invitationId = id("invite");
    const rawToken = token();
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const appUrl = (
      process.env.QUARZION_APP_URL ?? "https://app.quarzion.com"
    ).replace(/\/$/, "");
    const invitationUrl = `${appUrl}/invite/${rawToken}`;
    let sealed: Awaited<ReturnType<typeof sealInvitationEmail>>;
    try {
      sealed = await sealInvitationEmail({
        kind: "invitation",
        id: invitationId,
        organizationName: previous.organizationName,
        email: previous.email,
        role: previous.role,
        invitationUrl,
        expiresAt,
      });
    } catch {
      return NextResponse.json(
        { error: "邀请邮件安全队列尚未配置，请联系系统管理员" },
        { status: 503 },
      );
    }
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE invitations SET status = 'revoked' WHERE id = ? AND status = 'pending'",
      ).bind(previousId),
      env.DB.prepare(
        "UPDATE email_outbox SET status = 'cancelled', updated_at = ? WHERE kind = 'invitation' AND reference_id = ? AND status != 'delivered'",
      ).bind(createdAt, previousId),
      env.DB.prepare(
        "INSERT INTO invitations (id,organization_id,email,role,token_hash,invited_by_user_id,status,expires_at,accepted_at,created_at) VALUES (?,?,?,?,?,NULL,'pending',?,NULL,?)",
      ).bind(
        invitationId,
        previous.organizationId,
        previous.email,
        previous.role,
        await sha256(rawToken),
        expiresAt,
        createdAt,
      ),
      env.DB.prepare(
        `INSERT INTO email_outbox
        (id,kind,reference_id,recipient_email,payload_ciphertext,payload_iv,status,attempt_count,max_attempts,next_attempt_at,last_error,delivered_at,created_at,updated_at)
        VALUES (?,'invitation',?,?,?,?,'pending',0,8,?,NULL,NULL,?,?)`,
      ).bind(
        id("email"),
        invitationId,
        previous.email,
        sealed.ciphertext,
        sealed.iv,
        createdAt,
        createdAt,
        createdAt,
      ),
      env.DB.prepare(
        "INSERT INTO admin_audit_events (id,actor,action,subject_type,subject_id,message,created_at) VALUES (?,?,?,?,?,?,?)",
      ).bind(
        id("audit"),
        actor,
        "invitation_resent",
        "invitation",
        invitationId,
        `重新生成 ${previous.email} 的一次性邀请`,
        createdAt,
      ),
    ]);
    commandResult = {
      invitationUrl,
      invitationExpiresAt: expiresAt,
      invitationDeliveryStatus: "pending",
    };
  } else if (command === "revoke_invitation") {
    const invitationId = String(body.invitationId ?? "");
    const invitation = await env.DB.prepare(
      "SELECT email FROM invitations WHERE id = ? AND status = 'pending'",
    )
      .bind(invitationId)
      .first<{ email: string }>();
    if (!invitation)
      return NextResponse.json({ error: "待处理邀请不存在" }, { status: 404 });
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE invitations SET status = 'revoked' WHERE id = ? AND status = 'pending'",
      ).bind(invitationId),
      env.DB.prepare(
        "UPDATE email_outbox SET status = 'cancelled', updated_at = ? WHERE kind = 'invitation' AND reference_id = ? AND status != 'delivered'",
      ).bind(createdAt, invitationId),
      env.DB.prepare(
        "INSERT INTO admin_audit_events (id,actor,action,subject_type,subject_id,message,created_at) VALUES (?,?,?,?,?,?,?)",
      ).bind(
        id("audit"),
        actor,
        "invitation_revoked",
        "invitation",
        invitationId,
        `撤销 ${invitation.email} 的邀请`,
        createdAt,
      ),
    ]);
  } else if (command === "set_contact_status") {
    const contactId = String(body.contactId ?? "");
    const status = [
      "received",
      "contacted",
      "qualified",
      "closed",
      "spam",
    ].includes(String(body.status))
      ? String(body.status)
      : "";
    if (!status)
      return NextResponse.json({ error: "咨询状态不正确" }, { status: 400 });
    const contact = await env.DB.prepare(
      "SELECT company,email FROM contact_submissions WHERE id = ?",
    )
      .bind(contactId)
      .first<{ company: string; email: string }>();
    if (!contact)
      return NextResponse.json({ error: "咨询记录不存在" }, { status: 404 });
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE contact_submissions SET status = ?, updated_at = ? WHERE id = ?",
      ).bind(status, createdAt, contactId),
      env.DB.prepare(
        "INSERT INTO admin_audit_events (id,actor,action,subject_type,subject_id,message,created_at) VALUES (?,?,?,?,?,?,?)",
      ).bind(
        id("audit"),
        actor,
        "contact_status_updated",
        "contact_submission",
        contactId,
        `${contact.company}（${contact.email}）咨询状态更新为 ${status}`,
        createdAt,
      ),
    ]);
  } else if (
    command === "create_account" ||
    command === "set_account_status" ||
    command === "set_pool_status"
  ) {
    return NextResponse.json(
      { error: "账号与会话池属于延期模块，当前正式系统仅运行官方 API Worker" },
      { status: 409 },
    );
  } else if (command === "retry_task") {
    const taskId = String(body.taskId ?? "");
    const task = await env.DB.prepare(
      "SELECT p.query_text AS promptText FROM runs r JOIN prompts p ON p.id = r.prompt_id WHERE r.id = ? AND r.status IN ('failed','blocked')",
    )
      .bind(taskId)
      .first<{ promptText: string }>();
    if (!task)
      return NextResponse.json({ error: "任务不存在" }, { status: 404 });
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE runs SET status = 'queued', attempt = 1, next_attempt_at = NULL, worker_id = NULL, lease_token_hash = NULL, lease_expires_at = NULL, completed_at = NULL, failure_code = NULL, failure_category = NULL, error_message = NULL, scheduled_at = ? WHERE id = ?",
      ).bind(createdAt, taskId),
      env.DB.prepare(
        "INSERT INTO admin_audit_events (id,actor,action,subject_type,subject_id,message,created_at) VALUES (?,?,?,?,?,?,?)",
      ).bind(
        id("audit"),
        actor,
        "run_retried",
        "run",
        taskId,
        `重新排队：${task.promptText}`,
        createdAt,
      ),
    ]);
  } else if (command === "acknowledge_event") {
    const eventId = String(body.eventId ?? "");
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE system_alerts SET status = 'acknowledged', acknowledged_at = ?, acknowledged_by = ?, updated_at = ? WHERE id = ? AND status = 'open'",
      ).bind(createdAt, actor, createdAt, eventId),
      env.DB.prepare(
        "INSERT INTO admin_audit_events (id,actor,action,subject_type,subject_id,message,created_at) VALUES (?,?,?,?,?,?,?)",
      ).bind(
        id("audit"),
        actor,
        "alert_acknowledged",
        "system_alert",
        eventId,
        "采集异常已确认",
        createdAt,
      ),
    ]);
  } else if (command === "resolve_alert") {
    const eventId = String(body.eventId ?? "");
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE system_alerts SET status = 'resolved', resolved_at = ?, updated_at = ? WHERE id = ?",
      ).bind(createdAt, createdAt, eventId),
      env.DB.prepare(
        "INSERT INTO admin_audit_events (id,actor,action,subject_type,subject_id,message,created_at) VALUES (?,?,?,?,?,?,?)",
      ).bind(
        id("audit"),
        actor,
        "alert_resolved",
        "system_alert",
        eventId,
        "采集异常已解决",
        createdAt,
      ),
    ]);
  } else if (command === "reopen_alert") {
    const eventId = String(body.eventId ?? "");
    const alert = await env.DB.prepare(
      "SELECT fingerprint FROM system_alerts WHERE id = ? AND status = 'resolved'",
    )
      .bind(eventId)
      .first<{ fingerprint: string }>();
    if (!alert)
      return NextResponse.json({ error: "已解决异常不存在" }, { status: 404 });
    const active = await env.DB.prepare(
      "SELECT id FROM system_alerts WHERE fingerprint = ? AND status != 'resolved' LIMIT 1",
    )
      .bind(alert.fingerprint)
      .first();
    if (active)
      return NextResponse.json(
        { error: "相同异常已经处于处理中" },
        { status: 409 },
      );
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE system_alerts SET status = 'open', acknowledged_at = NULL, acknowledged_by = NULL, resolved_at = NULL, updated_at = ? WHERE id = ?",
      ).bind(createdAt, eventId),
      env.DB.prepare(
        "INSERT INTO admin_audit_events (id,actor,action,subject_type,subject_id,message,created_at) VALUES (?,?,?,?,?,?,?)",
      ).bind(
        id("audit"),
        actor,
        "alert_reopened",
        "system_alert",
        eventId,
        "采集异常已重新打开",
        createdAt,
      ),
    ]);
  } else if (command === "set_platform_policy") {
    const platform = String(body.platform ?? "");
    if (!["doubao", "qwen", "deepseek"].includes(platform))
      return NextResponse.json({ error: "平台不正确" }, { status: 400 });
    const enabled = body.enabled ? 1 : 0;
    const reason = enabled
      ? null
      : String(body.reason ?? "管理员暂停").slice(0, 300);
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE collection_policies SET enabled = ?, paused_reason = ?, updated_at = ? WHERE platform = ?",
      ).bind(enabled, reason, createdAt, platform),
      env.DB.prepare(
        "INSERT INTO admin_audit_events (id,actor,action,subject_type,subject_id,message,created_at) VALUES (?,?,?,?,?,?,?)",
      ).bind(
        id("audit"),
        actor,
        enabled ? "platform_resumed" : "platform_paused",
        "collection_policy",
        platform,
        enabled
          ? `恢复 ${platform} 官方 API 采集`
          : `暂停 ${platform} 官方 API 采集：${reason}`,
        createdAt,
      ),
    ]);
  } else if (command === "set_emergency_stop") {
    const enabled = Boolean(body.enabled);
    const reason = enabled
      ? String(body.reason ?? "管理员紧急停止").slice(0, 300)
      : null;
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE system_settings SET value_json = ?, updated_at = ?, updated_by = ? WHERE key = 'collector.emergency_stop'",
      ).bind(JSON.stringify({ enabled, reason }), createdAt, actor),
      env.DB.prepare(
        "INSERT INTO admin_audit_events (id,actor,action,subject_type,subject_id,message,created_at) VALUES (?,?,?,?,?,?,?)",
      ).bind(
        id("audit"),
        actor,
        enabled ? "collector_emergency_stopped" : "collector_emergency_resumed",
        "system_setting",
        "collector.emergency_stop",
        enabled ? `紧急停止全部采集：${reason}` : "恢复全部采集",
        createdAt,
      ),
    ]);
  } else if (command === "set_worker_status") {
    const workerId = String(body.workerId ?? "");
    const status = ["online", "draining", "disabled"].includes(
      String(body.status),
    )
      ? String(body.status)
      : "disabled";
    const worker = await env.DB.prepare(
      "SELECT label FROM collector_workers WHERE id = ?",
    )
      .bind(workerId)
      .first<{ label: string }>();
    if (!worker)
      return NextResponse.json({ error: "采集器不存在" }, { status: 404 });
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE collector_workers SET status = ?, updated_at = ? WHERE id = ?",
      ).bind(status, createdAt, workerId),
      env.DB.prepare(
        "INSERT INTO admin_audit_events (id,actor,action,subject_type,subject_id,message,created_at) VALUES (?,?,?,?,?,?,?)",
      ).bind(
        id("audit"),
        actor,
        "worker_status_updated",
        "collector_worker",
        workerId,
        `${worker.label} 状态更新为 ${status}`,
        createdAt,
      ),
    ]);
  } else {
    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  }

  return NextResponse.json({
    ...(await dashboard()),
    currentUser: user,
    ...commandResult,
  });
}
