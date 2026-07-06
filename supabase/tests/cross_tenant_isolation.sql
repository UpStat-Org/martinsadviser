-- ============================================================================
-- Cross-tenant isolation test suite
--
-- HOW TO RUN: paste this whole file in the Lovable SQL Editor and execute.
-- Everything is wrapped in BEGIN ... ROLLBACK, so no state persists after
-- the run (including the synthetic auth.users / orgs / data). If isolation
-- holds, you get one NOTICE per phase ending with a summary line. If any
-- table leaks data across orgs, the script raises an exception listing the
-- failing tables.
--
-- WHAT IT TESTS: for each of the 19 multi-tenant tables, asserts that a
-- user from Org B sees zero rows belonging to Org A, and vice versa. This
-- exercises every RLS SELECT policy under impersonation of an authenticated
-- user (not service_role, which would bypass RLS).
--
-- ASSUMPTIONS:
--   - Caller is postgres / service_role (Lovable SQL Editor satisfies this)
--   - DotPilot org id is 00000000-0000-0000-0000-000000000001
--   - The schema matches the multi-tenancy Week 1-3 migrations
-- ============================================================================

BEGIN;

-- Allow the test to run with elevated privileges first; we drop down to
-- "authenticated" only inside the assertion blocks.
SET LOCAL search_path = public, auth, pg_temp;

-- ---------------------------------------------------------------------------
-- 1) Synthetic auth.users + profiles + Org B + memberships
-- ---------------------------------------------------------------------------

-- Two synthetic users. Hardcoded UUIDs make assertion queries readable and
-- guarantee idempotency under ROLLBACK.
INSERT INTO auth.users
  (id, instance_id, aud, role, email, encrypted_password,
   email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '00000000-0000-0000-0000-000000000000'::uuid,
   'authenticated', 'authenticated', 'iso_a@isolation.test', '',
   now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '00000000-0000-0000-0000-000000000000'::uuid,
   'authenticated', 'authenticated', 'iso_b@isolation.test', '',
   now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());

-- Org B (Org A = DotPilot default, already exists)
INSERT INTO public.organizations (id, slug, name)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'isolation-test-b', 'IsolationTest B');

-- The handle_new_user trigger may have already created profile rows when
-- the auth.users rows were inserted. UPSERT to handle either case.
INSERT INTO public.profiles (id, active_org_id, email)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'iso_a@isolation.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'iso_b@isolation.test')
ON CONFLICT (id) DO UPDATE
  SET active_org_id = EXCLUDED.active_org_id;

-- Memberships (UPSERT in case handle_new_user added Org A membership for both)
INSERT INTO public.organization_members (organization_id, user_id, role, approval_status)
VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'admin', 'approved'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'admin', 'approved')
ON CONFLICT (organization_id, user_id) DO UPDATE
  SET role = EXCLUDED.role, approval_status = EXCLUDED.approval_status;

-- If handle_new_user auto-enrolled user B into Org A, remove that — user B
-- must only belong to Org B for the test to be meaningful.
DELETE FROM public.organization_members
 WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid
   AND user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid;

-- ---------------------------------------------------------------------------
-- 2) Seed one row per multi-tenant table in BOTH orgs.
--    IDs are deterministic so failures can be inspected.
--    Convention: A1.. for Org A row, B1.. for Org B row.
-- ---------------------------------------------------------------------------

