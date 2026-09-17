-- Preserve the existing public API and stored values. Invalid legacy values
-- abort the transaction instead of being silently replaced or discarded.
BEGIN;
CREATE TYPE "ItemCategory" AS ENUM ('top', 'bottom', 'outer', 'shoes', 'bag', 'etc');
CREATE TYPE "ItemColor" AS ENUM ('black', 'white', 'gray', 'navy', 'beige', 'brown', 'other');
ALTER TABLE "Want"
  ALTER COLUMN "category" TYPE "ItemCategory" USING "category"::"ItemCategory",
  ALTER COLUMN "color" TYPE "ItemColor" USING "color"::"ItemColor";
ALTER TABLE "Own"
  ALTER COLUMN "category" TYPE "ItemCategory" USING "category"::"ItemCategory",
  ALTER COLUMN "color" TYPE "ItemColor" USING "color"::"ItemColor";
COMMIT;
