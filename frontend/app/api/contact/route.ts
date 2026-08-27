import { ensureDatabase } from "@/db/bootstrap";
import { env } from "@/db/runtime";
import { enqueueContactEmail, processEmailOutbox } from "@/lib/email-outbox";
import { NextRequest, NextResponse } from "next/server";

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

async function privacyHash(request: NextRequest) {
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const salt = process.env.QUARZION_AUDIT_SALT;
  if (!salt) throw new Error("QUARZION_AUDIT_SALT is required");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:contact:${address}`));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: NextRequest) {
  await ensureDatabase();
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "提交格式不正确" }, { status: 400 }); }

  if (clean(body.website, 120)) return NextResponse.json({ ok: true }, { status: 202 });
  const name = clean(body.name, 80);
  const company = clean(body.company, 120);
  const email = clean(body.email, 160).toLowerCase();
  const phone = clean(body.phone, 40);
  const message = String(body.message ?? "").trim().slice(0, 2_000);
  if (name.length < 2 || company.length < 2) return NextResponse.json({ error: "请填写姓名和公司名称" }, { status: 400 });
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "请填写正确的工作邮箱" }, { status: 400 });
  if (message.length < 10) return NextResponse.json({ error: "请至少用 10 个字描述你的需求" }, { status: 400 });
  if (body.consent !== true) return NextResponse.json({ error: "请确认同意我们联系你" }, { status: 400 });

  const ipHash = await privacyHash(request);
  const since = new Date(Date.now() - 15 * 60 * 1_000).toISOString();
  const recent = await env.DB.prepare("SELECT COUNT(*) AS count FROM contact_submissions WHERE ip_hash = ? AND created_at >= ?")
    .bind(ipHash, since).first<{ count: number }>();
  if (Number(recent?.count ?? 0) >= 5) return NextResponse.json({ error: "提交过于频繁，请稍后再试" }, { status: 429, headers: { "Retry-After": "900" } });

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const userAgent = clean(request.headers.get("user-agent"), 400);
  await env.DB.prepare(`INSERT INTO contact_submissions
      (id,name,company,email,phone,message,source,status,delivery_status,delivery_error,ip_hash,user_agent,created_at,updated_at)
      VALUES (?,?,?,?,?,?,'website','received','pending',NULL,?,?,?,?)`)
    .bind(id, name, company, email, phone || null, message, ipHash, userAgent || null, now, now).run();

  try {
    await enqueueContactEmail({ kind: "contact", id, name, company, email, phone, message });
    const delivery = await processEmailOutbox(1);
    if (!delivery.configured) {
      await env.DB.prepare("UPDATE contact_submissions SET delivery_error = '邮件服务尚未配置', updated_at = ? WHERE id = ?")
        .bind(new Date().toISOString(), id).run();
    }
  } catch (error) {
    const reason = (error instanceof Error ? error.message : "邮件队列写入失败").slice(0, 240);
    await env.DB.prepare("UPDATE contact_submissions SET delivery_error = ?, updated_at = ? WHERE id = ?")
      .bind(reason, new Date().toISOString(), id).run();
    console.error("contact_outbox_failed", { submissionId: id, reason });
  }

  return NextResponse.json({ ok: true, reference: id.slice(0, 8) }, { status: 201 });
}
