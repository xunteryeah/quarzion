import { DatabaseSync } from "node:sqlite";

const [databasePath, label = "database"] = process.argv.slice(2);

if (!databasePath) {
  throw new Error("Usage: sqlite-inventory.mjs <database-path> [label]");
}

const database = new DatabaseSync(databasePath, { readOnly: true });
const tableRows = database.prepare(`
  SELECT name, sql
  FROM sqlite_master
  WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
  ORDER BY name
`).all();

const tables = tableRows.map((table) => {
  const escaped = String(table.name).replaceAll('"', '""');
  const row = database.prepare(`SELECT COUNT(*) AS count FROM "${escaped}"`).get();
  const columns = database.prepare(`PRAGMA table_info("${escaped}")`).all().map((column) => ({
    name: column.name,
    type: column.type,
    notNull: Boolean(column.notnull),
    primaryKey: Boolean(column.pk),
  }));
  return {
    name: table.name,
    rows: Number(row?.count ?? 0),
    columns,
    schema: table.sql,
  };
});

const integrity = database.prepare("PRAGMA integrity_check").get();
const foreignKeys = database.prepare("PRAGMA foreign_keys").get();
database.close();

if (integrity?.integrity_check !== "ok") {
  throw new Error(`Database integrity check failed: ${JSON.stringify(integrity)}`);
}

process.stdout.write(JSON.stringify({
  label,
  generatedAt: new Date().toISOString(),
  databasePath,
  integrity: integrity?.integrity_check ?? "unknown",
  foreignKeysEnabled: Boolean(foreignKeys?.foreign_keys),
  tableCount: tables.length,
  totalRows: tables.reduce((sum, table) => sum + table.rows, 0),
  tables,
}, null, 2));
process.stdout.write("\n");
