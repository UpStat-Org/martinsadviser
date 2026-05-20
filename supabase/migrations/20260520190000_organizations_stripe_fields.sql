-- ============================================================================
-- Stripe billing: persistent fields on organizations
--
-- Flat $/org/month subscription. We don't track price/quantity because the
-- product has a single tier — every active org is on the same plan. If
-- tiers come back later, add a `stripe_price_id` column then.
--
-- Indexes:
--   stripe_customer_id has a unique partial index so the webhook can match
--   incoming events to the owning org in O(log n) without scanning. Partial
--   (WHERE NOT NULL) because most orgs start without a Stripe customer.
-- ============================================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id     text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS trial_ends_at          timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS organizations_stripe_customer_id_unique
  ON public.organizations (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS organizations_stripe_subscription_id_idx
  ON public.organizations (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
