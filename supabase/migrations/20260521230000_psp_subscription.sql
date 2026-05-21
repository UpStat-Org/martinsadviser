-- ============================================================================
-- PSP (Pre-Employment Screening Program) subscription
--
-- FMCSA's PSP gives carriers access to a driver's roadside inspection and
-- crash history before they're hired. Subscription is per motor carrier
-- (per USDOT), not per driver. The agency tracks when each client signed up
-- so they can confirm the carrier is screening properly.
-- ============================================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS psp_subscribed_at date;

COMMENT ON COLUMN public.clients.psp_subscribed_at IS
  'Date the carrier subscribed to FMCSA PSP. NULL = not subscribed. Subscribing is a one-time event per USDOT.';
