BEGIN;

-- CreateEnum
CREATE TYPE "MembershipPlan" AS ENUM ('FREE', 'PAID');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "plan" "MembershipPlan" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "trialSaveCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Want" ADD COLUMN     "expiresAt" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "Own" ADD COLUMN     "expiresAt" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "SaveRequest" (
    "userId" UUID NOT NULL,
    "key" VARCHAR(128) NOT NULL,
    "fingerprint" VARCHAR(64) NOT NULL,
    "itemId" UUID NOT NULL,

    CONSTRAINT "SaveRequest_pkey" PRIMARY KEY ("userId","key")
);

-- CreateIndex
CREATE INDEX "Want_expiresAt_userId_idx" ON "Want"("expiresAt", "userId");

-- CreateIndex
CREATE INDEX "Own_expiresAt_userId_idx" ON "Own"("expiresAt", "userId");

-- AddForeignKey
ALTER TABLE "SaveRequest" ADD CONSTRAINT "SaveRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Historical deletions cannot be reconstructed. Count surviving logical saves,
-- treating a linked Want/Own purchase as one save rather than two.
UPDATE "User" u SET "trialSaveCount" = (
  (SELECT count(*) FROM "Want" w WHERE w."userId" = u.id) +
  (SELECT count(*) FROM "Own" o WHERE o."userId" = u.id AND o."fromWantId" IS NULL)
);
ALTER TABLE "User" ADD CONSTRAINT "User_trialSaveCount_nonnegative" CHECK ("trialSaveCount" >= 0);

-- Give existing records a full 30 days from rollout, never retroactively expire.
UPDATE "Want" SET "expiresAt" = CURRENT_TIMESTAMP + INTERVAL '30 days';
UPDATE "Own" SET "expiresAt" = CURRENT_TIMESTAMP + INTERVAL '30 days';

-- Server-only Prisma access, same policy as User/Want/Own.
ALTER TABLE "SaveRequest" ENABLE ROW LEVEL SECURITY;
COMMIT;
