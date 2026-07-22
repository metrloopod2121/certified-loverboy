-- The DATE/FOOD split is replaced by an ordinary "date" tag: any idea that
-- was type='DATE' gets tagged before the type column disappears. Food/venue
-- ideas simply lack this tag going forward.
INSERT INTO "Tag" ("id", "name")
SELECT 'tag_' || lower(hex(randomblob(12))), 'date'
WHERE NOT EXISTS (SELECT 1 FROM "Tag" WHERE "name" = 'date')
  AND EXISTS (SELECT 1 FROM "DateIdea" WHERE "type" = 'DATE');

INSERT INTO "TagsOnDateIdeas" ("dateIdeaId", "tagId")
SELECT "DateIdea"."id", (SELECT "id" FROM "Tag" WHERE "name" = 'date')
FROM "DateIdea"
WHERE "DateIdea"."type" = 'DATE'
  AND NOT EXISTS (
    SELECT 1 FROM "TagsOnDateIdeas"
    WHERE "TagsOnDateIdeas"."dateIdeaId" = "DateIdea"."id"
      AND "TagsOnDateIdeas"."tagId" = (SELECT "id" FROM "Tag" WHERE "name" = 'date')
  );

ALTER TABLE "DateIdea" DROP COLUMN "type";
