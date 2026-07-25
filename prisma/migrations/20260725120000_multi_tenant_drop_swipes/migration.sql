-- Multi-tenant pivot: this app is no longer a shared two-person couple space --
-- every DateIdea now belongs to whichever Telegram user created it. Existing rows
-- get telegramUserId='' here; run scripts/backfillOwnerTelegramId.mjs right after
-- this deploys to assign them to the real (current) owner so nothing goes missing.
--
-- Swipe/Match (the couple-matching feature) are dropped entirely -- the swipe
-- screens are gone from the app, and re-adding "match with someone" later will
-- need a different shape once there's a real multi-user pairing concept.
ALTER TABLE "DateIdea" ADD COLUMN "telegramUserId" TEXT NOT NULL DEFAULT '';

CREATE INDEX "DateIdea_telegramUserId_idx" ON "DateIdea"("telegramUserId");

DROP TABLE "Match";
DROP TABLE "Swipe";

-- Meters AI-powered link/post imports per Telegram user (5 free before a paid plan).
CREATE TABLE "ImportQuota" (
    "telegramUserId" TEXT NOT NULL PRIMARY KEY,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- /support messages from the bot, kept here as a durable copy in case the Telegram
-- DM to the admin gets missed.
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "telegramUserId" TEXT NOT NULL,
    "username" TEXT,
    "text" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
