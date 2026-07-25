// One-off: assigns every pre-multi-tenant DateIdea (telegramUserId still '' from the
// migration default) to a real Telegram id, so existing data isn't orphaned/invisible
// after the multi-tenant pivot. Takes the id as a CLI arg rather than an env var --
// OWNER_TG_ID doesn't need to exist in .env at all anymore.
//
// Usage: node scripts/backfillOwnerTelegramId.mjs <telegramId>
import Database from "better-sqlite3";

const telegramId = process.argv[2];
if (!telegramId || !/^\d+$/.test(telegramId)) {
  console.error("Usage: node scripts/backfillOwnerTelegramId.mjs <telegramId>");
  process.exit(1);
}

const db = new Database("data/app.db");
const result = db.prepare("UPDATE DateIdea SET telegramUserId = ? WHERE telegramUserId = ''").run(telegramId);
console.log(`Assigned ${result.changes} existing idea(s) to telegramUserId=${telegramId}.`);
