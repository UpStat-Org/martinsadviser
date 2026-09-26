-- ============================================================================
-- Demo seed — fictional data for demos, screenshots and local development.
--
-- Every company, person, DOT/MC number and plate below is made up.
--
-- HOW TO LOAD (local stack only, never against production):
--   supabase start
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -v ON_ERROR_STOP=1 -f supabase/seed.demo.sql
--
-- Then sign in at /login with any of:
--   demo@dotpilot.test   (owner)   password: DemoPass123!
--   maria@dotpilot.test  (admin)   password: DemoPass123!
--   james@dotpilot.test  (admin)   password: DemoPass123!
--
-- Data lands in the master DotPilot org (00000000-0000-0000-0000-000000000001)
-- created by the migrations. Refuses to run twice.
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'demo@dotpilot.test') THEN
    RAISE EXCEPTION 'demo seed already loaded';
  END IF;
END $$;

-- Auth users. The on_auth_user_created trigger creates the matching profiles
-- and pending memberships in the master org; they are approved right after.
WITH u(email, full_name) AS (
  VALUES ('demo@dotpilot.test', 'Alex Carter'),
         ('maria@dotpilot.test', 'Maria Lopez'),
         ('james@dotpilot.test', 'James Walker')
), ins AS (
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                          created_at, updated_at, confirmation_token, recovery_token,
                          email_change_token_new, email_change)
  SELECT '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
         u.email, extensions.crypt('DemoPass123!', extensions.gen_salt('bf')),
         now(), '{"provider":"email","providers":["email"]}',
         jsonb_build_object('full_name', u.full_name),
         now(), now(), '', '', '', ''
  FROM u
  RETURNING id, email
)
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT gen_random_uuid(), ins.id, ins.id::text,
       jsonb_build_object('sub', ins.id::text, 'email', ins.email, 'email_verified', true),
       'email', now(), now(), now()
FROM ins;

UPDATE public.profiles SET approval_status = 'approved'
 WHERE email LIKE '%@dotpilot.test';
UPDATE public.organization_members m
   SET approval_status = 'approved',
       role = CASE WHEN p.email = 'demo@dotpilot.test' THEN 'owner'::org_role ELSE 'admin'::org_role END
  FROM public.profiles p
 WHERE p.id = m.user_id AND p.email LIKE '%@dotpilot.test';
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM public.profiles WHERE email LIKE '%@dotpilot.test'
ON CONFLICT DO NOTHING;

-- Business data.

DO $$
DECLARE
  v_org   constant uuid := '00000000-0000-0000-0000-000000000001';
  v_owner uuid := (SELECT id FROM profiles WHERE email = 'demo@dotpilot.test');
  v_maria uuid := (SELECT id FROM profiles WHERE email = 'maria@dotpilot.test');
  v_james uuid := (SELECT id FROM profiles WHERE email = 'james@dotpilot.test');
  v_staff uuid[];
  companies text[] := ARRAY[
    'Blue Ridge Freight LLC','Lone Star Haulers Inc','Great Lakes Logistics','Desert Sun Transport',
    'Pacific Crest Carriers','Iron Horse Trucking','Summit Line Express','Prairie Wind Freight',
    'Coastal Route Logistics','Red Canyon Transport','Evergreen Hauling Co','Keystone Freight Lines',
    'Magnolia Carriers LLC','Rocky Mountain Movers','Silver State Logistics','Big Sky Transport',
    'Harbor Point Freight','Northstar Carriers','Cedar Valley Trucking','Gulf Coast Haulers',
    'Twin Rivers Transport','Frontier Road Lines','Timberline Freight','Bayou Express LLC',
    'Golden Gate Carriers','Appalachian Freight Co'];
  states text[] := ARRAY['TX','NY','CA','FL','IL','OH','GA','AZ','NV','CO','TN','PA','WA','NC','MI','OK'];
  ptypes text[] := ARRAY['IRP','IFTA','UCR','Renew Apportioned','Oversize','Overweight','Trip Permit','Fuel Permit','Hazmat HM-126F','CBP ACE Manifest'];
  makes  text[] := ARRAY['Freightliner','Peterbilt','Kenworth','Volvo','International','Mack'];
  models text[] := ARRAY['Cascadia','579','T680','VNL 860','LT Series','Anthem'];
  first  text[] := ARRAY['Mike','Carlos','Linda','Robert','Ana','David','Sarah','Jose','Kevin','Rachel','Luis','Tom'];
  v_client uuid;
  v_truck  uuid;
  i int; j int; n int;
