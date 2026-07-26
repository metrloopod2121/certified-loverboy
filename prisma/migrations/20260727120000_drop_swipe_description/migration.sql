-- The swipe/match feature (Tinder-style deck) was dropped in the multi-tenant pivot
-- (20260725120000_multi_tenant_drop_swipes) -- swipeDescription (a description written
-- specifically for swipe cards) has been dead weight since then. The edit-form field for it
-- was removed earlier, but the DB column and every remaining code reference stayed behind
-- until now.
ALTER TABLE "DateIdea" DROP COLUMN "swipeDescription";
