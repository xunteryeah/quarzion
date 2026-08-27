import { env } from "@/db/runtime";
import { NextRequest, NextResponse } from "next/server";
import { ensureDatabase } from "@/db/bootstrap";
import {
  classifyFailure,
  decodeBase64,
  normalizeWorkerId,
  recordAlert,
  retryAt,
  safePublicUrl,
  sha256,
  type Platform,
} from "@/lib/collection";
import { collectorAuthorized } from "@/lib/collector-auth";
import {
  extractUrls,
  inferSourceType,
  parseBrandMentions,
  type ParserBrand,
} from "@/lib/parser";

type CitationInput =
  | string
  | {
      url: string;
      title?: string;
      sourceType?: string;
      snippet?: string;
      providerSourceId?: string;
      index?: number;
      metadata?: Record<string, unknown>;
    };
type RunRow = {
  id: string;
  organizationId: string;
  projectId: string;
  promptId: string;
  platform: Platform;
  status: string;
  attempt: number;
  maxAttempts: number;
  workerId: string | null;
  leaseTokenHash: string | null;
  responseSha256: string | null;
  resultKey: string | null;
  baseRetrySeconds: number;
};

function limited(value: unknown, max: number) {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

function evidenceMime(value: unknown) {
  const mime = String(value ?? "image/webp").toLowerCase();
  return ["image/png", "image/webp", "image/jpeg"].includes(mime) ? mime : null;
}

export async function POST(request: NextRequest) {
  if (!collectorAuthorized(request))
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 2_500_000)
    return NextResponse.json(
      { error: "回传内容超过 2.5MB 限制" },
      { status: 413 },
    );
  try {
    await ensureDatabase();
    const body = (await request.json()) as Record<string, unknown>;
    const runId = limited(body.runId, 120);
    const workerId = normalizeWorkerId(body.workerId);
    const leaseToken = limited(body.leaseToken, 256);
    if (!runId || !workerId || !leaseToken)
      return NextResponse.json(
        { error: "缺少 runId、workerId 或 leaseToken" },
        { status: 400 },
      );
    const run = await env.DB.prepare(
      `SELECT r.id, r.organization_id AS organizationId, r.project_id AS projectId, r.prompt_id AS promptId, r.platform, r.status, r.attempt, r.max_attempts AS maxAttempts, r.worker_id AS workerId, r.lease_token_hash AS leaseTokenHash, r.response_sha256 AS responseSha256, r.result_key AS resultKey, cp.base_retry_seconds AS baseRetrySeconds
      FROM runs r JOIN collection_policies cp ON cp.platform = r.platform WHERE r.id = ?`,
    )
      .bind(runId)
      .first<RunRow>();
    if (!run)
      return NextResponse.json({ error: "运行不存在" }, { status: 404 });
    const rawText = limited(body.rawText, 200_000);
    const responseHash = rawText ? await sha256(rawText) : null;
    if (
      run.status === "parsed" &&
      responseHash &&
      run.responseSha256 === responseHash
    ) {
      const answer = await env.DB.prepare(
        "SELECT id FROM answers WHERE run_id = ?",
      )
        .bind(runId)
        .first<{ id: string }>();
      return NextResponse.json({
        ok: true,
        idempotent: true,
        runId,
        answerId: answer?.id ?? null,
        status: "parsed",
      });
    }
    const leaseHash = await sha256(leaseToken);
    if (
      run.status !== "running" ||
      run.workerId !== workerId ||
      run.leaseTokenHash !== leaseHash
    )
      return NextResponse.json(
        { error: "租约无效、过期或不属于该采集器" },
        { status: 409 },
      );
    const now = new Date().toISOString();
    const durationMs =
      Math.max(0, Math.min(900_000, Number(body.durationMs ?? 0) || 0)) || null;
    const modelVersion = limited(body.modelVersion, 120) || null;
    const modelTier = ["flagship", "secondary", "analysis"].includes(
      String(body.modelTier),
    )
      ? String(body.modelTier)
      : null;
    const responseMode =
      body.responseMode === "web_search" ? "web_search" : "direct";
    const providerRequestId = limited(body.providerRequestId, 240) || null;
    const requestHash = /^[a-f0-9]{64}$/.test(String(body.requestSha256 ?? ""))
      ? String(body.requestSha256)
      : null;
    const providerResponseHash = /^[a-f0-9]{64}$/.test(
      String(body.providerResponseSha256 ?? ""),
    )
      ? String(body.providerResponseSha256)
      : null;
    const rawResponseJson = limited(body.rawResponseJson, 1_000_000) || null;
    const searchPerformed = body.searchPerformed === true ? 1 : 0;
    const usage =
      body.usage && typeof body.usage === "object"
        ? (body.usage as Record<string, unknown>)
        : {};
    const inputTokens = Math.max(0, Number(usage.inputTokens ?? 0) || 0);
    const outputTokens = Math.max(0, Number(usage.outputTokens ?? 0) || 0);
    const reasoningTokens = Math.max(
      0,
      Number(usage.reasoningTokens ?? 0) || 0,
    );
    const cachedTokens = Math.max(0, Number(usage.cachedTokens ?? 0) || 0);
    const costMicros =
      body.costMicros == null
        ? null
        : Math.max(0, Number(body.costMicros) || 0);
    const capabilitySnapshot =
      body.capabilitySnapshot && typeof body.capabilitySnapshot === "object"
        ? body.capabilitySnapshot
        : {};
    const collectorVersion = limited(body.collectorVersion, 120) || null;
    const pageFingerprint = limited(body.pageFingerprint, 128) || null;
    const errorMessage = limited(body.errorMessage, 2000);
    const declaredFailure =
      body.status === "failed" ||
      body.status === "timeout" ||
      body.status === "blocked" ||
      Boolean(errorMessage);
    const sourceUrl = safePublicUrl(body.sourceUrl, run.platform);
    const title = limited(body.pageTitle, 300) || null;
    const screenshotMime = body.screenshotBase64
      ? evidenceMime(body.screenshotMime)
      : null;
    if (body.screenshotBase64 && !screenshotMime)
      return NextResponse.json(
        { error: "截图只允许 PNG、WebP 或 JPEG" },
        { status: 400 },
      );
    const screenshot = body.screenshotBase64
      ? decodeBase64(String(body.screenshotBase64), 750_000)
      : null;
    const htmlText = limited(body.htmlEvidence, 250_000);
    const htmlBytes = htmlText ? new TextEncoder().encode(htmlText) : null;
    const screenshotHash = screenshot ? await sha256(screenshot) : null;
    const htmlHash = htmlBytes ? await sha256(htmlBytes) : null;

    if (declaredFailure) {
      const failure = classifyFailure(
        errorMessage || "采集失败",
        limited(body.failureCode, 80),
      );
      const shouldRetry =
        failure.retryable && Number(run.attempt) < Number(run.maxAttempts);
      const terminalStatus =
        failure.category === "verification" ||
        failure.category === "platform_block" ||
        failure.category === "page_change"
          ? "blocked"
          : "failed";
      const next = shouldRetry
        ? retryAt(Number(run.attempt), Number(run.baseRetrySeconds))
        : null;
      const statements = [
        env.DB.prepare(
          `UPDATE runs SET status = ?, attempt = attempt + ?, duration_ms = ?, error_message = ?, failure_code = ?, failure_category = ?, model_version = COALESCE(?, model_version), model_tier = COALESCE(?, model_tier), response_mode = ?, collector_version = COALESCE(?, collector_version), provider_request_id = COALESCE(?, provider_request_id), page_title = COALESCE(?, page_title), source_url = COALESCE(?, source_url), next_attempt_at = ?, completed_at = CASE WHEN ? = 0 THEN ? ELSE NULL END, worker_id = NULL, lease_token_hash = NULL, lease_expires_at = NULL, last_heartbeat_at = ? WHERE id = ? AND worker_id = ? AND lease_token_hash = ?`,
        ).bind(
          shouldRetry ? "queued" : terminalStatus,
          shouldRetry ? 1 : 0,
          durationMs,
          errorMessage || "采集失败",
          failure.code,
          failure.category,
          modelVersion,
          modelTier,
          responseMode,
          collectorVersion,
          providerRequestId,
          title,
          sourceUrl,
          next,
          shouldRetry ? 1 : 0,
          now,
          now,
          runId,
          workerId,
          leaseHash,
        ),
        env.DB.prepare(
          "UPDATE run_attempts SET status = 'failed', completed_at = ?, duration_ms = ?, failure_code = ?, failure_category = ?, error_message = ?, page_fingerprint = ?, model_version = COALESCE(?, model_version), collector_version = COALESCE(?, collector_version) WHERE run_id = ? AND attempt_number = ?",
        ).bind(
          now,
          durationMs,
          failure.code,
          failure.category,
          errorMessage || "采集失败",
          pageFingerprint,
          modelVersion,
          collectorVersion,
          runId,
          run.attempt,
        ),
        env.DB.prepare(
          "UPDATE collector_workers SET current_run_id = NULL, last_seen_at = ?, updated_at = ? WHERE id = ?",
        ).bind(now, now, workerId),
        env.DB.prepare(
          "INSERT INTO audit_events (id, organization_id, project_id, event_type, subject_type, subject_id, message, created_at) VALUES (?, ?, ?, 'run_failed', 'run', ?, ?, ?)",
        ).bind(
          crypto.randomUUID(),
          run.organizationId,
          run.projectId,
          runId,
          `${failure.code}: ${errorMessage || "采集失败"}${shouldRetry ? `；将在 ${next} 重试` : ""}`,
          now,
        ),
      ];
      if (screenshot && screenshotHash && screenshotMime)
        statements.push(
          env.DB.prepare(
            "INSERT OR IGNORE INTO evidence_artifacts (id, organization_id, project_id, run_id, answer_id, kind, mime_type, content, sha256, byte_size, source_url, captured_at, created_at) VALUES (?, ?, ?, ?, NULL, 'screenshot', ?, ?, ?, ?, ?, ?, ?)",
          ).bind(
            crypto.randomUUID(),
            run.organizationId,
            run.projectId,
            runId,
            screenshotMime,
            screenshot,
            screenshotHash,
            screenshot.byteLength,
            sourceUrl,
            now,
            now,
          ),
        );
      if (htmlBytes && htmlHash)
        statements.push(
          env.DB.prepare(
            "INSERT OR IGNORE INTO evidence_artifacts (id, organization_id, project_id, run_id, answer_id, kind, mime_type, content, sha256, byte_size, source_url, captured_at, created_at) VALUES (?, ?, ?, ?, NULL, 'html', 'text/html; charset=utf-8', ?, ?, ?, ?, ?, ?)",
          ).bind(
            crypto.randomUUID(),
            run.organizationId,
            run.projectId,
            runId,
            htmlBytes,
            htmlHash,
            htmlBytes.byteLength,
            sourceUrl,
            now,
            now,
          ),
        );
      await env.DB.batch(statements);
      await recordAlert({
        organizationId: run.organizationId,
        projectId: run.projectId,
        runId,
        platform: run.platform,
        kind: failure.category,
        severity: failure.severity,
        fingerprint: `${failure.code}:${run.platform}:${run.projectId}`,
        message: `${run.platform} 采集失败：${errorMessage || failure.code}`,
        metadata: {
          failureCode: failure.code,
          attempt: run.attempt,
          retryAt: next,
          workerId,
        },
      });
      return NextResponse.json({
        ok: true,
        runId,
        status: shouldRetry ? "retry_scheduled" : terminalStatus,
        failureCode: failure.code,
        retryAt: next,
        evidence: { screenshot: Boolean(screenshot), html: Boolean(htmlBytes) },
      });
    }

    if (!rawText)
      return NextResponse.json(
        { error: "成功运行必须包含 rawText" },
        { status: 400 },
      );
    if (!sourceUrl)
      return NextResponse.json(
        { error: "sourceUrl 不是对应平台的公开网页" },
        { status: 400 },
      );
    const brandRows = (
      await env.DB.prepare(
        "SELECT id, name, canonical_name AS canonicalName, is_primary AS isPrimary FROM brands WHERE organization_id = ? AND project_id = ? AND status = 'active'",
      )
        .bind(run.organizationId, run.projectId)
        .all<ParserBrand>()
    ).results;
    const aliasRows = (
      await env.DB.prepare(
        "SELECT brand_id AS brandId, alias FROM brand_aliases WHERE organization_id = ? AND project_id = ? AND status = 'approved'",
      )
        .bind(run.organizationId, run.projectId)
        .all<{ brandId: string; alias: string }>()
    ).results;
    const brands = brandRows.map((brand) => ({
      ...brand,
      aliases: aliasRows
        .filter((alias) => alias.brandId === brand.id)
        .map((alias) => alias.alias),
    }));
    const mentions = parseBrandMentions(rawText, brands);
    const primary = mentions.find((mention) => mention.isPrimary);
    const existing = await env.DB.prepare(
      "SELECT id FROM answers WHERE run_id = ?",
    )
      .bind(runId)
      .first<{ id: string }>();
    const answerId = existing?.id ?? crypto.randomUUID();
    const suppliedCitations = Array.isArray(body.citations)
      ? (body.citations.slice(0, 100) as CitationInput[])
      : [];
    const citationInputs = suppliedCitations.length
      ? suppliedCitations
      : extractUrls(rawText);
    const seenUrls = new Set<string>();
    const citations = citationInputs
      .map((item) => (typeof item === "string" ? { url: item } : item))
      .map((item) => ({ ...item, url: safePublicUrl(item.url) }))
      .filter(
        (item): item is Exclude<CitationInput, string> & { url: string } =>
          Boolean(item.url) &&
          !seenUrls.has(item.url!) &&
          Boolean(seenUrls.add(item.url!)),
      );
    const resultKey = `${runId}:${responseHash}`;

    const statements = [
      env.DB.prepare(
        "UPDATE runs SET status = 'parsed', duration_ms = ?, raw_text = ?, raw_response_json = ?, error_message = NULL, failure_code = NULL, failure_category = NULL, model_version = COALESCE(?, model_version), model_tier = COALESCE(?, model_tier), response_mode = ?, collector_version = COALESCE(?, collector_version), provider_request_id = ?, request_sha256 = ?, provider_response_sha256 = ?, search_performed = ?, search_metadata_json = ?, capability_snapshot_json = ?, input_tokens = ?, output_tokens = ?, reasoning_tokens = ?, cached_tokens = ?, cost_micros = ?, page_title = ?, source_url = ?, response_sha256 = ?, result_key = ?, parsed_at = ?, completed_at = ?, next_attempt_at = NULL, worker_id = NULL, lease_token_hash = NULL, lease_expires_at = NULL, last_heartbeat_at = ? WHERE id = ? AND worker_id = ? AND lease_token_hash = ?",
      ).bind(
        durationMs,
        rawText,
        rawResponseJson,
        modelVersion,
        modelTier,
        responseMode,
        collectorVersion,
        providerRequestId,
        requestHash,
        providerResponseHash,
        searchPerformed,
        JSON.stringify({ citationCount: citations.length }),
        JSON.stringify(capabilitySnapshot),
        inputTokens,
        outputTokens,
        reasoningTokens,
        cachedTokens,
        costMicros,
        title,
        sourceUrl,
        responseHash,
        resultKey,
        now,
        now,
        now,
        runId,
        workerId,
        leaseHash,
      ),
      env.DB.prepare(
        `INSERT INTO answers (id, organization_id, project_id, run_id, answer_text, mentions_primary, primary_position, sentiment_score, parser_version, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'entity-parser/2.0', ?) ON CONFLICT(run_id) DO UPDATE SET answer_text = excluded.answer_text, mentions_primary = excluded.mentions_primary, primary_position = excluded.primary_position, sentiment_score = excluded.sentiment_score, parser_version = excluded.parser_version, created_at = excluded.created_at`,
      ).bind(
        answerId,
        run.organizationId,
        run.projectId,
        runId,
        rawText,
        primary ? 1 : 0,
        primary?.position ?? null,
        primary?.sentimentScore ?? null,
        now,
      ),
      env.DB.prepare(
        "DELETE FROM answer_brand_mentions WHERE answer_id = ?",
      ).bind(answerId),
      env.DB.prepare("DELETE FROM citations WHERE answer_id = ?").bind(
        answerId,
      ),
      env.DB.prepare("DELETE FROM evidence_artifacts WHERE run_id = ?").bind(
        runId,
      ),
    ];
    for (const mention of mentions)
      statements.push(
        env.DB.prepare(
          "INSERT INTO answer_brand_mentions (id, organization_id, project_id, answer_id, brand_id, position, mention_count, sentiment_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ).bind(
          crypto.randomUUID(),
          run.organizationId,
          run.projectId,
          answerId,
          mention.brandId,
          mention.position,
          mention.mentionCount,
          mention.sentimentScore,
        ),
      );
    for (const citation of citations) {
      const url = new URL(citation.url);
      statements.push(
        env.DB.prepare(
          "INSERT INTO citations (id, organization_id, project_id, answer_id, url, domain, title, source_type, mentions_primary, citation_index, snippet, provider_source_id, metadata_json, first_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ).bind(
          crypto.randomUUID(),
          run.organizationId,
          run.projectId,
          answerId,
          citation.url,
          url.hostname.replace(/^www\./, ""),
          limited(citation.title, 500) || url.hostname,
          limited(citation.sourceType, 100) || inferSourceType(url.hostname),
          primary ? 1 : 0,
          Math.max(
            1,
            Number(citation.index ?? citations.indexOf(citation) + 1),
          ),
          limited(citation.snippet, 2000) || null,
          limited(citation.providerSourceId, 240) || null,
          JSON.stringify(citation.metadata ?? {}),
          now,
        ),
      );
    }
    if (screenshot && screenshotHash && screenshotMime)
      statements.push(
        env.DB.prepare(
          "INSERT INTO evidence_artifacts (id, organization_id, project_id, run_id, answer_id, kind, mime_type, content, sha256, byte_size, source_url, captured_at, created_at) VALUES (?, ?, ?, ?, ?, 'screenshot', ?, ?, ?, ?, ?, ?, ?)",
        ).bind(
          crypto.randomUUID(),
          run.organizationId,
          run.projectId,
          runId,
          answerId,
          screenshotMime,
          screenshot,
          screenshotHash,
          screenshot.byteLength,
          sourceUrl,
          now,
          now,
        ),
      );
    if (htmlBytes && htmlHash)
      statements.push(
        env.DB.prepare(
          "INSERT INTO evidence_artifacts (id, organization_id, project_id, run_id, answer_id, kind, mime_type, content, sha256, byte_size, source_url, captured_at, created_at) VALUES (?, ?, ?, ?, ?, 'html', 'text/html; charset=utf-8', ?, ?, ?, ?, ?, ?)",
        ).bind(
          crypto.randomUUID(),
          run.organizationId,
          run.projectId,
          runId,
          answerId,
          htmlBytes,
          htmlHash,
          htmlBytes.byteLength,
          sourceUrl,
          now,
          now,
        ),
      );
    statements.push(
      env.DB.prepare(
        "UPDATE run_attempts SET status = 'completed', completed_at = ?, duration_ms = ?, page_fingerprint = ?, model_version = COALESCE(?, model_version), collector_version = COALESCE(?, collector_version) WHERE run_id = ? AND attempt_number = ?",
      ).bind(
        now,
        durationMs,
        pageFingerprint,
        modelVersion,
        collectorVersion,
        runId,
        run.attempt,
      ),
      env.DB.prepare(
        "UPDATE collector_workers SET current_run_id = NULL, last_seen_at = ?, updated_at = ? WHERE id = ?",
      ).bind(now, now, workerId),
      env.DB.prepare(
        "INSERT INTO audit_events (id, organization_id, project_id, event_type, subject_type, subject_id, message, created_at) VALUES (?, ?, ?, 'run_parsed', 'run', ?, ?, ?)",
      ).bind(
        crypto.randomUUID(),
        run.organizationId,
        run.projectId,
        runId,
        `官方 API 回答已入库：${mentions.length} 个品牌实体，${citations.length} 条引用${providerRequestId ? "，已记录请求 ID" : ""}`,
        now,
      ),
    );
    await env.DB.batch(statements);
    return NextResponse.json({
      ok: true,
      runId,
      answerId,
      mentions: mentions.length,
      citations: citations.length,
      evidence: { screenshot: Boolean(screenshot), html: Boolean(htmlBytes) },
      responseSha256: responseHash,
      status: "parsed",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "回传失败" },
      { status: 500 },
    );
  }
}
