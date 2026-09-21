-- Client Portal 2.0: safe service requests, operational tracking, document
-- uploads/signatures, staff questions, quote responses and invoice payments.

-- ---------------------------------------------------------------------------
-- Portal ownership helpers. SECURITY DEFINER is intentional: portal accounts
-- are not organization members, so all access must be derived from the narrow
-- client_portal_users link rather than from tenant membership.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_portal_client(p_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_portal_users cpu
    WHERE cpu.user_id = auth.uid() AND cpu.client_id = p_client_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_portal_order(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.service_orders so
    JOIN public.client_portal_users cpu
      ON cpu.client_id = so.client_id AND cpu.org_id = so.org_id
    WHERE so.id = p_order_id AND cpu.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_portal_client(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_portal_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_portal_client(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_portal_order(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Questions / document requests sent by the team to the client.
-- ---------------------------------------------------------------------------

CREATE TABLE public.service_order_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  question text NOT NULL CHECK (length(btrim(question)) > 0),
  answer text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'resolved')),
  due_date date,
  asked_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  answered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  answered_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX service_order_questions_order_idx
  ON public.service_order_questions(service_order_id, status, due_date);
CREATE INDEX service_order_questions_org_idx
  ON public.service_order_questions(org_id, status);

CREATE OR REPLACE FUNCTION public.validate_service_order_question_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.service_orders so
    WHERE so.id = NEW.service_order_id AND so.org_id = NEW.org_id
  ) THEN
    RAISE EXCEPTION 'question must belong to the service order organization';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_service_order_question_scope_trigger
  BEFORE INSERT OR UPDATE OF service_order_id, org_id
  ON public.service_order_questions
  FOR EACH ROW EXECUTE FUNCTION public.validate_service_order_question_scope();

CREATE TRIGGER update_service_order_questions_updated_at
  BEFORE UPDATE ON public.service_order_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.service_order_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read service order questions"
  ON public.service_order_questions FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));
CREATE POLICY "org writers create service order questions"
  ON public.service_order_questions FOR INSERT TO authenticated
  WITH CHECK (public.can_org_write(org_id) AND asked_by = auth.uid());
CREATE POLICY "org writers update service order questions"
  ON public.service_order_questions FOR UPDATE TO authenticated
  USING (public.can_org_write(org_id)) WITH CHECK (public.can_org_write(org_id));
CREATE POLICY "org writers delete service order questions"
  ON public.service_order_questions FOR DELETE TO authenticated
  USING (public.can_org_write(org_id));
CREATE POLICY "portal users read their service order questions"
  ON public.service_order_questions FOR SELECT TO authenticated
  USING (public.is_portal_order(service_order_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_order_questions TO authenticated;
GRANT ALL ON public.service_order_questions TO service_role;

-- Notify every portal account linked to the client as soon as staff asks.
CREATE OR REPLACE FUNCTION public.notify_portal_service_order_question()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, org_id, type, title, body, entity_id)
  SELECT cpu.user_id, NEW.org_id, 'portal_request', 'Nova solicitação', NEW.question, NEW.service_order_id
  FROM public.client_portal_users cpu
  JOIN public.service_orders so ON so.id = NEW.service_order_id AND so.client_id = cpu.client_id
  WHERE cpu.org_id = NEW.org_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_portal_service_order_question_trigger
  AFTER INSERT ON public.service_order_questions
  FOR EACH ROW EXECUTE FUNCTION public.notify_portal_service_order_question();

-- Portal accounts can receive/read their own notifications even though they
-- deliberately are not organization_members.
CREATE POLICY "portal users read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM public.client_portal_users cpu
      WHERE cpu.user_id = auth.uid() AND cpu.org_id = notifications.org_id
    )
  );
CREATE POLICY "portal users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM public.client_portal_users cpu
      WHERE cpu.user_id = auth.uid() AND cpu.org_id = notifications.org_id
    )
  )
  WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM public.client_portal_users cpu
      WHERE cpu.user_id = auth.uid() AND cpu.org_id = notifications.org_id
    )
  );

-- ---------------------------------------------------------------------------
-- Quotes, signatures and invoice payment metadata.
-- ---------------------------------------------------------------------------

