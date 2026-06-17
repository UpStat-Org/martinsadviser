-- Driver compliance → task automation
--
-- generate-compliance-tasks gains three new driver deadline kinds
-- (cdlRenewal, medicalCardRenewal, mvrAnnual). They are gated per org by a new
-- `driver_enabled` flag on compliance_automation_settings, defaulting on so
-- existing orgs pick the deadlines up on the next daily run.
--
-- No change is needed to compliance_task_log.kind (it is free-form text with a
-- UNIQUE dedupe_key) nor to tasks.task_type (also unconstrained); the new kinds
-- flow through the existing dedupe-first machinery unchanged.

ALTER TABLE public.compliance_automation_settings
  ADD COLUMN IF NOT EXISTS driver_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.compliance_automation_settings.driver_enabled IS
  'When true, generate-compliance-tasks opens tasks for CDL renewals, medical card renewals and annual MVR pulls inside the org lead window.';
