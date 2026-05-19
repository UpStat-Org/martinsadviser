-- ============================================================================
-- Multi-tenancy: notifications, activity_log, automation_rules, automation_log
-- Phase 1, Week 2 (tables 10-13 of 20).
--
-- These are system/audit tables. Two of them (notifications via
-- generate-notifications and automation_log via check-permit-expirations)
-- receive INSERTs from edge functions running as service_role, which means
-- the DEFAULT current_org_id() yields NULL there. Those functions MUST be
-- deployed with the matching patch (org_id passed explicitly) BEFORE this
-- migration is applied, otherwise their next invocation will fail the
-- NOT NULL check.
--
-- Behavioral parity preserved:
--   - notifications: per-user (you only see/manage yours), now also org-scoped
--   - activity_log:  org-wide read (was team-wide), per-user insert
--   - automation_rules: per-user (yours only), now also org-scoped
--   - automation_log:  per-rule-owner (preserved via EXISTS) + org-scoped
--
-- Order within batch: automation_rules before automation_log (child JOINs).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) automation_rules (parent)
-- ---------------------------------------------------------------------------

ALTER TABLE public.automation_rules
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.automation_rules
  SET org_id = '00000000-0000-0000-0000-000000000001'
  WHERE org_id IS NULL;

ALTER TABLE public.automation_rules
  ALTER COLUMN org_id SET NOT NULL,
  ALTER COLUMN org_id SET DEFAULT public.current_org_id();

CREATE INDEX idx_automation_rules_org_id ON public.automation_rules(org_id);

DROP POLICY IF EXISTS "Users can view own rules" ON public.automation_rules;
DROP POLICY IF EXISTS "Users can create own rules" ON public.automation_rules;
DROP POLICY IF EXISTS "Users can update own rules" ON public.automation_rules;
DROP POLICY IF EXISTS "Users can delete own rules" ON public.automation_rules;

CREATE POLICY "users read own rules in org"
  ON public.automation_rules FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND public.is_org_member(org_id));

CREATE POLICY "users create own rules in org"
  ON public.automation_rules FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_org_member(org_id));

CREATE POLICY "users update own rules in org"
  ON public.automation_rules FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.is_org_member(org_id))
  WITH CHECK (auth.uid() = user_id AND public.is_org_member(org_id));

CREATE POLICY "users delete own rules in org"
  ON public.automation_rules FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.is_org_member(org_id));

-- ---------------------------------------------------------------------------
-- 2) automation_log (child of automation_rules) -- backfill via JOIN
-- ---------------------------------------------------------------------------

ALTER TABLE public.automation_log
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.automation_log al
  SET org_id = ar.org_id
  FROM public.automation_rules ar
  WHERE al.rule_id = ar.id AND al.org_id IS NULL;

ALTER TABLE public.automation_log
  ALTER COLUMN org_id SET NOT NULL,
  ALTER COLUMN org_id SET DEFAULT public.current_org_id();

CREATE INDEX idx_automation_log_org_id ON public.automation_log(org_id);

DROP POLICY IF EXISTS "Users can view own logs" ON public.automation_log;
DROP POLICY IF EXISTS "Users can insert own logs" ON public.automation_log;
DROP POLICY IF EXISTS "Service can insert logs" ON public.automation_log;

-- Preserves per-rule-owner visibility (EXISTS check) and adds org-scope.
CREATE POLICY "rule owners read logs in org"
  ON public.automation_log FOR SELECT TO authenticated
  USING (
    public.is_org_member(org_id)
    AND EXISTS (
      SELECT 1 FROM public.automation_rules
      WHERE id = automation_log.rule_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "rule owners insert logs in org"
  ON public.automation_log FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(org_id)
    AND EXISTS (
      SELECT 1 FROM public.automation_rules
      WHERE id = automation_log.rule_id
        AND user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 3) notifications (independent; receives INSERTs from generate-notifications)
-- ---------------------------------------------------------------------------

ALTER TABLE public.notifications
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.notifications
  SET org_id = '00000000-0000-0000-0000-000000000001'
  WHERE org_id IS NULL;

ALTER TABLE public.notifications
  ALTER COLUMN org_id SET NOT NULL,
  ALTER COLUMN org_id SET DEFAULT public.current_org_id();

CREATE INDEX idx_notifications_org_id ON public.notifications(org_id);

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

CREATE POLICY "users read own notifications in org"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND public.is_org_member(org_id));

CREATE POLICY "users update own notifications in org"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.is_org_member(org_id))
  WITH CHECK (auth.uid() = user_id AND public.is_org_member(org_id));

CREATE POLICY "users delete own notifications in org"
  ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.is_org_member(org_id));

-- INSERT policy retained for authenticated paths (e.g., self-created
-- notifications). The cron-triggered generate-notifications function uses
-- service_role and bypasses RLS entirely; org_id is passed explicitly there.
CREATE POLICY "users insert own notifications in org"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_org_member(org_id));

-- ---------------------------------------------------------------------------
-- 4) activity_log (independent; client_id may be NULL, fallback to default org)
-- ---------------------------------------------------------------------------

ALTER TABLE public.activity_log
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT;

-- Backfill via client_id when present, default org otherwise.
UPDATE public.activity_log al
  SET org_id = COALESCE(
    (SELECT c.org_id FROM public.clients c WHERE c.id = al.client_id),
    '00000000-0000-0000-0000-000000000001'::uuid
  )
  WHERE al.org_id IS NULL;

ALTER TABLE public.activity_log
  ALTER COLUMN org_id SET NOT NULL,
  ALTER COLUMN org_id SET DEFAULT public.current_org_id();

CREATE INDEX idx_activity_log_org_id ON public.activity_log(org_id);

DROP POLICY IF EXISTS "Authenticated users can view activity logs" ON public.activity_log;
DROP POLICY IF EXISTS "Users can insert own activity logs" ON public.activity_log;

CREATE POLICY "org members read activity logs"
  ON public.activity_log FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "org members insert own activity logs"
  ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(org_id)
    AND auth.uid() = user_id
  );
