import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { env } from "@/db/runtime";

let initialized = false;

function migrationDirectory() {
  if (process.env.QUARZION_MIGRATION_DIR) return resolve(process.env.QUARZION_MIGRATION_DIR);
  return dirname(resolve(process.env.QUARZION_MIGRATION_PATH ?? "../database/migrations/0001_unified.sql"));
}

function migrationStatements(source: string) {
  return source
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean)
    .map((statement) => env.DB.prepare(statement));
}

export async function ensureAdminDatabase() {
  if (initialized) return;

  const directory = migrationDirectory();
  const files = readdirSync(directory).filter((file) => /^\d+.*\.sql$/.test(file)).sort();
  if (!files.length) throw new Error("未找到数据库迁移文件");
  for (const file of files) {
    const version = file.replace(/\.sql$/, "");
    const table = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'").first();
    const applied = table
      ? await env.DB.prepare("SELECT version FROM schema_migrations WHERE version = ?").bind(version).first()
      : null;
    if (!applied) {
      const source = readFileSync(resolve(directory, file), "utf8");
      const rebuildsForeignKeys = source.includes("quarzion:foreign-keys-off");
      if (rebuildsForeignKeys) env.DB.exec("PRAGMA foreign_keys = OFF");
      try {
        await env.DB.batch(migrationStatements(source));
      } finally {
        if (rebuildsForeignKeys) env.DB.exec("PRAGMA foreign_keys = ON");
      }
    }
    const verified = await env.DB.prepare("SELECT version FROM schema_migrations WHERE version = ?").bind(version).first();
    if (!verified) throw new Error(`数据库迁移 ${version} 未完成`);
  }

  initialized = true;
}
