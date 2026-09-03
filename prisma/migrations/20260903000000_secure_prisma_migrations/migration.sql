-- Keep Prisma's migration ledger inaccessible through Supabase's Data API.
-- Prisma's server-side database role continues to manage this table.
ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public._prisma_migrations FROM anon, authenticated;