ALTER TABLE public.quotes
  ADD COLUMN client_response_note text,
  ADD COLUMN client_responded_at timestamptz,
  ADD COLUMN client_responded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.document_signatures
  ADD COLUMN service_order_id uuid REFERENCES public.service_orders(id) ON DELETE SET NULL,
  ADD COLUMN checklist_item_id uuid REFERENCES public.service_order_checklist_items(id) ON DELETE SET NULL;

CREATE INDEX document_signatures_service_order_idx
  ON public.document_signatures(service_order_id) WHERE service_order_id IS NOT NULL;

ALTER TABLE public.invoices
  ADD COLUMN stripe_checkout_session_id text,
  ADD COLUMN stripe_payment_intent_id text,
  ADD COLUMN paid_via text;

CREATE UNIQUE INDEX invoices_stripe_checkout_session_unique
  ON public.invoices(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE POLICY "portal users read their signatures"
  ON public.document_signatures FOR SELECT TO authenticated
  USING (public.is_portal_client(client_id));
CREATE POLICY "portal users read their invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (public.is_portal_client(client_id));
CREATE POLICY "portal users read their quotes"
  ON public.quotes FOR SELECT TO authenticated
  USING (client_id IS NOT NULL AND public.is_portal_client(client_id) AND status <> 'draft');
CREATE POLICY "portal users read their quote items"
  ON public.quote_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_items.quote_id
        AND q.client_id IS NOT NULL
        AND q.status <> 'draft'
        AND public.is_portal_client(q.client_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Read models. Returning JSON keeps the portal contract deliberately narrow:
-- internal costs, audit metadata and staff-only notes never leave the server.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.portal_list_services()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'name', s.name,
    'description', s.description,
    'default_price', s.default_price,
    'billing_type', s.billing_type
  ) ORDER BY s.name), '[]'::jsonb)
  FROM public.services s
  JOIN public.client_portal_users cpu ON cpu.org_id = s.org_id
  WHERE cpu.user_id = auth.uid() AND s.active = true;
$$;

