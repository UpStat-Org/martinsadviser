-- ============================================================================
-- New Entrant program tracking
--
-- After receiving a USDOT, a motor carrier enters an 18-month "New Entrant"
-- monitoring period. During this window FMCSA may conduct a Safety Audit
-- — failure ends the operating authority.
--
-- We only need a single date (program start) per client. Time-in-program,
-- audit deadlines and reminder thresholds are derived in code.
-- ============================================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS new_entrant_start_at date;

COMMENT ON COLUMN public.clients.new_entrant_start_at IS
  'Date the client entered the FMCSA New Entrant monitoring period (USDOT issue date). NULL = not currently a new entrant. The 18-month window starts from this date.';
