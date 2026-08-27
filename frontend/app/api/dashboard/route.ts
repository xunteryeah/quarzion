import { env } from "@/db/runtime";
import { NextRequest, NextResponse } from "next/server";
import { ensureDatabase } from "@/db/bootstrap";
import { average, calculateAnswerMetrics, rate } from "@/lib/metrics";
import { CustomerSession, getRequestSession } from "@/lib/auth";
import { hasPermission, permissionForDashboardCommand, projectAccess } from "@/lib/authorization";
import { isPlatform, PLATFORMS, PLATFORM_PROFILES, type Platform } from "@/lib/collection";

type Row = Record<string, unknown>;

function rows<T extends Row>(result: D1Result<T>) {
  return result.results ?? [];
}

function jsonArray(value: unknown): string[] {
  try {
    return JSON.parse(String(value ?? "[]"));
  } catch {
    return [];
  }
}

function normalize<T extends Row>(items: T[]) {
  return items.map((item) => {
    const next = { ...item };
    for (const key of ["targetPlatforms", "targetPromptIds"]) {
      if (key in next) next[key as keyof T] = jsonArray(next[key]) as T[keyof T];
    }
    return next;
  });
}

async function fetchDashboard(session: CustomerSession, projectId?: string | null) {
  const projects = rows(await env.DB.prepare(`SELECT p.id, p.organization_id AS organizationId, p.name, o.name AS clientName, p.region, p.language, p.created_at AS createdAt, m.role
      FROM projects p JOIN organizations o ON o.id = p.organization_id
      JOIN organization_members m ON m.organization_id = p.organization_id
      WHERE m.user_id = ? AND m.status = 'active' AND o.status = 'active' AND p.status != 'archived'
      ORDER BY p.created_at`).bind(session.userId).all());
  const selectedProjectId = projectId && projects.some((project) => project.id === projectId) ? projectId : String(projects[0]?.id ?? "");
  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const selectedOrganizationId = String(selectedProject?.organizationId ?? "");

  const [brandResult, promptResult, runResult, answerResult, mentionResult, citationResult, aliasResult, actionResult, auditResult, artifactResult] = await Promise.all([
    env.DB.prepare("SELECT id, name, canonical_name AS canonicalName, website, is_primary AS isPrimary, status FROM brands WHERE organization_id = ? AND project_id = ? ORDER BY is_primary DESC, name").bind(selectedOrganizationId, selectedProjectId).all(),
    env.DB.prepare(`SELECT p.id, p.query_text AS queryText, p.intent, p.is_branded AS isBranded, p.target_platforms AS targetPlatforms, p.active, p.created_at AS createdAt, COALESCE(t.name, '未分类') AS topic FROM prompts p LEFT JOIN topics t ON t.id = p.topic_id WHERE p.organization_id = ? AND p.project_id = ? ORDER BY p.created_at, p.id`).bind(selectedOrganizationId, selectedProjectId).all(),
    env.DB.prepare(`SELECT r.id, r.prompt_id AS promptId, p.query_text AS queryText, r.platform, r.region, r.model_version AS modelVersion, r.model_tier AS modelTier, r.response_mode AS responseMode, r.search_performed AS searchPerformed, r.provider_request_id AS providerRequestId, r.input_tokens AS inputTokens, r.output_tokens AS outputTokens, r.reasoning_tokens AS reasoningTokens, r.cached_tokens AS cachedTokens, r.cost_micros AS costMicros, r.scheduled_at AS scheduledAt, r.status, r.attempt, r.duration_ms AS durationMs, r.collector_version AS collectorVersion, r.raw_text AS rawText, r.error_message AS errorMessage, r.failure_code AS failureCode, r.failure_category AS failureCategory, r.source_url AS sourceUrl, r.page_title AS pageTitle, r.response_sha256 AS responseSha256, r.execution_mode AS executionMode, r.started_at AS startedAt, r.completed_at AS completedAt, r.parsed_at AS parsedAt FROM runs r JOIN prompts p ON p.id = r.prompt_id WHERE r.organization_id = ? AND r.project_id = ? ORDER BY r.scheduled_at DESC`).bind(selectedOrganizationId, selectedProjectId).all(),
    env.DB.prepare(`SELECT a.id, a.run_id AS runId, r.prompt_id AS promptId, p.query_text AS queryText, r.platform, a.answer_text AS answerText, a.mentions_primary AS mentionsPrimary, a.primary_position AS primaryPosition, a.sentiment_score AS sentimentScore, a.parser_version AS parserVersion, a.created_at AS createdAt FROM answers a JOIN runs r ON r.id = a.run_id JOIN prompts p ON p.id = r.prompt_id WHERE a.organization_id = ? AND a.project_id = ? ORDER BY a.created_at DESC`).bind(selectedOrganizationId, selectedProjectId).all(),
    env.DB.prepare(`SELECT m.id, m.answer_id AS answerId, m.brand_id AS brandId, b.name AS brandName, b.is_primary AS isPrimary, m.position, m.mention_count AS mentionCount, m.sentiment_score AS sentimentScore FROM answer_brand_mentions m JOIN brands b ON b.id = m.brand_id JOIN answers a ON a.id = m.answer_id WHERE a.organization_id = ? AND a.project_id = ? ORDER BY m.answer_id, m.position`).bind(selectedOrganizationId, selectedProjectId).all(),
    env.DB.prepare("SELECT id, answer_id AS answerId, url, domain, title, source_type AS sourceType, mentions_primary AS mentionsPrimary, citation_index AS citationIndex, snippet, provider_source_id AS providerSourceId, first_seen_at AS firstSeenAt FROM citations WHERE organization_id = ? AND project_id = ? ORDER BY first_seen_at DESC, citation_index").bind(selectedOrganizationId, selectedProjectId).all(),
    env.DB.prepare(`SELECT a.id, a.brand_id AS brandId, b.name AS brandName, a.alias, a.status, a.detected_count AS detectedCount, a.source, a.reviewed_at AS reviewedAt, a.created_at AS createdAt FROM brand_aliases a JOIN brands b ON b.id = a.brand_id WHERE a.organization_id = ? AND a.project_id = ? ORDER BY CASE a.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, a.detected_count DESC`).bind(selectedOrganizationId, selectedProjectId).all(),
    env.DB.prepare("SELECT id, title, description, status, priority, owner, target_platforms AS targetPlatforms, target_prompt_ids AS targetPromptIds, published_url AS publishedUrl, completed_at AS completedAt, created_at AS createdAt FROM optimization_actions WHERE organization_id = ? AND project_id = ? ORDER BY created_at DESC").bind(selectedOrganizationId, selectedProjectId).all(),
    env.DB.prepare("SELECT id, event_type AS eventType, subject_type AS subjectType, subject_id AS subjectId, message, created_at AS createdAt FROM audit_events WHERE organization_id = ? AND project_id = ? ORDER BY created_at DESC LIMIT 30").bind(selectedOrganizationId, selectedProjectId).all(),
    env.DB.prepare("SELECT id, run_id AS runId, answer_id AS answerId, kind, mime_type AS mimeType, sha256, byte_size AS byteSize, source_url AS sourceUrl, captured_at AS capturedAt FROM evidence_artifacts WHERE organization_id = ? AND project_id = ? ORDER BY captured_at DESC").bind(selectedOrganizationId, selectedProjectId).all(),
  ]);

  const brands = rows(brandResult);
  const prompts = normalize(rows(promptResult));
  const runs = rows(runResult);
  const answers = rows(answerResult);
  const mentions = rows(mentionResult);
  const citations = rows(citationResult);
  const aliases = rows(aliasResult);
  const actions = normalize(rows(actionResult));
  const audit = rows(auditResult);
  const artifacts = rows(artifactResult);
  const answerMetrics = calculateAnswerMetrics(answers.map((answer) => ({ mentionsPrimary: Number(answer.mentionsPrimary), primaryPosition: answer.primaryPosition == null ? null : Number(answer.primaryPosition), sentimentScore: answer.sentimentScore == null ? null : Number(answer.sentimentScore) })));
  const trendBuckets = new Map<string, typeof answers>();
  for (const answer of answers) {
    const date = String(answer.createdAt ?? "").slice(0, 10);
    if (date) trendBuckets.set(date, [...(trendBuckets.get(date) ?? []), answer]);
  }
  const trend = [...trendBuckets.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([date, dateAnswers]) => ({
    date,
    ...calculateAnswerMetrics(dateAnswers.map((answer) => ({ mentionsPrimary: Number(answer.mentionsPrimary), primaryPosition: answer.primaryPosition == null ? null : Number(answer.primaryPosition), sentimentScore: answer.sentimentScore == null ? null : Number(answer.sentimentScore) }))),
  }));
  const primaryMentionCount = mentions.filter((mention) => Number(mention.isPrimary) === 1).reduce((sum, mention) => sum + Number(mention.mentionCount), 0);
  const allMentionCount = mentions.reduce((sum, mention) => sum + Number(mention.mentionCount), 0);
  const citedAnswerIds = new Set(citations.map((citation) => String(citation.answerId)));
  const completedRuns = runs.filter((run) => ["parsed", "parse_skipped"].includes(String(run.status))).length;

  const platformStats = PLATFORMS.map((platform) => {
    const platformRuns = runs.filter((run) => run.platform === platform);
    const platformAnswers = answers.filter((answer) => answer.platform === platform);
    const metric = calculateAnswerMetrics(platformAnswers.map((answer) => ({ mentionsPrimary: Number(answer.mentionsPrimary), primaryPosition: answer.primaryPosition == null ? null : Number(answer.primaryPosition), sentimentScore: answer.sentimentScore == null ? null : Number(answer.sentimentScore) })));
    return { platform, runs: platformRuns.length, completionRate: rate(platformAnswers.length, platformRuns.length), ...metric };
  });

  const primaryBrand = brands.find((brand) => Boolean(brand.isPrimary));
  const primaryAnswerIds = new Set(mentions.filter((mention) => mention.brandId === primaryBrand?.id).map((mention) => String(mention.answerId)));
  const brandStats = brands.map((brand) => {
    const brandMentions = mentions.filter((mention) => mention.brandId === brand.id);
    const distinctAnswers = new Set(brandMentions.map((mention) => String(mention.answerId)));
    const brandPlatforms = [...new Set(answers.filter((answer) => distinctAnswers.has(String(answer.id))).map((answer) => String(answer.platform)))];
    return {
      id: brand.id,
      name: brand.name,
      website: brand.website == null ? null : String(brand.website),
      isPrimary: Boolean(brand.isPrimary),
      answers: distinctAnswers.size,
      mentionRate: rate(distinctAnswers.size, answers.length),
      averagePosition: average(brandMentions.map((mention) => Number(mention.position))),
      sentiment: average(brandMentions.map((mention) => Number(mention.sentimentScore))),
      shareOfResponse: rate(brandMentions.reduce((sum, mention) => sum + Number(mention.mentionCount), 0), allMentionCount),
      cooccurrenceRate: Boolean(brand.isPrimary) ? null : rate([...distinctAnswers].filter((answerId) => primaryAnswerIds.has(answerId)).length, answers.length),
      platforms: brandPlatforms,
    };
  }).sort((a, b) => b.mentionRate - a.mentionRate);

  const sourceGroups = new Map<string, typeof citations>();
  for (const citation of citations) sourceGroups.set(String(citation.domain), [...(sourceGroups.get(String(citation.domain)) ?? []), citation]);
  const sourceStats = [...sourceGroups.entries()].map(([domain, domainCitations]) => {
    const domainAnswers = new Set(domainCitations.map((citation) => String(citation.answerId)));
    const associatedAnswers = new Set(domainCitations.filter((citation) => Number(citation.mentionsPrimary) === 1).map((citation) => String(citation.answerId)));
    const answerIds = new Set(domainCitations.map((citation) => String(citation.answerId)));
    const sourcePlatforms = [...new Set(answers.filter((answer) => answerIds.has(String(answer.id))).map((answer) => String(answer.platform)))];
    const sourceBrands = new Set(mentions.filter((mention) => answerIds.has(String(mention.answerId))).map((mention) => String(mention.brandId)));
    return {
      domain,
      sourceType: domainCitations[0]?.sourceType,
      citations: domainCitations.length,
      answersWithDomain: domainAnswers.size,
      domainRate: rate(domainAnswers.size, answers.length),
      primaryAssociatedRate: rate(associatedAnswers.size, domainAnswers.size),
      primaryAssociatedAnswers: associatedAnswers.size,
      uniqueUrls: new Set(domainCitations.map((citation) => String(citation.url))).size,
      platforms: sourcePlatforms,
      brandCount: sourceBrands.size,
    };
  }).sort((a, b) => b.answersWithDomain - a.answersWithDomain || b.citations - a.citations);

  const promptStats = prompts.map((prompt) => {
    const promptAnswers = answers.filter((answer) => answer.promptId === prompt.id);
    const promptRuns = runs.filter((run) => run.promptId === prompt.id);
    return { ...prompt, runs: promptRuns.length, completionRate: rate(promptAnswers.length, promptRuns.length), ...calculateAnswerMetrics(promptAnswers.map((answer) => ({ mentionsPrimary: Number(answer.mentionsPrimary), primaryPosition: answer.primaryPosition == null ? null : Number(answer.primaryPosition), sentimentScore: answer.sentimentScore == null ? null : Number(answer.sentimentScore) }))) };
  });

  const evidence = actions.length
    ? rows(await env.DB.prepare(`SELECT e.id, e.action_id AS actionId, e.phase, e.platform, e.prompt_id AS promptId, e.answers_count AS answersCount, e.mention_rate AS mentionRate, e.avg_position AS avgPosition, e.citation_count AS citationCount, e.recorded_at AS recordedAt FROM evidence_snapshots e JOIN optimization_actions a ON a.id = e.action_id WHERE a.organization_id = ? AND a.project_id = ? ORDER BY e.recorded_at`).bind(selectedOrganizationId, selectedProjectId).all())
    : [];

  return {
    projects,
    selectedProjectId,
    currentUser: { id: session.userId, email: session.email, displayName: session.displayName, role: selectedProject?.role ?? null },
    generatedAt: new Date().toISOString(),
    summary: {
      ...answerMetrics,
      scheduledRuns: runs.length,
      completedRuns,
      runCompletionRate: rate(completedRuns, runs.length),
      failedRuns: runs.filter((run) => ["failed", "timeout", "blocked", "parse_failed"].includes(String(run.status))).length,
      shareOfResponse: rate(primaryMentionCount, allMentionCount),
      citationCoverage: rate(citedAnswerIds.size, answers.length),
      citations: citations.length,
      pendingAliases: aliases.filter((alias) => alias.status === "pending").length,
    },
    platformStats,
    trend,
    brandStats,
    sourceStats,
    prompts: promptStats,
    runs,
    answers,
    mentions,
    citations,
    aliases,
    actions,
    evidence,
    artifacts,
    audit,
  };
}

