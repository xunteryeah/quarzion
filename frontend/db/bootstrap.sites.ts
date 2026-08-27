import { env } from "@/db/runtime";

let initialized = false;

export async function ensureDatabase() {
  if (initialized) return;
  const migration = await env.DB.prepare("SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1").first<{ version: string }>();
  if (!migration?.version) throw new Error("Sites D1 数据库尚未完成迁移");
  initialized = true;
}
