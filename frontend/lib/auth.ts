import { env } from "@/db/runtime";

export const SESSION_COOKIE = "windcall_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const PASSWORD_ITERATIONS = 600_000;

type RequestLike = { headers: Headers };

export type CustomerSession = {
  sessionId: string;
  userId: string;
  email: string;
  displayName: string;
  expiresAt: string;
};

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value: string) {
  if (!/^[a-f0-9]+$/i.test(value) || value.length % 2) throw new Error("Invalid hexadecimal value");
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  return bytes;
}

function randomHex(length = 32) {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(length)));
}

export function createOpaqueToken() {
  return randomHex(32);
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PASSWORD_ITERATIONS }, key, 256);
  return `pbkdf2_sha256$${PASSWORD_ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, encoded: string | null) {
  if (!encoded) return false;
  const [algorithm, iterationsValue, saltValue, expectedValue] = encoded.split("$");
  if (algorithm !== "pbkdf2_sha256" || !iterationsValue || !saltValue || !expectedValue) return false;
  const iterations = Number(iterationsValue);
  if (!Number.isSafeInteger(iterations) || iterations < 100_000 || iterations > 1_000_000) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(saltValue), iterations }, key, 256);
  const actual = new Uint8Array(bits);
  const expected = hexToBytes(expectedValue);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
  return difference === 0;
}

function requestIp(request: RequestLike) {
  return request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-real-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
}

export async function privacyHash(value: string) {
  return sha256(`${process.env.QUARZION_AUDIT_SALT ?? "local-development-only"}:${value}`);
}

export async function createSession(userId: string, request: RequestLike) {
  const token = createOpaqueToken();
  const tokenHash = await sha256(token);
  const ipHash = await privacyHash(requestIp(request));
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();
  await env.DB.prepare("INSERT INTO sessions (id,user_id,token_hash,ip_hash,user_agent,expires_at,last_seen_at,revoked_at,created_at) VALUES (?,?,?,?,?,?,?,NULL,?)")
    .bind(crypto.randomUUID(), userId, tokenHash, ipHash, request.headers.get("user-agent")?.slice(0, 500) ?? "unknown", expiresAt, now.toISOString(), now.toISOString())
    .run();
  return { token, expiresAt };
}

export async function getSessionByToken(token: string | null | undefined): Promise<CustomerSession | null> {
  if (!token || !/^[a-f0-9]{64}$/i.test(token)) return null;
  const tokenHash = await sha256(token);
  const session = await env.DB.prepare(`SELECT s.id AS sessionId, s.user_id AS userId, s.expires_at AS expiresAt,
      u.email, u.display_name AS displayName, u.status AS userStatus
      FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ? LIMIT 1`)
    .bind(tokenHash, new Date().toISOString())
    .first<CustomerSession & { userStatus: string }>();
  if (!session || session.userStatus !== "active") return null;
  return { sessionId: session.sessionId, userId: session.userId, email: session.email, displayName: session.displayName, expiresAt: session.expiresAt };
}

export async function getRequestSession(request: { cookies: { get(name: string): { value: string } | undefined } }) {
  return getSessionByToken(request.cookies.get(SESSION_COOKIE)?.value);
}

export async function revokeSession(token: string | null | undefined, allForUser = false) {
  const session = await getSessionByToken(token);
  if (!session) return;
  const now = new Date().toISOString();
  if (allForUser) await env.DB.prepare("UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL").bind(now, session.userId).run();
  else await env.DB.prepare("UPDATE sessions SET revoked_at = ? WHERE id = ?").bind(now, session.sessionId).run();
}

export function sessionCookie(token: string, maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function authIdentityHashes(request: RequestLike, email: string) {
  return {
    emailHash: await privacyHash(email.trim().toLowerCase()),
    ipHash: await privacyHash(requestIp(request)),
  };
}