-- clients
INSERT INTO public.clients (id, user_id, org_id, company_name, status) VALUES
  ('a1000000-0000-0000-0000-000000000001'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Iso Client A', 'active'),
  ('b1000000-0000-0000-0000-000000000001'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'Iso Client B', 'active');

-- trucks
INSERT INTO public.trucks (id, user_id, org_id, client_id, plate, status) VALUES
  ('a2000000-0000-0000-0000-000000000001'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'ISO-A-1', 'active'),
  ('b2000000-0000-0000-0000-000000000001'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'ISO-B-1', 'active');

-- permits
INSERT INTO public.permits (id, user_id, org_id, client_id, permit_type, status) VALUES
  ('a3000000-0000-0000-0000-000000000001'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'ISO_TYPE_A', 'active'),
  ('b3000000-0000-0000-0000-000000000001'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'ISO_TYPE_B', 'active');

-- permit_history
INSERT INTO public.permit_history (id, org_id, permit_id, changed_by, change_type) VALUES
  ('a4000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'a3000000-0000-0000-0000-000000000001'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'iso_test'),
  ('b4000000-0000-0000-0000-000000000001'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'b3000000-0000-0000-0000-000000000001'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'iso_test');

-- permit_documents
INSERT INTO public.permit_documents (id, org_id, permit_id, document_url) VALUES
  ('a5000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'a3000000-0000-0000-0000-000000000001'::uuid, 'iso://doc/a'),
  ('b5000000-0000-0000-0000-000000000001'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'b3000000-0000-0000-0000-000000000001'::uuid, 'iso://doc/b');

-- tasks
INSERT INTO public.tasks (id, user_id, org_id, name) VALUES
  ('a6000000-0000-0000-0000-000000000001'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'iso task A'),
  ('b6000000-0000-0000-0000-000000000001'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'iso task B');

-- invoices
INSERT INTO public.invoices (id, user_id, org_id, client_id, due_date) VALUES
  ('a7000000-0000-0000-0000-000000000001'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, '2099-01-01'),
  ('b7000000-0000-0000-0000-000000000001'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, '2099-01-01');

-- client_portal_users (portal user is itself an auth.user; we reuse iso_a/iso_b
-- as the portal accounts since the link table just needs a user_id+client_id)
INSERT INTO public.client_portal_users (id, org_id, client_id, user_id) VALUES
  ('a8000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
  ('b8000000-0000-0000-0000-000000000001'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid);

-- document_signatures
INSERT INTO public.document_signatures (id, org_id, client_id, user_id, document_name, signer_name, signature_data) VALUES
  ('a9000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'iso doc A', 'Iso Signer A', 'data:image/png;base64,A'),
  ('b9000000-0000-0000-0000-000000000001'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'iso doc B', 'Iso Signer B', 'data:image/png;base64,B');

-- notifications
INSERT INTO public.notifications (id, org_id, user_id, title, type) VALUES
  ('aa000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'iso notif A', 'iso'),
  ('bb000000-0000-0000-0000-000000000001'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'iso notif B', 'iso');

-- activity_log
INSERT INTO public.activity_log (id, org_id, user_id, entity_type, action) VALUES
  ('ac000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'iso', 'iso_test'),
  ('bc000000-0000-0000-0000-000000000001'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'iso', 'iso_test');

-- automation_rules
INSERT INTO public.automation_rules (id, user_id, org_id, name, body) VALUES
  ('ad000000-0000-0000-0000-000000000001'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'iso rule A', 'iso body'),
  ('bd000000-0000-0000-0000-000000000001'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'iso rule B', 'iso body');

-- automation_log
INSERT INTO public.automation_log (id, org_id, rule_id, permit_id) VALUES
  ('ae000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'ad000000-0000-0000-0000-000000000001'::uuid, 'a3000000-0000-0000-0000-000000000001'::uuid),
  ('be000000-0000-0000-0000-000000000001'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'bd000000-0000-0000-0000-000000000001'::uuid, 'b3000000-0000-0000-0000-000000000001'::uuid);

-- comments
INSERT INTO public.comments (id, org_id, user_id, body, entity_type, entity_id, user_name) VALUES
  ('af000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'iso comment A', 'permit', 'a3000000-0000-0000-0000-000000000001'::uuid, 'Iso A'),
  ('bf000000-0000-0000-0000-000000000001'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'iso comment B', 'permit', 'b3000000-0000-0000-0000-000000000001'::uuid, 'Iso B');

-- saved_filters
INSERT INTO public.saved_filters (id, org_id, user_id, name, page) VALUES
  ('a0100000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'iso filter A', 'permits'),
  ('b0100000-0000-0000-0000-000000000001'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'iso filter B', 'permits');

-- message_templates
INSERT INTO public.message_templates (id, org_id, user_id, name, body) VALUES
  ('a0200000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'iso tpl A', 'body A'),
  ('b0200000-0000-0000-0000-000000000001'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'iso tpl B', 'body B');

-- scheduled_messages
INSERT INTO public.scheduled_messages (id, org_id, user_id, client_id, body, scheduled_at) VALUES
  ('a0300000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'iso msg A', '2099-01-01'),
  ('b0300000-0000-0000-0000-000000000001'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'iso msg B', '2099-01-01');

-- client_internal_notes
INSERT INTO public.client_internal_notes (id, org_id, user_id, client_id, body, user_name) VALUES
  ('a0400000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'iso note A', 'Iso A'),
  ('b0400000-0000-0000-0000-000000000001'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'iso note B', 'Iso B');

-- ai_chat_messages
INSERT INTO public.ai_chat_messages (id, org_id, user_id, client_id, content, role) VALUES
  ('a0500000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'a1000000-0000-0000-0000-000000000001'::uuid, 'iso chat A', 'user'),
  ('b0500000-0000-0000-0000-000000000001'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'b1000000-0000-0000-0000-000000000001'::uuid, 'iso chat B', 'user');

-- ---------------------------------------------------------------------------
-- 3) Assertion blocks
--
-- The 19 tables under test. For each phase we set
--   SET LOCAL ROLE authenticated;
--   SET LOCAL request.jwt.claims = '{...sub: USER...}';
-- and then count rows belonging to the FOREIGN org. RLS must filter all
-- those rows out (count = 0). Any non-zero count is a leak and the script
-- aborts with a list of offending tables.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_tables text[] := ARRAY[
    'clients','trucks','permits','permit_history','permit_documents',
    'tasks','invoices','client_portal_users','document_signatures',
    'notifications','activity_log','automation_rules','automation_log',
    'comments','saved_filters','message_templates','scheduled_messages',
    'client_internal_notes','ai_chat_messages'
  ];
  v_count integer;
  v_failures text[] := ARRAY[]::text[];
  v_table text;
  v_org_a constant uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_org_b constant uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid;
BEGIN
  -- ------------------------------------------------
  -- Phase 1: User A → tries to read Org B's rows
  -- ------------------------------------------------
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

  FOREACH v_table IN ARRAY v_tables LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE org_id = $1', v_table)
      INTO v_count USING v_org_b;
    IF v_count > 0 THEN
      v_failures := v_failures || (v_table || ' [user_a→org_b]: ' || v_count::text);
    END IF;
  END LOOP;

  RESET ROLE;

  -- ------------------------------------------------
  -- Phase 2: User B → tries to read Org A's rows
  -- ------------------------------------------------
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';

  FOREACH v_table IN ARRAY v_tables LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE org_id = $1', v_table)
      INTO v_count USING v_org_a;
    IF v_count > 0 THEN
      v_failures := v_failures || (v_table || ' [user_b→org_a]: ' || v_count::text);
    END IF;
  END LOOP;

  RESET ROLE;

  -- ------------------------------------------------
  -- Report
  -- ------------------------------------------------
  IF array_length(v_failures, 1) IS NULL THEN
    RAISE NOTICE '✓ ISOLATION OK — % tables tested in both directions (% assertions)',
      array_length(v_tables, 1),
      array_length(v_tables, 1) * 2;
  ELSE
    RAISE EXCEPTION 'ISOLATION FAILURES: %', array_to_string(v_failures, '; ');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4) Sanity check: each user *can* read its own org rows (RLS not blocking
-- legitimate access). Catches the case where a policy is so strict that it
-- breaks the happy path. Just a single representative table — clients.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_count_a integer;
  v_count_b integer;
BEGIN
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
  SELECT count(*) INTO v_count_a FROM public.clients WHERE id = 'a1000000-0000-0000-0000-000000000001'::uuid;
  RESET ROLE;

  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';
  SELECT count(*) INTO v_count_b FROM public.clients WHERE id = 'b1000000-0000-0000-0000-000000000001'::uuid;
  RESET ROLE;

  IF v_count_a <> 1 OR v_count_b <> 1 THEN
    RAISE EXCEPTION 'HAPPY-PATH BROKEN: user A sees % of own client row, user B sees %', v_count_a, v_count_b;
  END IF;
  RAISE NOTICE '✓ Happy path: each user sees its own clients row';
END $$;

ROLLBACK;
