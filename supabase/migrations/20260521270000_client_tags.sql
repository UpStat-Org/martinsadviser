-- ============================================================================
-- Custom tags on clients
--
-- Free-form labels per client (VIP, slow payer, new, hot lead, etc.). Stored
-- as a Postgres text[] on the row itself — simpler than a join table for
-- small lists (<10 tags per client typically), trivial to filter via @> or
-- && operators.
-- ============================================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.clients.tags IS
  'Free-form labels per client. Lowercase by convention but not enforced. Use && to test overlap and @> to test containment.';

CREATE INDEX IF NOT EXISTS idx_clients_tags ON public.clients USING gin (tags);
