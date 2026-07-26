-- One row per Telegram user for cross-surface (bot + Mini App) preferences -- starting
-- with UI/bot language (ru/en), picked from the Profile tab.
CREATE TABLE "UserSettings" (
    "telegramUserId" TEXT NOT NULL PRIMARY KEY,
    "language" TEXT NOT NULL DEFAULT 'ru',
    "updatedAt" DATETIME NOT NULL
);
