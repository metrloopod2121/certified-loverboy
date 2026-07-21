-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dateIdeaId" TEXT NOT NULL,
    "address" TEXT,
    "metro" TEXT,
    "lat" REAL,
    "lng" REAL,
    "url" TEXT,
    CONSTRAINT "Location_dateIdeaId_fkey" FOREIGN KEY ("dateIdeaId") REFERENCES "DateIdea" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Migrate existing single address/metro/lat/lng into the new Location table
INSERT INTO "Location" ("id", "dateIdeaId", "address", "metro", "lat", "lng")
SELECT 'loc_' || lower(hex(randomblob(12))), "id", "address", "metro", "lat", "lng"
FROM "DateIdea"
WHERE "address" IS NOT NULL OR "metro" IS NOT NULL OR "lat" IS NOT NULL OR "lng" IS NOT NULL;

-- Drop the now-redundant single-location columns from DateIdea
ALTER TABLE "DateIdea" DROP COLUMN "address";
ALTER TABLE "DateIdea" DROP COLUMN "metro";
ALTER TABLE "DateIdea" DROP COLUMN "lat";
ALTER TABLE "DateIdea" DROP COLUMN "lng";
