-- Tags which bot flow produced a pending draft, so the place_created analytics event can
-- carry the right source once it's approved. Existing (short-lived) rows default to
-- 'unknown' -- PendingImport rows are consumed within the same conversation, so this default
-- is not expected to actually surface in production data.
ALTER TABLE "PendingImport" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'unknown';

CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "telegramUserId" TEXT,
    "properties" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "AnalyticsEvent_name_idx" ON "AnalyticsEvent"("name");
CREATE INDEX "AnalyticsEvent_telegramUserId_idx" ON "AnalyticsEvent"("telegramUserId");