export async function GET(request: NextRequest) {
  try {
    await ensureDatabase();
    const session = await getRequestSession(request);
    if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    return NextResponse.json(await fetchDashboard(session, request.nextUrl.searchParams.get("projectId")));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "数据加载失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDatabase();
    const session = await getRequestSession(request);
    if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    const body = (await request.json()) as Record<string, unknown>;
    const command = String(body.command ?? "");
    const projectId = String(body.projectId ?? "");
    const now = new Date().toISOString();
    const auditId = crypto.randomUUID();
    const project = await projectAccess(session.userId, projectId);
    if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    const requiredPermission = permissionForDashboardCommand(command);
    if (!requiredPermission) return NextResponse.json({ error: "未知操作" }, { status: 400 });
    if (!hasPermission(project.role, requiredPermission)) return NextResponse.json({ error: "当前角色没有执行此操作的权限" }, { status: 403 });
    const organizationId = project.organizationId;

    if (command === "retry_run") {
      const runId = String(body.runId ?? "");
      await env.DB.batch([
        env.DB.prepare("UPDATE runs SET status = 'queued', attempt = 1, error_message = NULL, failure_code = NULL, failure_category = NULL, next_attempt_at = NULL, completed_at = NULL, worker_id = NULL, lease_token_hash = NULL, lease_expires_at = NULL, scheduled_at = ? WHERE id = ? AND organization_id = ? AND project_id = ? AND status IN ('failed','blocked')").bind(now, runId, organizationId, projectId),
        env.DB.prepare("INSERT INTO audit_events (id, organization_id, project_id, actor_user_id, event_type, subject_type, subject_id, message, created_at) VALUES (?, ?, ?, ?, 'run_retried', 'run', ?, '失败运行已重新进入采集队列', ?)").bind(auditId, organizationId, projectId, session.userId, runId, now),
      ]);
    } else if (command === "review_alias") {
      const aliasId = String(body.aliasId ?? "");
      const status = body.status === "approved" ? "approved" : "rejected";
      await env.DB.batch([
        env.DB.prepare("UPDATE brand_aliases SET status = ?, reviewed_at = ? WHERE id = ? AND organization_id = ? AND project_id = ?").bind(status, now, aliasId, organizationId, projectId),
        env.DB.prepare("INSERT INTO audit_events (id, organization_id, project_id, actor_user_id, event_type, subject_type, subject_id, message, created_at) VALUES (?, ?, ?, ?, ?, 'alias', ?, ?, ?)").bind(auditId, organizationId, projectId, session.userId, `alias_${status}`, aliasId, status === "approved" ? "实体别名已确认；将从后续回答开始参与计算" : "实体候选已驳回，不参与指标计算", now),
      ]);
    } else if (command === "create_action") {
      const id = crypto.randomUUID();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO optimization_actions (id, organization_id, project_id, title, description, status, priority, owner, target_platforms, target_prompt_ids, published_url, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'planned', ?, ?, ?, ?, NULL, NULL, ?, ?)").bind(id, organizationId, projectId, String(body.title ?? "未命名任务"), String(body.description ?? ""), String(body.priority ?? "medium"), String(body.owner ?? "待分配"), JSON.stringify(body.targetPlatforms ?? []), JSON.stringify(body.targetPromptIds ?? []), now, now),
        env.DB.prepare("INSERT INTO audit_events (id, organization_id, project_id, actor_user_id, event_type, subject_type, subject_id, message, created_at) VALUES (?, ?, ?, ?, 'action_created', 'action', ?, '创建新的 GEO 优化任务', ?)").bind(auditId, organizationId, projectId, session.userId, id, now),
      ]);
    } else if (command === "update_action") {
      const actionId = String(body.actionId ?? "");
      const status = String(body.status ?? "planned");
      const publishedUrl = body.publishedUrl ? String(body.publishedUrl) : null;
      await env.DB.batch([
        env.DB.prepare("UPDATE optimization_actions SET status = ?, published_url = COALESCE(?, published_url), completed_at = CASE WHEN ? IN ('published', 'measuring', 'done') THEN COALESCE(completed_at, ?) ELSE completed_at END, updated_at = ? WHERE id = ? AND organization_id = ? AND project_id = ?").bind(status, publishedUrl, status, now, now, actionId, organizationId, projectId),
        env.DB.prepare("INSERT INTO audit_events (id, organization_id, project_id, actor_user_id, event_type, subject_type, subject_id, message, created_at) VALUES (?, ?, ?, ?, 'action_updated', 'action', ?, ?, ?)").bind(auditId, organizationId, projectId, session.userId, actionId, `任务状态更新为 ${status}`, now),
      ]);
    } else if (command === "create_prompt") {
      const promptId = crypto.randomUUID();
      let topic = await env.DB.prepare("SELECT id FROM topics WHERE organization_id = ? AND project_id = ? ORDER BY id LIMIT 1").bind(organizationId, projectId).first<{ id: string }>();
      if (!topic) {
        topic = { id: crypto.randomUUID() };
        await env.DB.prepare("INSERT INTO topics (id, organization_id, project_id, name, created_at) VALUES (?, ?, ?, '自定义监测', ?)").bind(topic.id, organizationId, projectId, now).run();
      }
      await env.DB.batch([
        env.DB.prepare("INSERT INTO prompts (id, organization_id, project_id, topic_id, query_text, intent, is_branded, target_platforms, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)").bind(promptId, organizationId, projectId, topic.id, String(body.queryText ?? ""), String(body.intent ?? "自定义"), body.isBranded ? 1 : 0, JSON.stringify(body.targetPlatforms ?? [...PLATFORMS]), now, now),
        env.DB.prepare("INSERT INTO audit_events (id, organization_id, project_id, actor_user_id, event_type, subject_type, subject_id, message, created_at) VALUES (?, ?, ?, ?, 'prompt_created', 'prompt', ?, '新增监测提示词', ?)").bind(auditId, organizationId, projectId, session.userId, promptId, now),
      ]);
    } else if (command === "update_project") {
      const primaryBrand = await env.DB.prepare("SELECT id FROM brands WHERE organization_id = ? AND project_id = ? AND is_primary = 1 LIMIT 1").bind(organizationId, projectId).first<{ id: string }>();
      const statements = [
        env.DB.prepare("UPDATE projects SET name = ?, region = ?, language = ?, updated_at = ? WHERE id = ? AND organization_id = ?").bind(String(body.name ?? "未命名项目"), String(body.region ?? "CN"), String(body.language ?? "zh-CN"), now, projectId, organizationId),
        env.DB.prepare("INSERT INTO audit_events (id, organization_id, project_id, actor_user_id, event_type, subject_type, subject_id, message, created_at) VALUES (?, ?, ?, ?, 'project_updated', 'project', ?, '项目与主品牌设置已更新', ?)").bind(auditId, organizationId, projectId, session.userId, projectId, now),
      ];
      if (primaryBrand) statements.push(env.DB.prepare("UPDATE brands SET name = ?, canonical_name = ?, website = ?, updated_at = ? WHERE id = ?").bind(String(body.brandName ?? "主品牌"), String(body.brandName ?? "主品牌"), String(body.website ?? ""), now, primaryBrand.id));
      await env.DB.batch(statements);
    } else if (command === "queue_batch") {
      const activePrompts = rows(await env.DB.prepare("SELECT id, target_platforms AS targetPlatforms FROM prompts WHERE organization_id = ? AND project_id = ? AND active = 1").bind(organizationId, projectId).all());
      const modelRows = rows(await env.DB.prepare("SELECT provider, model_id AS modelId, tier, supports_direct AS supportsDirect, supports_web_search AS supportsWebSearch FROM provider_models WHERE enabled = 1 ORDER BY provider, CASE tier WHEN 'flagship' THEN 0 ELSE 1 END").all());
      const bucket = now.slice(0, 10);
      const batch = [];
      for (const prompt of activePrompts) {
        for (const platform of jsonArray(prompt.targetPlatforms)) {
          if (!isPlatform(platform)) continue;
          const models = modelRows.filter((model) => model.provider === platform);
          for (const model of models) {
            const modes = [Number(model.supportsDirect) === 1 ? "direct" : null, Number(model.supportsWebSearch) === 1 ? "web_search" : null].filter((mode): mode is "direct" | "web_search" => Boolean(mode));
            for (const mode of modes) {
              const id = crypto.randomUUID();
              batch.push(env.DB.prepare("INSERT OR IGNORE INTO runs (id, organization_id, project_id, prompt_id, platform, region, model_version, model_tier, response_mode, execution_mode, source_url, scheduled_at, status, attempt, collector_version, unique_run_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'official_api', ?, ?, 'queued', 1, 'quarzion-api-worker/2.0.0', ?, ?)").bind(id, organizationId, projectId, String(prompt.id), platform, String(project.region ?? "CN"), String(model.modelId), String(model.tier), mode, PLATFORM_PROFILES[platform as Platform].url, now, `${projectId}:${String(prompt.id)}:${platform}:${String(model.modelId)}:${mode}:${bucket}`, now));
            }
          }
        }
      }
      batch.push(env.DB.prepare("INSERT INTO audit_events (id, organization_id, project_id, actor_user_id, event_type, subject_type, subject_id, message, created_at) VALUES (?, ?, ?, ?, 'batch_queued', 'project', ?, ?, ?)").bind(auditId, organizationId, projectId, session.userId, projectId, `${batch.length} 个平台运行已进入队列`, now));
      await env.DB.batch(batch);
    } else {
      return NextResponse.json({ error: "未知操作" }, { status: 400 });
    }

    return NextResponse.json(await fetchDashboard(session, projectId));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "操作失败" }, { status: 500 });
  }
}
