-- All date ideas are now always visible to the partner, and price is always hidden from her
ALTER TABLE "DateIdea" DROP COLUMN "inPartnerDeck";
ALTER TABLE "DateIdea" DROP COLUMN "showPriceToPartner";
