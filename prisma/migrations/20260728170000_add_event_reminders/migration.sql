-- Optional one-shot Telegram reminders for dated events. `reminderAt` is the user-selected
-- instant, `reminderSentAt` is set by scripts/sendReminders.mjs after delivery so reminders
-- are idempotent across timer runs.
ALTER TABLE "DateIdea" ADD COLUMN "reminderAt" DATETIME;
ALTER TABLE "DateIdea" ADD COLUMN "reminderSentAt" DATETIME;

CREATE INDEX "DateIdea_reminderSentAt_reminderAt_idx" ON "DateIdea"("reminderSentAt", "reminderAt");
