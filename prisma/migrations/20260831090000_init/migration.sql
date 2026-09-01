-- CreateEnum
CREATE TYPE "WantStatus" AS ENUM ('PENDING', 'BOUGHT', 'SKIPPED');

-- CreateEnum
CREATE TYPE "OwnSource" AS ENUM ('MANUAL', 'BOUGHT');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Want" (
    "id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "url" TEXT,
    "category" VARCHAR(32) NOT NULL,
    "categoryDetail" VARCHAR(80),
    "color" VARCHAR(32) NOT NULL,
    "colorDetail" VARCHAR(80),
    "price" INTEGER,
    "note" TEXT,
    "status" "WantStatus" NOT NULL DEFAULT 'PENDING',
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Want_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Own" (
    "id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "category" VARCHAR(32) NOT NULL,
    "categoryDetail" VARCHAR(80),
    "color" VARCHAR(32) NOT NULL,
    "colorDetail" VARCHAR(80),
    "source" "OwnSource" NOT NULL DEFAULT 'MANUAL',
    "fromWantId" UUID,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Own_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Want_userId_status_createdAt_idx" ON "Want"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Want_userId_category_idx" ON "Want"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "Own_fromWantId_key" ON "Own"("fromWantId");

-- CreateIndex
CREATE INDEX "Own_userId_category_color_idx" ON "Own"("userId", "category", "color");

-- CreateIndex
CREATE INDEX "Own_userId_createdAt_idx" ON "Own"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Want" ADD CONSTRAINT "Want_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Own" ADD CONSTRAINT "Own_fromWantId_fkey" FOREIGN KEY ("fromWantId") REFERENCES "Want"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Own" ADD CONSTRAINT "Own_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- EnableRLS
-- The application accesses these tables only through the server-side Prisma role.
-- No Data API policies are created, so anon/authenticated clients cannot read them.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Want" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Own" ENABLE ROW LEVEL SECURITY;
