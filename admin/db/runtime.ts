import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

type SqlValue = string | number | bigint | Uint8Array | null;

function normalizeValue(value: unknown): SqlValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "bigint" || value instanceof Uint8Array) return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  throw new TypeError(`Unsupported SQLite value: ${typeof value}`);
}

class LocalPreparedStatement {
  constructor(private readonly database: DatabaseSync, private readonly sql: string, private readonly values: SqlValue[] = []) {}

  bind(...values: unknown[]) {
    return new LocalPreparedStatement(this.database, this.sql, values.map(normalizeValue));
  }

  async all<T extends Record<string, unknown> = Record<string, unknown>>() {
    return { results: this.database.prepare(this.sql).all(...this.values) as T[], success: true, meta: {} };
  }

  async first<T extends Record<string, unknown> = Record<string, unknown>>() {
    return (this.database.prepare(this.sql).get(...this.values) as T | undefined) ?? null;
  }

  async run() {
    return this.runSync();
  }

  runSync() {
    const result = this.database.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
  }
}

class LocalDatabase {
  private readonly database: DatabaseSync;

  constructor(filePath: string) {
    mkdirSync(dirname(filePath), { recursive: true });
    this.database = new DatabaseSync(filePath);
    this.database.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;");
  }

  prepare(sql: string) {
    return new LocalPreparedStatement(this.database, sql);
  }

  async batch(statements: LocalPreparedStatement[]) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const results = statements.map((statement) => statement.runSync());
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  exec(sql: string) {
    this.database.exec(sql);
  }
}

const databasePath = resolve(process.env.QUARZION_DB_PATH ?? ".data/quarzion.sqlite");

export const env = { DB: new LocalDatabase(databasePath) };
