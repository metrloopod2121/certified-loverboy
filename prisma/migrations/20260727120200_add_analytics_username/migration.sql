-- Denormalized Telegram @username on every analytics event, so browsing raw events (DB,
-- JSONL, Telegram stream) shows who did something without joining against live user state.
ALTER TABLE "AnalyticsEvent" ADD COLUMN "username" TEXT;
