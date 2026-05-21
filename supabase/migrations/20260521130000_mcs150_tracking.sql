-- ============================================================================
-- MCS-150 biennial update tracking
--
-- Every motor carrier must update their MCS-150 registration every 2 years.
-- The due month is determined by the USDOT number per FMCSA's schedule
-- (https://www.fmcsa.dot.gov/registration/updating-your-registration):
--
--   - last digit of DOT → filing month (1=Jan, 2=Feb, ..., 9=Sep, 0=Oct)
--   - second-to-last digit → odd years (odd digit) or even years (even digit)
--
-- We store the last filing date so the next-due calc can override the
-- schedule lookup when we know it. Notifications get emitted when the next
-- due is within 90 days (and again at 30).
-- ============================================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS mcs_150_last_filed_at date;

COMMENT ON COLUMN public.clients.mcs_150_last_filed_at IS
  'Date of last MCS-150 biennial update filing. Used together with the DOT-derived schedule to compute the next due date.';