CREATE OR REPLACE FUNCTION public.portal_list_service_orders()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', so.id,
    'order_number', so.order_number,
    'title', so.title,
    'description', so.description,
    'status', so.status,
    'priority', so.priority,
    'due_date', so.due_date,
    'sla_hours', so.sla_hours,
    'quoted_amount', so.quoted_amount,
    'currency', so.currency,
    'created_at', so.created_at,
    'updated_at', so.updated_at,
    'renewal_of_id', so.renewal_of_id,
    'service_name', s.name,
    'assignee_name', p.full_name,
    'pending_documents', (
      SELECT count(*) FROM public.service_order_checklist_items ci
      WHERE ci.service_order_id = so.id AND ci.required = true
        AND ci.status IN ('pending', 'rejected')
    ),
    'open_requests', (
      SELECT count(*) FROM public.service_order_questions q
      WHERE q.service_order_id = so.id AND q.status = 'pending'
    )
  ) ORDER BY so.created_at DESC), '[]'::jsonb)
  FROM public.service_orders so
  JOIN public.client_portal_users cpu
    ON cpu.client_id = so.client_id AND cpu.org_id = so.org_id
  LEFT JOIN public.services s ON s.id = so.service_id
  LEFT JOIN public.profiles p ON p.id = so.assigned_to
  WHERE cpu.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.portal_get_service_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_portal_order(p_order_id) THEN
    RAISE EXCEPTION 'service order not found' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'id', so.id,
    'org_id', so.org_id,
    'client_id', so.client_id,
    'order_number', so.order_number,
    'title', so.title,
    'description', so.description,
    'status', so.status,
    'priority', so.priority,
    'due_date', so.due_date,
    'sla_hours', so.sla_hours,
    'quoted_amount', so.quoted_amount,
    'currency', so.currency,
    'started_at', so.started_at,
    'submitted_at', so.submitted_at,
    'approved_at', so.approved_at,
    'completed_at', so.completed_at,
    'created_at', so.created_at,
    'updated_at', so.updated_at,
    'renewal_of_id', so.renewal_of_id,
    'service_name', s.name,
    'assignee_name', p.full_name,
    'checklist', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', ci.id, 'title', ci.title, 'description', ci.description,
        'required', ci.required, 'status', ci.status,
        'document_path', ci.document_path, 'file_name', ci.file_name,
        'rejection_reason', ci.rejection_reason, 'due_date', ci.due_date,
        'updated_at', ci.updated_at
      ) ORDER BY ci.sort_order, ci.created_at)
      FROM public.service_order_checklist_items ci WHERE ci.service_order_id = so.id
    ), '[]'::jsonb),
    'permits', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', pe.id, 'permit_type', pe.permit_type,
        'permit_number', pe.permit_number, 'status', pe.status,
        'expiration_date', pe.expiration_date, 'state', pe.state
      ) ORDER BY pe.permit_type)
      FROM public.service_order_permits sop
      JOIN public.permits pe ON pe.id = sop.permit_id
      WHERE sop.service_order_id = so.id
    ), '[]'::jsonb),
    'questions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', q.id, 'question', q.question, 'answer', q.answer,
        'status', q.status, 'due_date', q.due_date,
        'answered_at', q.answered_at, 'created_at', q.created_at
      ) ORDER BY q.created_at DESC)
      FROM public.service_order_questions q WHERE q.service_order_id = so.id
    ), '[]'::jsonb),
    'signatures', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', ds.id, 'checklist_item_id', ds.checklist_item_id,
        'document_name', ds.document_name, 'signer_name', ds.signer_name,
        'signer_email', ds.signer_email, 'signed_at', ds.signed_at,
        'signature_data', ds.signature_data
      ) ORDER BY ds.signed_at DESC)
      FROM public.document_signatures ds WHERE ds.service_order_id = so.id
    ), '[]'::jsonb),
    'timeline', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', ev.id, 'event_type', ev.event_type,
        'from_value', ev.from_value, 'to_value', ev.to_value,
        'created_at', ev.created_at
      ) ORDER BY ev.created_at DESC)
      FROM public.service_order_events ev
      WHERE ev.service_order_id = so.id
        AND ev.event_type IN ('created', 'status_changed', 'due_date_changed',
          'checklist_changed', 'permit_linked', 'permit_unlinked')
    ), '[]'::jsonb)
  ) INTO result
  FROM public.service_orders so
  LEFT JOIN public.services s ON s.id = so.service_id
  LEFT JOIN public.profiles p ON p.id = so.assigned_to
  WHERE so.id = p_order_id;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_list_quotes()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', q.id, 'quote_number', q.quote_number, 'title', q.title,
    'status', q.status, 'valid_until', q.valid_until, 'notes', q.notes,
    'discount', q.discount, 'subtotal', q.subtotal, 'total', q.total,
    'sent_at', q.sent_at, 'accepted_at', q.accepted_at,
    'client_response_note', q.client_response_note,
    'client_responded_at', q.client_responded_at,
    'created_at', q.created_at,
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', qi.id, 'description', qi.description, 'quantity', qi.quantity,
        'unit_price', qi.unit_price, 'billing_type', qi.billing_type,
        'position', qi.position
      ) ORDER BY qi.position)
      FROM public.quote_items qi WHERE qi.quote_id = q.id
    ), '[]'::jsonb)
  ) ORDER BY q.created_at DESC), '[]'::jsonb)
  FROM public.quotes q
  JOIN public.client_portal_users cpu
    ON cpu.client_id = q.client_id AND cpu.org_id = q.org_id
  WHERE cpu.user_id = auth.uid() AND q.status <> 'draft';
$$;

