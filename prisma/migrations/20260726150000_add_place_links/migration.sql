-- CreateTable
CREATE TABLE "PlaceLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dateIdeaId" TEXT NOT NULL,
    "label" TEXT,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "PlaceLink_dateIdeaId_fkey" FOREIGN KEY ("dateIdeaId") REFERENCES "DateIdea" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PlaceLink_dateIdeaId_position_key" ON "PlaceLink"("dateIdeaId", "position");
