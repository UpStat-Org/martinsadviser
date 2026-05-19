-- ============================================================================
-- Multi-tenancy: ai_chat_messages
-- Phase 1, Week 2 (final table; 19 of 19).
--
-- ai_chat_messages receives INSERTs from the ai-chat edge function
-- (service_role). The function MUST be deployed with the matching patch
-- (org_id passed explicitly, derived from client.org_id) BEFORE applying.
--
-- ai_chat_messages carries 6 active policies today (two migrations created
-- overlapping sets with different names). All 6 are dropped and replaced
-- by 3 org-scoped policies (no UPDATE policy, matching the current intent
-- that chat messages are immutable).
--
-- NOTE on google_calendar_tokens (intentionally NOT migrated):
--   It stores per-user OAuth credentials for Google Calendar — a personal
--   third-party credential, not org data. The existing UNIQUE(user_id) and
--   per-user RLS provide sufficient isolation. Adding org_id would require
--   patching the OAuth state parameter and callback flow without a real
--   isolation benefit in single-org-per-user scenarios. To be revisited
--   when a user first needs to belong to multiple orgs (Phase 2+).
-- ============================================================================

ALTER TABLE public.ai_chat_messages
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.ai_chat_messages acm
  SET org_id = c.org_id
  FROM public.clients c
  WHERE acm.client_id = c.id AND acm.org_id IS NULL;

ALTER TABLE public.ai_chat_messages
  ALTER COLUMN org_id SET NOT NULL,
  ALTER COLUMN org_id SET DEFAULT public.current_org_id();

CREATE INDEX idx_ai_chat_messages_org_id ON public.ai_chat_messages(org_id);

-- Drop both legacy policy sets.
DROP POLICY IF EXISTS "Staff can view ai chat" ON public.ai_chat_messages;
DROP POLICY IF EXISTS "Staff can insert ai chat" ON public.ai_chat_messages;
DROP POLICY IF EXISTS "Staff can delete ai chat" ON public.ai_chat_messages;
DROP POLICY IF EXISTS "Authenticated users can view ai chat messages" ON public.ai_chat_messages;
DROP POLICY IF EXISTS "Authenticated users can create ai chat messages" ON public.ai_chat_messages;
DROP POLICY IF EXISTS "Authenticated users can delete ai chat messages" ON public.ai_chat_messages;

CREATE POLICY "org members read ai chat"
  ON public.ai_chat_messages FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "org members insert ai chat"
  ON public.ai_chat_messages FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "org members delete ai chat"
  ON public.ai_chat_messages FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));
