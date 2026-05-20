-- ============================================================================
-- Feature flags: normalize the shape of organizations.feature_flags
--
-- The Week 1 foundation seeded MartinsAdviser with an ad-hoc set of flags
-- (permits/trucks/kanban/ai/portal/calendar). Those were placeholders; the
-- canonical Mês 2 shape is the 8 flags below — covering only modules that
-- are genuinely gateable per tenant. Core CRUD (clients/trucks/permits/
-- tasks/admin/settings/dashboard) is always on and not flag-controlled.
--
--   messages       /messages + scheduled email/WhatsApp
--   calendar       /calendar + Google Calendar integration
--   ai_chat        AI chat drawer (ai-chat edge function)
--   ai_reports     AI client report (ai-report edge function)
--   finance        /finance + invoices
--   portal         /portal + client_portal_users + document_signatures
--   automations    automation_rules + check-permit-expirations cron
--   audit_log      /audit page (triggers still run regardless)
--
-- Strategy:
--   - New orgs default to ALL flags on (premium-like trial experience).
--     Billing in Mês 3 will downgrade based on subscription_status.
--   - MartinsAdviser explicitly set to all on (it's the cliente 0).
--   - Existing orgs (only MartinsAdviser today) have feature_flags rewritten
--     to the canonical shape to avoid stale keys in the JSON.
--
-- Forward compatibility: reading code uses defaults if a key is missing,
-- so adding a new flag in the future doesn't require a migration to fill
-- it on every org.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Replace the column default with the canonical shape.
-- ---------------------------------------------------------------------------

ALTER TABLE public.organizations
  ALTER COLUMN feature_flags SET DEFAULT jsonb_build_object(
    'messages',    true,
    'calendar',    true,
    'ai_chat',     true,
    'ai_reports',  true,
    'finance',     true,
    'portal',      true,
    'automations', true,
    'audit_log',   true
  );

-- ---------------------------------------------------------------------------
-- 2) Rewrite existing rows to the canonical shape. Today this only affects
-- the MartinsAdviser seed, but we run it generically against every row so
-- the table is in a clean state regardless of what got inserted earlier.
-- ---------------------------------------------------------------------------

UPDATE public.organizations
   SET feature_flags = jsonb_build_object(
     'messages',    true,
     'calendar',    true,
     'ai_chat',     true,
     'ai_reports',  true,
     'finance',     true,
     'portal',      true,
     'automations', true,
     'audit_log',   true
   );
