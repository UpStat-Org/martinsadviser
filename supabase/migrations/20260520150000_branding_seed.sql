-- ============================================================================
-- Branding: seed the MartinsAdviser org with its display strings.
--
-- The `organizations.branding` column already exists (Week 1) as a free-form
-- jsonb with default '{}'. This migration just populates the cliente 0 row
-- with the canonical shape so the UI can read it without falling back to
-- hardcoded MartinsAdviser strings.
--
-- Shape consumed by the frontend (any missing key falls back to safe
-- defaults inside OrgContext, so future-additive — adding a key later does
-- not require a migration):
--   { "app_name": "MartinsAdviser", "tagline": "Adviser", "logo_url": null }
-- ============================================================================

UPDATE public.organizations
   SET branding = branding
                  || jsonb_build_object(
                       'app_name', 'MartinsAdviser',
                       'tagline',  'Adviser'
                     )
 WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;
