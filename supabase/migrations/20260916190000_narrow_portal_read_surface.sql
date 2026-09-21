-- Portal pages consume explicit SECURITY DEFINER read models. Avoid granting
-- direct table visibility that could expose columns added by future migrations
-- (for example Stripe session metadata or staff identifiers).
DROP POLICY IF EXISTS "portal users read their service order questions"
  ON public.service_order_questions;
DROP POLICY IF EXISTS "portal users read their signatures"
  ON public.document_signatures;
DROP POLICY IF EXISTS "portal users read their invoices"
  ON public.invoices;
DROP POLICY IF EXISTS "portal users read their quotes"
  ON public.quotes;
DROP POLICY IF EXISTS "portal users read their quote items"
  ON public.quote_items;

COMMENT ON FUNCTION public.portal_get_service_order(uuid) IS
  'Portal-safe service order read model; intentionally excludes internal costs and staff-only metadata.';
COMMENT ON FUNCTION public.portal_list_quotes() IS
  'Portal-safe quote read model; use instead of granting direct quote table visibility.';
COMMENT ON FUNCTION public.portal_list_invoices() IS
  'Portal-safe invoice read model; intentionally excludes Stripe checkout metadata.';
