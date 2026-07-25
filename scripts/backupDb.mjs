// Online, consistent SQLite snapshot — safe to run while the service is up (uses
// better-sqlite3's backup API, not a raw file copy that could catch a write mid-flight).
// Usage: node scripts/backupDb.mjs [status]
// Automated daily via deploy/certified-loverboy-backup.timer on the server.
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import Database from "better-sqlite3";

const DB_PATH = path.resolve(process.cwd(), "data/app.db");
const BACKUP_DIR = path.resolve(process.cwd(), "data/backups");
const KEEP = 30;
const PREFIX = "app-";

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").replace("T", "-").slice(0, 19);
}

function listBackups() {
  if (!existsSync(BACKUP_DIR)) return [];
  return readdirSync(BACKUP_DIR)
    .filter((name) => name.startsWith(PREFIX) && name.endsWith(".db"))
    .map((name) => ({ name, path: path.join(BACKUP_DIR, name), mtime: statSync(path.join(BACKUP_DIR, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
}

function printStatus() {
  const backups = listBackups();
  if (backups.length === 0) {
    console.log("no backups yet");
    process.exitCode = 1;
    return;
  }
  const latest = backups[0];
  const sizeKb = Math.round(statSync(latest.path).size / 1024);
  const ageHours = Math.round((Date.now() - latest.mtime) / 3_600_000);
  console.log(`latest: ${latest.name} (${sizeKb} KB, ${ageHours}h ago)`);
  console.log(`total backups: ${backups.length}`);
  if (ageHours > 36) {
    console.log("WARNING: latest backup is over 36h old — check the timer");
    process.exitCode = 1;
  }
}

if (process.argv[2] === "status") {
  printStatus();
  process.exit();
}

mkdirSync(BACKUP_DIR, { recursive: true });
const outPath = path.join(BACKUP_DIR, `${PREFIX}${timestamp()}.db`);

const source = new Database(DB_PATH, { readonly: true });
await source.backup(outPath);
source.close();

try {
  const result = execFileSync("sqlite3", [outPath, "PRAGMA integrity_check;"], { encoding: "utf8" }).trim();
  if (result !== "ok") {
    unlinkSync(outPath);
    console.error(`backup failed integrity check (${result}), removed`);
    process.exit(1);
  }
  const ideaCount = execFileSync("sqlite3", [outPath, "SELECT count(*) FROM DateIdea;"], { encoding: "utf8" }).trim();
  console.log(`backup ok · ${ideaCount} ideas`);
} catch {
  console.log("(sqlite3 CLI not found — skipped integrity check)");
}

const backups = listBackups();
for (const old of backups.slice(KEEP)) {
  unlinkSync(old.path);
}

console.log(`saved ${outPath} · keeping ${Math.min(backups.length, KEEP)} of ${backups.length} backups`);
