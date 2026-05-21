-- ============================================================================
-- Trial expiration
--
-- Two pieces:
--
-- 1) handle_new_user (intent='new-org' branch) now sets trial_ends_at to
--    now() + 14 days. Self-serve signups need a clock for billing to ever
--    move them off `trialing`. Existing rows (pre-this-migration) get a
--    one-shot backfill below so the cron has something to expire.
--
-- 2) expire_trials() — promotes any non-master, no-subscription org whose
--    trial_ends_at is in the past from 'trialing' → 'past_due'. We don't
--    jump straight to 'suspended' so the owner still has the app's
--    past_due banner + 1-click Stripe portal to recover. A separate policy
--    can later suspend orgs that linger in past_due for >N days.
--
-- 3) A pg_cron job invokes the function daily at 03:00 UTC. pg_cron is
--    already enabled in this project (used by check-permit-expirations
--    and send-emails); we just add one more schedule.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Backfill trial_ends_at for new-org tenants that predate this migration.
--    These were created with NULL trial_ends_at so they'd live as trialing
--    forever; give them a 14-day window from now. Master orgs untouched.
-- ---------------------------------------------------------------------------

UPDATE public.organizations
   SET trial_ends_at = now() + interval '14 days'
 WHERE trial_ends_at IS NULL
   AND subscription_status = 'trialing'
   AND is_master_org = false;

-- ---------------------------------------------------------------------------
-- 2) Update handle_new_user to set trial_ends_at on self-serve org creation.
--    Only the intent='new-org' branch changes; the legacy branch is left
--    intact (those users join cliente 0, no trial of their own).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_org_id constant uuid := '00000000-0000-0000-0000-000000000001';
  v_intent  text := NEW.raw_user_meta_data->>'intent';
  v_slug    text := lower(trim(coalesce(NEW.raw_user_meta_data->>'slug', '')));
  v_name    text := trim(coalesce(NEW.raw_user_meta_data->>'org_name', ''));
  v_country text := upper(trim(coalesce(NEW.raw_user_meta_data->>'country', 'US')));
  v_org_id  uuid;
BEGIN
  IF v_intent = 'new-org' THEN
    IF v_slug = '' OR length(v_slug) < 2 OR v_slug !~ '^[a-z0-9][a-z0-9-]*$' THEN
      RAISE EXCEPTION 'invalid slug: %', v_slug;
    END IF;
    IF v_slug IN ('www','app','api','admin','status','martinsadviser') THEN
      RAISE EXCEPTION 'slug % is reserved', v_slug;
    END IF;
    IF v_name = '' THEN
      RAISE EXCEPTION 'org_name is required';
    END IF;
    IF v_country NOT IN ('US','BR','ES') THEN
      RAISE EXCEPTION 'country must be US, BR or ES';
    END IF;
    IF EXISTS (SELECT 1 FROM public.organizations WHERE slug = v_slug) THEN
      RAISE EXCEPTION 'slug % is already taken', v_slug;
    END IF;

    INSERT INTO public.organizations (slug, name, subscription_status, trial_ends_at)
    VALUES (v_slug, v_name, 'trialing', now() + interval '14 days')
    RETURNING id INTO v_org_id;

    INSERT INTO public.profiles (id, email, full_name, approval_status, active_org_id)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      'approved',
      v_org_id
    );

    INSERT INTO public.organization_members (organization_id, user_id, role, approval_status)
    VALUES (v_org_id, NEW.id, 'owner', 'approved');

    RETURN NEW;
  END IF;

  -- Default path unchanged: pending member of cliente 0.
  INSERT INTO public.profiles (id, email, full_name, approval_status, active_org_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'pending',
    default_org_id
  );

  INSERT INTO public.organization_members (organization_id, user_id, role, approval_status)
  VALUES (default_org_id, NEW.id, 'member', 'pending')
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3) expire_trials() — moves expired trials to past_due.
--    Skips orgs that already have a Stripe subscription (the webhook is
--    the source of truth for those) and master orgs (cliente 0 etc).
--    Returns the count of rows touched so the cron logs are useful.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.expire_trials()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.organizations
     SET subscription_status = 'past_due',
         updated_at = now()
   WHERE subscription_status = 'trialing'
     AND is_master_org = false
     AND stripe_subscription_id IS NULL
     AND trial_ends_at IS NOT NULL
     AND trial_ends_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_trials() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_trials() TO service_role;

-- ---------------------------------------------------------------------------
-- 4) Schedule: run daily at 03:00 UTC. The schedule string follows the
--    `cron.schedule(name, schedule, sql)` signature used by pg_cron and by
--    the existing check-permit-expirations job.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  -- Wipe a previous registration of the same name so re-running this
  -- migration is idempotent. cron.unschedule throws if the job doesn't
  -- exist, so swallow the error.
  BEGIN
    PERFORM cron.unschedule('expire-trials-daily');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  PERFORM cron.schedule(
    'expire-trials-daily',
    '0 3 * * *',
    $cron$ SELECT public.expire_trials(); $cron$
  );
END;
$$;
