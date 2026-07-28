-- Nullable date/time window for a one-time dated event (concert, show, tournament...) on a
-- place. Both null means an ordinary evergreen place -- there is no separate "is this an event"
-- flag, presence of eventStartsAt alone is the signal.
ALTER TABLE "DateIdea" ADD COLUMN "eventStartsAt" DATETIME;
ALTER TABLE "DateIdea" ADD COLUMN "eventEndsAt" DATETIME;
