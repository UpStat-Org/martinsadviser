-- ============================================================================
-- Permits — hazmat + border crossing metadata
--
-- Hazmat and border-crossing permits use the same `permits` table as the
-- existing IRP/IFTA/UCR/etc. — they're distinguished by `permit_type`
-- (already a free-text column) plus a new `metadata` jsonb for kind-specific
-- fields like hazmat class, UN number, CBP entry port, etc.
--
-- We don't introduce a separate table because the lifecycle (creation,
-- expiration, document attachment, scheduled_messages reminders) is
-- identical to other permits.
-- ============================================================================

ALTER TABLE public.permits
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.permits.metadata IS
  'Kind-specific fields. Hazmat: { hm_class, un_number, packing_group, shipping_name }. Border crossing: { port_code, entry_type, bond_number }. Free-form so future permit types don''t need migrations.';

CREATE INDEX IF NOT EXISTS idx_permits_metadata_gin ON public.permits USING gin (metadata);
