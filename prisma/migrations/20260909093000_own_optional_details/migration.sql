BEGIN;

ALTER TABLE "Own"
  ADD COLUMN "url" TEXT,
  ADD COLUMN "price" INTEGER,
  ADD COLUMN "note" TEXT;

-- Restore details for clothes already moved from purchase candidates.
UPDATE "Own" AS owned
SET "url" = candidate."url",
    "price" = candidate."price",
    "note" = candidate."note"
FROM "Want" AS candidate
WHERE owned."fromWantId" = candidate."id"
  AND owned."userId" = candidate."userId";

COMMIT;
