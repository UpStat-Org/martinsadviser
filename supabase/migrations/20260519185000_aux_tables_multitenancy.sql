-- ============================================================================
-- Multi-tenancy: comments, saved_filters, message_templates,
--                scheduled_messages, client_internal_notes
-- Phase 1, Week 2 (tables 14-18 of 20).
--
-- scheduled_messages receives INSERTs from check-permit-expirations
-- (service_role). The function MUST be deployed with the matching patch
-- (org_id passed explicitly) BEFORE this migration applies, otherwise the
-- daily cron will fail on the NOT NULL check.
--
-- client_internal_notes carries 8 active policies today (two migrations
-- created overlapping sets with different names). All 8 are dropped and
-- replaced by 4 org-scoped policies that match the later-migration intent
-- of team-wide write access.
--
-- comments uses an entity_type/entity_id pattern (polymorphic). Backfill
-- uses the default org since all historical data is MartinsAdviser; doing
-- a per-row JOIN to clients/permits/trucks adds complexity without value
-- in single-org state.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) comments (polymorphic; default-org backfill)
-- ---------------------------------------------------------------------------

ALTER TABLE public.comments
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.comments
  SET org_id = '00000000-0000-0000-0000-000000000001'
  WHERE org_id IS NULL;

ALTER TABLE public.comments
  ALTER COLUMN org_id SET NOT NULL,
  ALTER COLUMN org_id SET DEFAULT public.current_org_id();

CREATE INDEX idx_comments_org_id ON public.comments(org_id);

DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can insert comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;

CREATE POLICY "org members read comments"
  ON public.comments FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "org members insert comments"
  ON public.comments FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(org_id)
    AND auth.uid() = user_id
  );

CREATE POLICY "users delete own comments in org"
  ON public.comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.is_org_member(org_id));

-- ---------------------------------------------------------------------------
-- 2) saved_filters (per-user)
-- ---------------------------------------------------------------------------

ALTER TABLE public.saved_filters
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.saved_filters
  SET org_id = '00000000-0000-0000-0000-000000000001'
  WHERE org_id IS NULL;

ALTER TABLE public.saved_filters
  ALTER COLUMN org_id SET NOT NULL,
  ALTER COLUMN org_id SET DEFAULT public.current_org_id();

CREATE INDEX idx_saved_filters_org_id ON public.saved_filters(org_id);

DROP POLICY IF EXISTS "Users can view own saved filters" ON public.saved_filters;
DROP POLICY IF EXISTS "Users can insert own saved filters" ON public.saved_filters;
DROP POLICY IF EXISTS "Users can update own saved filters" ON public.saved_filters;
DROP POLICY IF EXISTS "Users can delete own saved filters" ON public.saved_filters;

CREATE POLICY "users read own filters in org"
  ON public.saved_filters FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND public.is_org_member(org_id));

CREATE POLICY "users insert own filters in org"
  ON public.saved_filters FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_org_member(org_id));

CREATE POLICY "users update own filters in org"
  ON public.saved_filters FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.is_org_member(org_id))
  WITH CHECK (auth.uid() = user_id AND public.is_org_member(org_id));

CREATE POLICY "users delete own filters in org"
  ON public.saved_filters FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.is_org_member(org_id));

-- ---------------------------------------------------------------------------
-- 3) message_templates (per-user)
-- ---------------------------------------------------------------------------

ALTER TABLE public.message_templates
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.message_templates
  SET org_id = '00000000-0000-0000-0000-000000000001'
  WHERE org_id IS NULL;

ALTER TABLE public.message_templates
  ALTER COLUMN org_id SET NOT NULL,
  ALTER COLUMN org_id SET DEFAULT public.current_org_id();

CREATE INDEX idx_message_templates_org_id ON public.message_templates(org_id);

DROP POLICY IF EXISTS "Users can view own templates" ON public.message_templates;
DROP POLICY IF EXISTS "Users can create own templates" ON public.message_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON public.message_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON public.message_templates;

CREATE POLICY "users read own templates in org"
  ON public.message_templates FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND public.is_org_member(org_id));

CREATE POLICY "users create own templates in org"
  ON public.message_templates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_org_member(org_id));

CREATE POLICY "users update own templates in org"
  ON public.message_templates FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.is_org_member(org_id))
  WITH CHECK (auth.uid() = user_id AND public.is_org_member(org_id));

CREATE POLICY "users delete own templates in org"
  ON public.message_templates FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.is_org_member(org_id));

-- ---------------------------------------------------------------------------
-- 4) scheduled_messages (per-user; backfill via JOIN to clients)
-- ---------------------------------------------------------------------------

ALTER TABLE public.scheduled_messages
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.scheduled_messages sm
  SET org_id = c.org_id
  FROM public.clients c
  WHERE sm.client_id = c.id AND sm.org_id IS NULL;

ALTER TABLE public.scheduled_messages
  ALTER COLUMN org_id SET NOT NULL,
  ALTER COLUMN org_id SET DEFAULT public.current_org_id();

CREATE INDEX idx_scheduled_messages_org_id ON public.scheduled_messages(org_id);

DROP POLICY IF EXISTS "Users can view own messages" ON public.scheduled_messages;
DROP POLICY IF EXISTS "Users can create own messages" ON public.scheduled_messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.scheduled_messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON public.scheduled_messages;

CREATE POLICY "users read own messages in org"
  ON public.scheduled_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND public.is_org_member(org_id));

CREATE POLICY "users create own messages in org"
  ON public.scheduled_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_org_member(org_id));

CREATE POLICY "users update own messages in org"
  ON public.scheduled_messages FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.is_org_member(org_id))
  WITH CHECK (auth.uid() = user_id AND public.is_org_member(org_id));

CREATE POLICY "users delete own messages in org"
  ON public.scheduled_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.is_org_member(org_id));

-- ---------------------------------------------------------------------------
-- 5) client_internal_notes (team-wide; backfill via JOIN to clients)
-- ---------------------------------------------------------------------------

ALTER TABLE public.client_internal_notes
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.client_internal_notes cin
  SET org_id = c.org_id
  FROM public.clients c
  WHERE cin.client_id = c.id AND cin.org_id IS NULL;

ALTER TABLE public.client_internal_notes
  ALTER COLUMN org_id SET NOT NULL,
  ALTER COLUMN org_id SET DEFAULT public.current_org_id();

CREATE INDEX idx_client_internal_notes_org_id ON public.client_internal_notes(org_id);

-- Drop both legacy policy sets (overlapping due to two creating migrations).
DROP POLICY IF EXISTS "Authenticated users can view internal notes" ON public.client_internal_notes;
DROP POLICY IF EXISTS "Authenticated users can create internal notes" ON public.client_internal_notes;
DROP POLICY IF EXISTS "Authenticated users can update internal notes" ON public.client_internal_notes;
DROP POLICY IF EXISTS "Authenticated users can delete internal notes" ON public.client_internal_notes;
DROP POLICY IF EXISTS "Staff can view internal notes" ON public.client_internal_notes;
DROP POLICY IF EXISTS "Staff can insert internal notes" ON public.client_internal_notes;
DROP POLICY IF EXISTS "Owner can update internal notes" ON public.client_internal_notes;
DROP POLICY IF EXISTS "Owner can delete internal notes" ON public.client_internal_notes;

CREATE POLICY "org members read internal notes"
  ON public.client_internal_notes FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "org members insert internal notes"
  ON public.client_internal_notes FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(org_id)
    AND auth.uid() = user_id
  );

CREATE POLICY "org members update internal notes"
  ON public.client_internal_notes FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "org members delete internal notes"
  ON public.client_internal_notes FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));
