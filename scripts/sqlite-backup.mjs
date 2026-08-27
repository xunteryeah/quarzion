import { DatabaseSync } from "node:sqlite";

const [sourcePath, destinationPath] = process.argv.slice(2);

if (!sourcePath || !destinationPath) {
  throw new Error("Usage: sqlite-backup.mjs <source-db> <destination-db>");
}

function quoteSqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

const source = new DatabaseSync(sourcePath, { readOnly: true });
source.exec(`VACUUM INTO ${quoteSqlString(destinationPath)}`);
source.close();

const backup = new DatabaseSync(destinationPath, { readOnly: true });
const integrity = backup.prepare("PRAGMA integrity_check").get();
backup.close();

if (integrity?.integrity_check !== "ok") {
  throw new Error(`Backup integrity check failed: ${JSON.stringify(integrity)}`);
}

process.stdout.write(`verified ${destinationPath}\n`);
