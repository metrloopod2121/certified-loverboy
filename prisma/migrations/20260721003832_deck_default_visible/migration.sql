-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DateIdea" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "address" TEXT,
    "metro" TEXT,
    "lat" REAL,
    "lng" REAL,
    "description" TEXT,
    "swipeDescription" TEXT,
    "priceNote" TEXT,
    "inPartnerDeck" BOOLEAN NOT NULL DEFAULT true,
    "showPriceToPartner" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_DateIdea" ("address", "createdAt", "description", "id", "inPartnerDeck", "lat", "lng", "metro", "priceNote", "showPriceToPartner", "swipeDescription", "title", "updatedAt") SELECT "address", "createdAt", "description", "id", "inPartnerDeck", "lat", "lng", "metro", "priceNote", "showPriceToPartner", "swipeDescription", "title", "updatedAt" FROM "DateIdea";
DROP TABLE "DateIdea";
ALTER TABLE "new_DateIdea" RENAME TO "DateIdea";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Make existing date ideas visible to the partner by default too (price stays hidden)
UPDATE "DateIdea" SET "inPartnerDeck" = true;