CREATE OR REPLACE FUNCTION public.portal_list_invoices()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', i.id, 'amount', i.amount, 'status', i.status,
    'due_date', i.due_date, 'paid_date', i.paid_date,
    'description', i.description, 'paid_via', i.paid_via,
    'created_at', i.created_at
  ) ORDER BY i.due_date DESC), '[]'::jsonb)
  FROM public.invoices i
  JOIN public.client_portal_users cpu
    ON cpu.client_id = i.client_id AND cpu.org_id = i.org_id
  WHERE cpu.user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Narrow write functions for portal actions.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.portal_create_service_order(
  p_title text,
  p_description text DEFAULT NULL,
  p_service_id uuid DEFAULT NULL,
  p_renewal_of_id uuid DEFAULT NULL,
  p_permit_ids uuid[] DEFAULT '{}'::uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_client uuid;
  v_org uuid;
  v_currency text;
  v_order uuid;
BEGIN
  SELECT cpu.client_id, cpu.org_id, o.currency
  INTO v_client, v_org, v_currency
  FROM public.client_portal_users cpu
  JOIN public.organizations o ON o.id = cpu.org_id
  WHERE cpu.user_id = auth.uid()
  LIMIT 1;

  IF v_client IS NULL THEN RAISE EXCEPTION 'portal access required' USING ERRCODE = '42501'; END IF;
  IF length(btrim(COALESCE(p_title, ''))) = 0 THEN RAISE EXCEPTION 'title is required'; END IF;
  IF p_service_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.services s WHERE s.id = p_service_id AND s.org_id = v_org AND s.active = true
  ) THEN RAISE EXCEPTION 'service is not available'; END IF;
  IF p_renewal_of_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.service_orders so
    WHERE so.id = p_renewal_of_id AND so.org_id = v_org AND so.client_id = v_client
  ) THEN RAISE EXCEPTION 'renewal order is not available'; END IF;

  INSERT INTO public.service_orders (
    org_id, client_id, service_id, renewal_of_id, title, description,
    status, priority, quoted_amount, external_cost, currency, created_by
  ) VALUES (
    v_org, v_client, p_service_id, p_renewal_of_id, btrim(p_title), NULLIF(btrim(p_description), ''),
    'requested', 'normal', 0, 0, COALESCE(v_currency, 'USD'), auth.uid()
  ) RETURNING id INTO v_order;

  INSERT INTO public.service_order_permits (service_order_id, permit_id, org_id)
  SELECT v_order, p.id, v_org
  FROM public.permits p
  WHERE p.id = ANY(COALESCE(p_permit_ids, '{}'::uuid[]))
    AND p.org_id = v_org AND p.client_id = v_client;

  RETURN v_order;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_answer_service_order_question(
  p_question_id uuid,
  p_answer text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order uuid;
  v_org uuid;
  v_recipient uuid;
BEGIN
  SELECT q.service_order_id, q.org_id, COALESCE(so.assigned_to, so.created_by)
  INTO v_order, v_org, v_recipient
  FROM public.service_order_questions q
  JOIN public.service_orders so ON so.id = q.service_order_id
  WHERE q.id = p_question_id AND q.status <> 'resolved';

  IF v_order IS NULL OR NOT public.is_portal_order(v_order) THEN
    RAISE EXCEPTION 'question not found' USING ERRCODE = '42501';
  END IF;
  IF length(btrim(COALESCE(p_answer, ''))) = 0 THEN RAISE EXCEPTION 'answer is required'; END IF;

  UPDATE public.service_order_questions
  SET answer = btrim(p_answer), status = 'answered', answered_by = auth.uid(), answered_at = now()
  WHERE id = p_question_id;

  INSERT INTO public.notifications (user_id, org_id, type, title, body, entity_id)
  VALUES (v_recipient, v_org, 'portal_answer', 'Cliente respondeu uma solicitação', btrim(p_answer), v_order);
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_attach_checklist_document(
  p_item_id uuid,
  p_document_path text,
  p_file_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order uuid;
  v_org uuid;
BEGIN
  SELECT ci.service_order_id, ci.org_id INTO v_order, v_org
  FROM public.service_order_checklist_items ci WHERE ci.id = p_item_id;
  IF v_order IS NULL OR NOT public.is_portal_order(v_order) THEN
    RAISE EXCEPTION 'checklist item not found' USING ERRCODE = '42501';
  END IF;
  IF p_document_path NOT LIKE v_org::text || '/service-orders/' || v_order::text || '/' || p_item_id::text || '/%' THEN
    RAISE EXCEPTION 'invalid document path';
  END IF;

  UPDATE public.service_order_checklist_items
  SET document_path = p_document_path,
      file_name = left(NULLIF(btrim(p_file_name), ''), 255),
      status = CASE WHEN status IN ('pending', 'rejected') THEN 'received' ELSE status END,
      rejection_reason = NULL
  WHERE id = p_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_sign_service_order_document(
  p_order_id uuid,
  p_checklist_item_id uuid,
  p_document_name text,
  p_signer_name text,
  p_signer_email text,
  p_signature_data text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_client uuid;
  v_org uuid;
  v_signature uuid;
BEGIN
  SELECT so.client_id, so.org_id INTO v_client, v_org
  FROM public.service_orders so WHERE so.id = p_order_id;
  IF v_client IS NULL OR NOT public.is_portal_order(p_order_id) THEN
    RAISE EXCEPTION 'service order not found' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.service_order_checklist_items ci
    WHERE ci.id = p_checklist_item_id AND ci.service_order_id = p_order_id
      AND ci.document_path IS NOT NULL
  ) THEN RAISE EXCEPTION 'document is not available for signature'; END IF;
  IF length(btrim(COALESCE(p_signer_name, ''))) = 0 THEN RAISE EXCEPTION 'signer name is required'; END IF;
  IF p_signature_data NOT LIKE 'data:image/png;base64,%' OR length(p_signature_data) > 1000000 THEN
    RAISE EXCEPTION 'invalid signature data';
  END IF;

  INSERT INTO public.document_signatures (
    user_id, client_id, org_id, service_order_id, checklist_item_id,
    document_name, signer_name, signer_email, signature_data
  ) VALUES (
    auth.uid(), v_client, v_org, p_order_id, p_checklist_item_id,
    left(btrim(p_document_name), 255), left(btrim(p_signer_name), 255),
    left(NULLIF(btrim(p_signer_email), ''), 320), p_signature_data
  ) RETURNING id INTO v_signature;
  RETURN v_signature;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_respond_quote(
  p_quote_id uuid,
  p_decision text,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_quote public.quotes%ROWTYPE;
BEGIN
  IF p_decision NOT IN ('accepted', 'rejected') THEN RAISE EXCEPTION 'invalid decision'; END IF;
  SELECT q.* INTO v_quote FROM public.quotes q WHERE q.id = p_quote_id;
  IF v_quote.id IS NULL OR v_quote.client_id IS NULL OR NOT public.is_portal_client(v_quote.client_id) THEN
    RAISE EXCEPTION 'quote not found' USING ERRCODE = '42501';
  END IF;
  IF v_quote.status <> 'sent' THEN RAISE EXCEPTION 'quote is no longer awaiting response'; END IF;
  IF v_quote.valid_until IS NOT NULL AND v_quote.valid_until < current_date THEN
    UPDATE public.quotes SET status = 'expired' WHERE id = p_quote_id;
    RAISE EXCEPTION 'quote has expired';
  END IF;

  UPDATE public.quotes
  SET status = p_decision,
      accepted_at = CASE WHEN p_decision = 'accepted' THEN now() ELSE accepted_at END,
      client_response_note = NULLIF(btrim(p_note), ''),
      client_responded_at = now(),
      client_responded_by = auth.uid()
  WHERE id = p_quote_id;

  INSERT INTO public.notifications (user_id, org_id, type, title, body, entity_id)
  VALUES (
    v_quote.user_id, v_quote.org_id, 'quote_response',
    CASE WHEN p_decision = 'accepted' THEN 'Proposta aprovada pelo cliente' ELSE 'Proposta recusada pelo cliente' END,
    COALESCE(NULLIF(btrim(p_note), ''), v_quote.title), v_quote.id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.portal_list_services() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.portal_list_service_orders() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.portal_get_service_order(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.portal_list_quotes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.portal_list_invoices() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.portal_create_service_order(text, text, uuid, uuid, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.portal_answer_service_order_question(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.portal_attach_checklist_document(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.portal_sign_service_order_document(uuid, uuid, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.portal_respond_quote(uuid, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.portal_list_services() TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_list_service_orders() TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_get_service_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_list_quotes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_list_invoices() TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_create_service_order(text, text, uuid, uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_answer_service_order_question(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_attach_checklist_document(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_sign_service_order_document(uuid, uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_respond_quote(uuid, text, text) TO authenticated;

-- Storage access is limited to the order/item hierarchy validated again by
-- portal_attach_checklist_document before the path is persisted.
CREATE POLICY "portal users upload service order documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'permit-documents'
    AND (storage.foldername(name))[2] = 'service-orders'
    AND (storage.foldername(name))[3] ~* '^[0-9a-f-]{36}$'
    AND public.is_portal_order(((storage.foldername(name))[3])::uuid)
  );

CREATE OR REPLACE FUNCTION public.portal_can_read_service_order_document(p_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.service_order_checklist_items ci
    WHERE ci.document_path = p_path AND public.is_portal_order(ci.service_order_id)
  );
$$;
REVOKE ALL ON FUNCTION public.portal_can_read_service_order_document(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_can_read_service_order_document(text) TO authenticated;

CREATE POLICY "portal users read service order documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'permit-documents'
    AND public.portal_can_read_service_order_document(name)
  );

COMMENT ON TABLE public.service_order_questions IS
  'Dated questions and document requests shared between staff and client portal users.';
