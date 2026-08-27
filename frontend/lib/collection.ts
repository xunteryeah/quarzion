import { env } from "@/db/runtime";

export const PLATFORMS = ["doubao", "qwen", "deepseek"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_PROFILES: Record<Platform, { name: string; url: string; hosts: string[] }> = {
  doubao: { name: "豆包", url: "https://ark.cn-beijing.volces.com/api/v3/responses", hosts: ["ark.cn-beijing.volces.com"] },
  qwen: { name: "千问", url: "https://dashscope.aliyuncs.com/compatible-mode/v1/responses", hosts: ["dashscope.aliyuncs.com"] },
  deepseek: { name: "DeepSeek", url: "https://api.deepseek.com/responses", hosts: ["api.deepseek.com"] },
};

export const FAILURE_DEFINITIONS = {
  network_error: { category: "network", retryable: true, severity: "warning" },
  navigation_timeout: { category: "timeout", retryable: true, severity: "warning" },
  answer_timeout: { category: "timeout", retryable: true, severity: "warning" },
  selector_changed: { category: "page_change", retryable: false, severity: "critical" },
  captcha_required: { category: "verification", retryable: false, severity: "critical" },
  login_required: { category: "platform_block", retryable: false, severity: "warning" },
  access_blocked: { category: "platform_block", retryable: false, severity: "critical" },
  empty_answer: { category: "empty_answer", retryable: true, severity: "warning" },
  parse_failed: { category: "parse", retryable: true, severity: "warning" },
  invalid_evidence: { category: "evidence", retryable: false, severity: "warning" },
  worker_error: { category: "system", retryable: true, severity: "warning" },
  provider_error: { category: "provider", retryable: true, severity: "warning" },
  provider_rate_limited: { category: "provider_rate_limit", retryable: true, severity: "warning" },
  provider_rejected: { category: "provider", retryable: false, severity: "warning" },
} as const;

export type FailureCode = keyof typeof FAILURE_DEFINITIONS;

export function isPlatform(value: string): value is Platform {
  return PLATFORMS.includes(value as Platform);
}

export function failureDefinition(code: string) {
  return FAILURE_DEFINITIONS[code as FailureCode] ?? FAILURE_DEFINITIONS.worker_error;
}

export function classifyFailure(message: string, suppliedCode?: string) {
  if (suppliedCode && suppliedCode in FAILURE_DEFINITIONS) {
    const definition = failureDefinition(suppliedCode);
    return { code: suppliedCode as FailureCode, ...definition };
  }
  const normalized = message.toLowerCase();
  const code: FailureCode = /captcha|验证码|人机验证|verify/.test(normalized)
    ? "captcha_required"
    : /登录|login|sign in/.test(normalized)
      ? "login_required"
      : /403|429|blocked|forbidden|访问受限|拒绝访问/.test(normalized)
        ? "access_blocked"
        : /selector|locator|页面结构|element not found/.test(normalized)
          ? "selector_changed"
          : /empty|空回答|没有回答/.test(normalized)
            ? "empty_answer"
            : /timeout|超时/.test(normalized)
              ? "answer_timeout"
              : /network|fetch|连接|socket|dns/.test(normalized)
                ? "network_error"
                : "worker_error";
  return { code, ...failureDefinition(code) };
}

export async function sha256(value: string | Uint8Array) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const buffer: ArrayBuffer = bytes.buffer instanceof ArrayBuffer
    ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    : Uint8Array.from(bytes).buffer;
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function randomToken(bytes = 32) {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function normalizeWorkerId(value: unknown) {
  const workerId = String(value ?? "").trim();
  return /^[a-zA-Z0-9][a-zA-Z0-9._:-]{2,80}$/.test(workerId) ? workerId : null;
}

export function safeJsonArray(value: unknown, fallback: string[] = []) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.map(String) : fallback;
  } catch {
    return fallback;
  }
}

export function decodeBase64(value: string, maxBytes: number) {
  if (!value || value.length > Math.ceil(maxBytes * 4 / 3) + 16) throw new Error("证据文件超过大小限制");
  const normalized = value.includes(",") ? value.slice(value.indexOf(",") + 1) : value;
  const decoded = atob(normalized);
  if (decoded.length > maxBytes) throw new Error("证据文件超过大小限制");
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

function privateIpv4(hostname: string) {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 10 || parts[0] === 127 || parts[0] === 0 || (parts[0] === 169 && parts[1] === 254) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168);
}

export function safePublicUrl(value: unknown, platform?: Platform) {
  try {
    const url = new URL(String(value ?? ""));
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "::1" || privateIpv4(hostname)) return null;
    if (platform && !PLATFORM_PROFILES[platform].hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function retryAt(attempt: number, baseSeconds: number) {
  const seconds = Math.min(3600, Math.max(15, baseSeconds) * Math.pow(2, Math.max(0, attempt - 1)));
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export async function emergencyStop() {
  const row = await env.DB.prepare("SELECT value_json AS valueJson FROM system_settings WHERE key = 'collector.emergency_stop'").first<{ valueJson: string }>();
  try {
    const parsed = JSON.parse(row?.valueJson ?? "{}");
    return { enabled: parsed.enabled === true, reason: typeof parsed.reason === "string" ? parsed.reason : null };
  } catch {
    return { enabled: true, reason: "紧急停机配置无法解析" };
  }
}

export async function recordAlert(input: {
  organizationId?: string | null;
  projectId?: string | null;
  runId?: string | null;
  platform?: string | null;
  kind: string;
  severity: "info" | "warning" | "critical";
  fingerprint: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  const now = new Date().toISOString();
  const existing = await env.DB.prepare("SELECT id FROM system_alerts WHERE fingerprint = ? AND status != 'resolved' LIMIT 1").bind(input.fingerprint).first<{ id: string }>();
  if (existing) {
    await env.DB.prepare("UPDATE system_alerts SET occurrence_count = occurrence_count + 1, last_seen_at = ?, message = ?, metadata_json = ?, updated_at = ? WHERE id = ?").bind(now, input.message.slice(0, 1000), JSON.stringify(input.metadata ?? {}), now, existing.id).run();
    return existing.id;
  }
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO system_alerts (id, organization_id, project_id, run_id, platform, kind, severity, fingerprint, status, occurrence_count, message, metadata_json, first_seen_at, last_seen_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', 1, ?, ?, ?, ?, ?, ?)").bind(id, input.organizationId ?? null, input.projectId ?? null, input.runId ?? null, input.platform ?? null, input.kind, input.severity, input.fingerprint, input.message.slice(0, 1000), JSON.stringify(input.metadata ?? {}), now, now, now, now).run();
  return id;
}
