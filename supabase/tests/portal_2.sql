-- Portal 2.0 integration/security smoke test. Safe to run against a linked
-- project: all fixtures and writes are rolled back.
BEGIN;
SET LOCAL search_path = public, auth, pg_temp;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (p.proname LIKE 'portal_%' OR p.proname IN ('is_portal_client', 'is_portal_order'))
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
  ) THEN
    RAISE EXCEPTION 'an anonymous role can execute a Portal 2.0 RPC';
  END IF;
END $$;

INSERT INTO public.organizations (id, slug, name) VALUES
  ('d3000000-0000-0000-0000-000000000001', 'portal2-test-a', 'Portal 2 Test A'),
  ('d4000000-0000-0000-0000-000000000001', 'portal2-test-b', 'Portal 2 Test B');

INSERT INTO auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('d1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'portal2-a@example.test', '', now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('d2000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'portal2-b@example.test', '', now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now());

INSERT INTO public.profiles (id, active_org_id, email) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001', 'portal2-a@example.test'),
  ('d2000000-0000-0000-0000-000000000001', 'd4000000-0000-0000-0000-000000000001', 'portal2-b@example.test')
ON CONFLICT (id) DO UPDATE SET active_org_id = excluded.active_org_id;

-- Portal accounts must not inherit staff access during this test.
DELETE FROM public.organization_members
WHERE user_id IN (
  'd1000000-0000-0000-0000-000000000001',
  'd2000000-0000-0000-0000-000000000001'
);

INSERT INTO public.clients (id, user_id, org_id, company_name, status) VALUES
  ('d5000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001', 'Portal Client A', 'active'),
  ('d6000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', 'd4000000-0000-0000-0000-000000000001', 'Portal Client B', 'active');

INSERT INTO public.client_portal_users (org_id, client_id, user_id) VALUES
  ('d3000000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001'),
  ('d4000000-0000-0000-0000-000000000001', 'd6000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001');

INSERT INTO public.service_orders
  (id, order_number, org_id, client_id, title, external_cost, created_by)
VALUES
  ('d7000000-0000-0000-0000-000000000001', 99, 'd4000000-0000-0000-0000-000000000001',
   'd6000000-0000-0000-0000-000000000001', 'Foreign order', 999,
   'd2000000-0000-0000-0000-000000000001');

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"d1000000-0000-0000-0000-000000000001","role":"authenticated"}';
SELECT set_config(
  'portal2.test_order',
  public.portal_create_service_order('Portal request', 'Integration test')::text,
  true
);

DO $$
DECLARE
  v_list jsonb := public.portal_list_service_orders();
  v_detail jsonb := public.portal_get_service_order(current_setting('portal2.test_order')::uuid);
BEGIN
  IF jsonb_array_length(v_list) <> 1 THEN
    RAISE EXCEPTION 'portal order list is not client-scoped: %', v_list;
  END IF;
  IF v_list::text LIKE '%external_cost%' OR v_detail::text LIKE '%external_cost%' THEN
    RAISE EXCEPTION 'internal costs leaked through portal read model';
  END IF;
  IF v_list @> '[{"id":"d7000000-0000-0000-0000-000000000001"}]'::jsonb THEN
    RAISE EXCEPTION 'cross-client order leaked through portal read model';
  END IF;
  IF EXISTS (SELECT 1 FROM public.service_orders) THEN
    RAISE EXCEPTION 'portal account gained direct service_orders visibility';
  END IF;
END $$;

RESET ROLE;

INSERT INTO public.service_order_questions
  (id, service_order_id, org_id, question, due_date, asked_by)
VALUES
  ('d8000000-0000-0000-0000-000000000001', current_setting('portal2.test_order')::uuid,
   'd3000000-0000-0000-0000-000000000001', 'Please confirm the registration', current_date + 2,
   'd2000000-0000-0000-0000-000000000001');

INSERT INTO public.service_order_checklist_items
  (id, service_order_id, org_id, title, created_by)
VALUES
  ('d9000000-0000-0000-0000-000000000001', current_setting('portal2.test_order')::uuid,
   'd3000000-0000-0000-0000-000000000001', 'Signed form',
   'd2000000-0000-0000-0000-000000000001');

INSERT INTO public.quotes
  (id, org_id, user_id, client_id, title, status, total, valid_until)
