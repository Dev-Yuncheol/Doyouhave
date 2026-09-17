ALTER TABLE "public"."User" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "public"."User" ADD COLUMN "supabaseUserId" UUID;
CREATE UNIQUE INDEX "User_supabaseUserId_key" ON "public"."User"("supabaseUserId");
