-- ============================================================================
-- Master org flag
--
-- The MartinsAdviser org (cliente 0) is the SaaS operator's own tenant —
-- they're the ones running the platform, not a paying customer. Same idea
-- applies to any future "internal" org (staging accounts, demo accounts,
-- partner accounts on a special deal). Marking those with is_master_org
-- exempts them from the Stripe flow entirely:
--
--   - stripe-checkout refuses to create a session for them
--   - stripe-billing-portal refuses to open
--   - stripe-webhook ignores any incoming events for them, so even if a
--     subscription does get created out-of-band (manual test, leftover from
--     dev), it can't flip subscription_status away from 'active'
--
-- We also force the master org's subscription_status to 'active' here so
-- SubscriptionGate never blocks them. The Stripe IDs are nulled out — the
-- old test subscription from earlier today is effectively dropped (the
-- caller can cancel it in the Stripe Dashboard separately if they want
-- to clean up the customer object too).
-- ============================================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS is_master_org boolean NOT NULL DEFAULT false;

-- Promote MartinsAdviser. Other orgs that should also bypass billing can be
-- flipped manually via super-admin later (we don't expose this in the UI
-- because it's an "operator-only" setting).
UPDATE public.organizations
   SET is_master_org = true,
       subscription_status = 'active',
       stripe_subscription_id = NULL,
       trial_ends_at = NULL
 WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;