BEGIN
  v_staff := ARRAY[v_owner, v_maria, v_james];

  -- Seed rows are created months ago so the dashboard trend has history.
  FOR i IN 1..array_length(companies, 1) LOOP
    INSERT INTO clients (user_id, org_id, company_name, phone, email, address, ein, dot, mc, status,
                         service_ifta, service_ny, service_kyu, service_nm, registration_responsible,
                         country, mcs_150_last_filed_at, created_at, tags)
    VALUES (
      v_owner, v_org, companies[i],
      format('(%s) 555-%s', 200 + i * 17, lpad((1000 + i * 137)::text, 4, '0')),
      lower(regexp_replace(split_part(companies[i], ' ', 1) || split_part(companies[i], ' ', 2), '[^a-zA-Z]', '', 'g')) || '@example.com',
      format('%s Industrial Blvd, %s', 100 + i * 23, states[1 + (i % array_length(states, 1))]),
      format('9%s-%s', lpad((i * 7)::text, 1, '0'), lpad((4812300 + i * 911)::text, 7, '0')),
      (3100000 + i * 48271)::text,
      'MC-' || (880000 + i * 3917)::text,
      CASE WHEN i % 11 = 0 THEN 'pending' WHEN i % 13 = 0 THEN 'inactive' ELSE 'active' END,
      i % 2 = 0, i % 3 = 0, i % 4 = 0, i % 5 = 0,
      first[1 + (i % array_length(first, 1))],
      'US',
      current_date - (30 * (i % 20)),
      now() - make_interval(days => 20 + i * 7),
      CASE WHEN i % 4 = 0 THEN ARRAY['priority'] WHEN i % 5 = 0 THEN ARRAY['new'] ELSE ARRAY[]::text[] END
    ) RETURNING id INTO v_client;

    n := 1 + (i % 4);
    FOR j IN 1..n LOOP
      INSERT INTO trucks (client_id, user_id, org_id, plate, vin, year, make, model, status, taxable_gross_weight_lbs, created_at)
      VALUES (
        v_client, v_owner, v_org,
        format('%s%s-%s', chr(65 + (i % 26)), chr(65 + ((i + j) % 26)), lpad((1000 + i * 31 + j * 7)::text, 4, '0')),
        upper(substr(md5(i::text || '-' || j::text), 1, 17)),
        2016 + ((i + j) % 9),
        makes[1 + ((i + j) % 6)], models[1 + ((i + j) % 6)],
        CASE WHEN (i + j) % 9 = 0 THEN 'maintenance' ELSE 'active' END,
        80000,
        now() - make_interval(days => 15 + i * 6)
      ) RETURNING id INTO v_truck;

      -- 1-2 permits per truck, spread from already-expired to a year out.
      INSERT INTO permits (client_id, truck_id, user_id, org_id, permit_type, permit_number, state,
                           expiration_date, status, assigned_to, created_at)
      SELECT v_client, v_truck, v_owner, v_org,
             ptypes[1 + ((i * 3 + j + k) % array_length(ptypes, 1))],
             format('P-%s-%s', 2026, lpad((i * 100 + j * 10 + k)::text, 5, '0')),
             states[1 + ((i + j + k) % array_length(states, 1))],
             current_date + (((i * 37 + j * 53 + k * 29) % 400) - 25),
             'active',
             v_staff[1 + ((i + j + k) % 3)],
             now() - make_interval(days => 10 + i * 5)
      FROM generate_series(1, 1 + ((i + j) % 2)) AS k;
    END LOOP;

    -- Invoices: paid history over the last 6 months plus some open ones.
    INSERT INTO invoices (user_id, client_id, org_id, amount, status, due_date, paid_date, description, created_at)
    SELECT v_owner, v_client, v_org,
           (150 + ((i * 97 + m * 53) % 900))::numeric,
           CASE WHEN m = 0 AND i % 3 = 0 THEN 'pending' ELSE 'paid' END,
           (date_trunc('month', current_date) - make_interval(months => m))::date + 14,
           CASE WHEN m = 0 AND i % 3 = 0 THEN NULL
                ELSE (date_trunc('month', current_date) - make_interval(months => m))::date + (i % 20) END,
           (ARRAY['IFTA quarterly filing','IRP renewal','UCR registration','Permit service fee','MCS-150 update'])[1 + ((i + m) % 5)],
           now() - make_interval(months => m)
    FROM generate_series(0, 5) AS m
    WHERE (i + m) % 2 = 0 OR m = 0;
  END LOOP;

  -- Kanban tasks across every column.
  INSERT INTO tasks (user_id, org_id, client_id, name, status, task_type, priority, due_date, assigned_to, operator, notes)
  SELECT v_owner, v_org, c.id,
         (ARRAY['Quarterly IFTA return','Renew IRP cab card','File UCR 2027','Update MCS-150',
                'BOC-3 filing','NY HUT renewal','KYU license renewal','NM weight-distance permit',
                'Collect fuel receipts','Oversize route survey'])[1 + (rn % 10)],
         (ARRAY['not_started','waiting','in_progress','in_progress','completed','not_started'])[1 + (rn % 6)],
         (ARRAY['IFTA','Automatic','UCR','MCS-150','BOC-3','NY','KYU','NM','IFTA','Other'])[1 + (rn % 10)],
         (ARRAY['high','medium','low','medium'])[1 + (rn % 4)],
         current_date + ((rn * 5) % 30) - 6,
         v_staff[1 + (rn % 3)],
         (ARRAY['Alex','Maria','James'])[1 + (rn % 3)],
         NULL
  FROM (SELECT id, row_number() OVER (ORDER BY company_name)::int AS rn FROM clients WHERE org_id = v_org) c
  WHERE c.rn <= 16;

  -- A few expenses so profit views have data.
  INSERT INTO expenses (user_id, org_id, client_id, category, amount, description, incurred_on)
  SELECT v_owner, v_org, c.id,
         (ARRAY['state_fee','filing_fee','third_party','software','labor'])[1 + (rn % 5)],
         (40 + (rn * 37) % 400)::numeric,
         'Demo expense',
         current_date - (rn * 6)::int
  FROM (SELECT id, row_number() OVER (ORDER BY company_name)::int AS rn FROM clients WHERE org_id = v_org) c
  WHERE c.rn <= 20;
END $$;

COMMIT;
