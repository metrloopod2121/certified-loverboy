-- CreateTable
CREATE TABLE "DateIdea" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "address" TEXT,
    "metro" TEXT,
    "lat" REAL,
    "lng" REAL,
    "description" TEXT,
    "priceNote" TEXT,
    "inPartnerDeck" BOOLEAN NOT NULL DEFAULT false,
    "showPriceToPartner" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "TagsOnDateIdeas" (
    "dateIdeaId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    PRIMARY KEY ("dateIdeaId", "tagId"),
    CONSTRAINT "TagsOnDateIdeas_dateIdeaId_fkey" FOREIGN KEY ("dateIdeaId") REFERENCES "DateIdea" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TagsOnDateIdeas_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Swipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "telegramUserId" TEXT NOT NULL,
    "dateIdeaId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Swipe_dateIdeaId_fkey" FOREIGN KEY ("dateIdeaId") REFERENCES "DateIdea" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dateIdeaId" TEXT NOT NULL,
    "matchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Match_dateIdeaId_fkey" FOREIGN KEY ("dateIdeaId") REFERENCES "DateIdea" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Swipe_telegramUserId_dateIdeaId_key" ON "Swipe"("telegramUserId", "dateIdeaId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_dateIdeaId_key" ON "Match"("dateIdeaId");
