import { env } from "@/db/runtime";

type ContactPayload = {
  kind: "contact";
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  message: string;
};

type InvitationPayload = {
  kind: "invitation";
  id: string;
  organizationName: string;
  email: string;
  role: string;
  invitationUrl: string;
  expiresAt: string;
};

type EmailPayload = ContactPayload | InvitationPayload;

type OutboxRow = {
  id: string;
  kind: EmailPayload["kind"];
  reference_id: string;
  payload_ciphertext: string;
  payload_iv: string;
  attempt_count: number;
  max_attempts: number;
};

function bytesToBase64(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64");
}

function base64ToBytes(value: string) {
  return new Uint8Array(Buffer.from(value, "base64"));
}

function encryptionKeyBytes() {
  const value = process.env.QUARZION_OUTBOX_ENCRYPTION_KEY ?? "";
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error("QUARZION_OUTBOX_ENCRYPTION_KEY 必须是 64 位十六进制密钥");
  return new Uint8Array(Buffer.from(value, "hex"));
}

async function encryptionKey() {
  return crypto.subtle.importKey("raw", encryptionKeyBytes(), "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function sealEmailPayload(payload: EmailPayload) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(), plaintext);
  return { ciphertext: bytesToBase64(new Uint8Array(ciphertext)), iv: bytesToBase64(iv) };
}

async function openEmailPayload(ciphertext: string, iv: string): Promise<EmailPayload> {
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(iv) },
    await encryptionKey(),
    base64ToBytes(ciphertext),
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as EmailPayload;
}

export async function enqueueContactEmail(payload: ContactPayload) {
  const sealed = await sealEmailPayload(payload);
  const now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO email_outbox
      (id,kind,reference_id,recipient_email,payload_ciphertext,payload_iv,status,attempt_count,max_attempts,next_attempt_at,last_error,delivered_at,created_at,updated_at)
      VALUES (?,'contact',?,?,?,?,'pending',0,8,?,NULL,NULL,?,?)`)
    .bind(`email-${crypto.randomUUID()}`, payload.id, process.env.QUARZION_CONTACT_EMAIL ?? "unconfigured@windcall.invalid", sealed.ciphertext, sealed.iv, now, now, now).run();
}

function html(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
}

function messageFor(payload: EmailPayload) {
  if (payload.kind === "contact") {
    return {
      to: process.env.QUARZION_CONTACT_EMAIL ?? "",
      replyTo: payload.email,
      subject: `[WindCall 官网] ${payload.company} 预约产品演示`,
      html: `<h2>新的产品演示咨询</h2><p><b>姓名：</b>${html(payload.name)}</p><p><b>公司：</b>${html(payload.company)}</p><p><b>邮箱：</b>${html(payload.email)}</p><p><b>电话：</b>${html(payload.phone || "未填写")}</p><p><b>需求：</b></p><p>${html(payload.message).replace(/\n/g, "<br>")}</p><hr><small>提交编号：${html(payload.id)}</small>`,
    };
  }
  const role = payload.role === "organization_admin" ? "组织管理员" : payload.role === "viewer" ? "只读访客" : "成员";
  return {
    to: payload.email,
    subject: `邀请你加入 ${payload.organizationName} 的 WindCall 工作空间`,
    html: `<h2>加入 WindCall</h2><p>你已被邀请以“${html(role)}”身份加入 <b>${html(payload.organizationName)}</b>。</p><p><a href="${html(payload.invitationUrl)}">接受邀请并设置密码</a></p><p>该一次性链接将在 ${html(new Date(payload.expiresAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }))} 失效。若你不认识邀请方，请忽略此邮件。</p>`,
  };
}

async function send(payload: EmailPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.QUARZION_FROM_EMAIL;
  const message = messageFor(payload);
  if (!apiKey || !from || !message.to) throw new Error("邮件服务尚未配置");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [message.to],
      ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      subject: message.subject,
      html: message.html,
    }),
  });
  if (!response.ok) throw new Error(`邮件服务返回 ${response.status}`);
}

function retryAt(attempt: number) {
  const delayMinutes = [1, 5, 15, 60, 180, 720, 1_440, 2_880][Math.min(attempt - 1, 7)];
  return new Date(Date.now() + delayMinutes * 60_000).toISOString();
}

export async function processEmailOutbox(limit = 10) {
  if (!process.env.RESEND_API_KEY || !process.env.QUARZION_FROM_EMAIL) return { configured: false, processed: 0, delivered: 0, failed: 0 };
  const now = new Date().toISOString();
  const stale = new Date(Date.now() - 15 * 60_000).toISOString();
  await env.DB.prepare("UPDATE email_outbox SET status = 'retry', next_attempt_at = ?, last_error = '发送进程中断，已自动恢复', updated_at = ? WHERE status = 'delivering' AND updated_at < ?")
    .bind(now, now, stale).run();
  const due = await env.DB.prepare(`SELECT id,kind,reference_id,payload_ciphertext,payload_iv,attempt_count,max_attempts
      FROM email_outbox WHERE status IN ('pending','retry') AND next_attempt_at <= ? AND attempt_count < max_attempts
      ORDER BY created_at LIMIT ?`).bind(now, Math.max(1, Math.min(limit, 50))).all<OutboxRow>();
  let delivered = 0;
  let failed = 0;
  for (const row of due.results ?? []) {
    const claimed = await env.DB.prepare("UPDATE email_outbox SET status = 'delivering', attempt_count = attempt_count + 1, updated_at = ? WHERE id = ? AND status IN ('pending','retry')")
      .bind(new Date().toISOString(), row.id).run();
    if (Number(claimed.meta.changes ?? 0) !== 1) continue;
    const attempt = Number(row.attempt_count) + 1;
    try {
      const payload = await openEmailPayload(row.payload_ciphertext, row.payload_iv);
      if (payload.kind !== row.kind || payload.id !== row.reference_id) throw new Error("邮件队列内容校验失败");
      await send(payload);
      const finishedAt = new Date().toISOString();
      const statements = [env.DB.prepare("UPDATE email_outbox SET status = 'delivered', last_error = NULL, delivered_at = ?, updated_at = ? WHERE id = ? AND status = 'delivering'").bind(finishedAt, finishedAt, row.id)];
      if (row.kind === "contact") statements.push(env.DB.prepare("UPDATE contact_submissions SET delivery_status = 'delivered', delivery_error = NULL, updated_at = ? WHERE id = ?").bind(finishedAt, row.reference_id));
      await env.DB.batch(statements);
      delivered += 1;
    } catch (error) {
      const reason = (error instanceof Error ? error.message : "邮件发送失败").slice(0, 240);
      const terminal = attempt >= Number(row.max_attempts);
      const updatedAt = new Date().toISOString();
      const statements = [env.DB.prepare("UPDATE email_outbox SET status = ?, next_attempt_at = ?, last_error = ?, updated_at = ? WHERE id = ? AND status = 'delivering'").bind(terminal ? "failed" : "retry", retryAt(attempt), reason, updatedAt, row.id)];
      if (row.kind === "contact") statements.push(env.DB.prepare("UPDATE contact_submissions SET delivery_status = ?, delivery_error = ?, updated_at = ? WHERE id = ?").bind(terminal ? "failed" : "pending", reason, updatedAt, row.reference_id));
      await env.DB.batch(statements);
      console.error("email_delivery_failed", { outboxId: row.id, kind: row.kind, attempt, terminal, reason });
      failed += 1;
    }
  }
  return { configured: true, processed: delivered + failed, delivered, failed };
}