VALUES
  ('da000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001',
   'd2000000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001',
   'Portal quote', 'sent', 125, current_date + 5);

INSERT INTO public.invoices
  (id, user_id, org_id, client_id, amount, due_date, description)
VALUES
  ('db000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001',
   'd3000000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001',
   125, current_date + 10, 'Portal invoice');

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"d1000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT public.portal_answer_service_order_question(
  'd8000000-0000-0000-0000-000000000001', 'Confirmed'
);

SELECT public.portal_attach_checklist_document(
  'd9000000-0000-0000-0000-000000000001',
  'd3000000-0000-0000-0000-000000000001/service-orders/' || current_setting('portal2.test_order') || '/d9000000-0000-0000-0000-000000000001/form.pdf',
  'form.pdf'
);

SELECT public.portal_sign_service_order_document(
  current_setting('portal2.test_order')::uuid,
  'd9000000-0000-0000-0000-000000000001',
  'form.pdf', 'Portal Signer', 'portal2-a@example.test', 'data:image/png;base64,AA=='
);

SELECT public.portal_respond_quote(
  'da000000-0000-0000-0000-000000000001', 'accepted', 'Approved in test'
);

DO $$
DECLARE
  v_order uuid := current_setting('portal2.test_order')::uuid;
  v_valid_path text := 'd3000000-0000-0000-0000-000000000001/service-orders/' || v_order || '/d9000000-0000-0000-0000-000000000001/form.pdf';
  v_detail jsonb := public.portal_get_service_order(v_order);
BEGIN
  IF (v_detail #>> '{questions,0,status}') <> 'answered' THEN
    RAISE EXCEPTION 'portal answer was not persisted in the read model';
  END IF;
  IF jsonb_array_length(v_detail->'signatures') <> 1 THEN
    RAISE EXCEPTION 'portal signature was not persisted in the read model';
  END IF;
  IF (public.portal_list_quotes() #>> '{0,status}') <> 'accepted' THEN
    RAISE EXCEPTION 'portal quote decision was not persisted';
  END IF;
  IF jsonb_array_length(public.portal_list_invoices()) <> 1 THEN
    RAISE EXCEPTION 'portal invoice read model is not client-scoped';
  END IF;
  IF NOT public.portal_can_upload_service_order_document(v_valid_path) THEN
    RAISE EXCEPTION 'valid client upload path was rejected';
  END IF;
  IF public.portal_can_upload_service_order_document(
    'd4000000-0000-0000-0000-000000000001/service-orders/' || v_order || '/d9000000-0000-0000-0000-000000000001/form.pdf'
  ) THEN
    RAISE EXCEPTION 'cross-organization upload prefix was accepted';
  END IF;
  INSERT INTO storage.objects (bucket_id, name, owner, owner_id, metadata)
  VALUES (
    'permit-documents', v_valid_path, auth.uid(), auth.uid()::text,
    '{"mimetype":"application/pdf"}'::jsonb
  );
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner, owner_id, metadata)
    VALUES (
      'permit-documents', replace(v_valid_path, '.pdf', '.html'), auth.uid(), auth.uid()::text,
      '{"mimetype":"text/html"}'::jsonb
    );
    RAISE EXCEPTION 'unsafe client upload type was accepted';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner, owner_id, metadata)
    VALUES (
      'permit-documents', replace(v_valid_path, 'd3000000-0000-0000-0000-000000000001', 'd4000000-0000-0000-0000-000000000001'),
      auth.uid(), auth.uid()::text, '{"mimetype":"application/pdf"}'::jsonb
    );
    RAISE EXCEPTION 'cross-organization storage insert was accepted';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  IF EXISTS (SELECT 1 FROM public.quotes)
     OR EXISTS (SELECT 1 FROM public.invoices)
     OR EXISTS (SELECT 1 FROM public.document_signatures)
     OR EXISTS (SELECT 1 FROM public.service_order_questions) THEN
    RAISE EXCEPTION 'portal account gained direct access outside safe read models';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE type = 'portal_request' AND entity_id = v_order
  ) THEN
    RAISE EXCEPTION 'dated staff request did not create a portal notification';
  END IF;
  RAISE NOTICE 'Portal 2.0 integration and isolation checks passed';
END $$;

ROLLBACK;
