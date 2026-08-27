import { env } from "@/db/runtime";
import { ensureDatabase } from "@/db/bootstrap";
import { getRequestSession } from "@/lib/auth";
import { projectAccess } from "@/lib/authorization";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  await ensureDatabase();
  const session = await getRequestSession(request);
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const { id } = await context.params;
  const artifact = await env.DB.prepare("SELECT id, organization_id AS organizationId, project_id AS projectId, kind, mime_type AS mimeType, content, sha256, captured_at AS capturedAt FROM evidence_artifacts WHERE id = ?").bind(id).first<{ id: string; organizationId: string; projectId: string; kind: string; mimeType: string; content: Uint8Array; sha256: string; capturedAt: string }>();
  if (!artifact) return NextResponse.json({ error: "证据不存在" }, { status: 404 });
  const access = await projectAccess(session.userId, artifact.projectId);
  if (!access || access.organizationId !== artifact.organizationId) return NextResponse.json({ error: "无权读取该证据" }, { status: 403 });
  await env.DB.prepare("INSERT INTO audit_events (id, organization_id, project_id, actor_user_id, event_type, subject_type, subject_id, message, created_at) VALUES (?, ?, ?, ?, 'evidence_viewed', 'evidence', ?, ?, ?)").bind(crypto.randomUUID(), artifact.organizationId, artifact.projectId, session.userId, artifact.id, `查看 ${artifact.kind} 证据`, new Date().toISOString()).run();
  return new NextResponse(artifact.content as BodyInit, {
    headers: {
      "Content-Type": artifact.mimeType,
      "Content-Disposition": `inline; filename=quarzion-evidence-${artifact.id}.${artifact.kind === "screenshot" ? artifact.mimeType.includes("png") ? "png" : artifact.mimeType.includes("jpeg") ? "jpg" : "webp" : "html"}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Quarzion-SHA256": artifact.sha256,
    },
  });
}
