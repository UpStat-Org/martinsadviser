-- First-class renewals and complete audit coverage for commercial/scope edits.

ALTER TABLE public.service_orders
  ADD COLUMN renewal_of_id uuid REFERENCES public.service_orders(id) ON DELETE SET NULL;

CREATE INDEX service_orders_renewal_of_idx ON public.service_orders(renewal_of_id)
  WHERE renewal_of_id IS NOT NULL;

ALTER TABLE public.service_order_events
  DROP CONSTRAINT service_order_events_event_type_check;
ALTER TABLE public.service_order_events
  ADD CONSTRAINT service_order_events_event_type_check CHECK (event_type IN (
    'created', 'status_changed', 'assignment_changed', 'due_date_changed',
    'details_changed', 'checklist_changed', 'permit_linked', 'permit_unlinked', 'note'
  ));

CREATE OR REPLACE FUNCTION public.validate_service_order_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = NEW.client_id AND c.org_id = NEW.org_id
  ) THEN
    RAISE EXCEPTION 'client must belong to the service order organization';
  END IF;

  IF NEW.service_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = NEW.service_id AND s.org_id = NEW.org_id
  ) THEN
    RAISE EXCEPTION 'service must belong to the service order organization';
  END IF;

  IF NEW.assigned_to IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = NEW.org_id
      AND om.user_id = NEW.assigned_to
      AND om.approval_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'assignee must be an approved member of the service order organization';
  END IF;

  IF NEW.renewal_of_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.service_orders original
    WHERE original.id = NEW.renewal_of_id
      AND original.org_id = NEW.org_id
      AND original.client_id = NEW.client_id
      AND original.id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'renewal must reference a service order from the same organization and client';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER validate_service_order_scope_trigger ON public.service_orders;
CREATE TRIGGER validate_service_order_scope_trigger
  BEFORE INSERT OR UPDATE OF org_id, client_id, service_id, assigned_to, renewal_of_id
  ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_service_order_scope();

CREATE OR REPLACE FUNCTION public.log_service_order_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.service_order_events (
      service_order_id, org_id, event_type, to_value, actor_id, metadata
    ) VALUES (
      NEW.id, NEW.org_id, 'created', NEW.status, auth.uid(),
      jsonb_build_object('title', NEW.title, 'renewal_of_id', NEW.renewal_of_id)
    );
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.service_order_events (
      service_order_id, org_id, event_type, from_value, to_value, actor_id
    ) VALUES (NEW.id, NEW.org_id, 'status_changed', OLD.status, NEW.status, auth.uid());
  END IF;

  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    INSERT INTO public.service_order_events (
      service_order_id, org_id, event_type, from_value, to_value, actor_id
    ) VALUES (NEW.id, NEW.org_id, 'assignment_changed', OLD.assigned_to::text, NEW.assigned_to::text, auth.uid());
  END IF;

  IF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
    INSERT INTO public.service_order_events (
      service_order_id, org_id, event_type, from_value, to_value, actor_id
    ) VALUES (NEW.id, NEW.org_id, 'due_date_changed', OLD.due_date::text, NEW.due_date::text, auth.uid());
  END IF;

  IF ROW(
    NEW.title, NEW.description, NEW.service_id, NEW.priority, NEW.sla_hours,
    NEW.quoted_amount, NEW.external_cost, NEW.currency
  ) IS DISTINCT FROM ROW(
    OLD.title, OLD.description, OLD.service_id, OLD.priority, OLD.sla_hours,
    OLD.quoted_amount, OLD.external_cost, OLD.currency
  ) THEN
    INSERT INTO public.service_order_events (
      service_order_id, org_id, event_type, actor_id, metadata
    ) VALUES (
      NEW.id, NEW.org_id, 'details_changed', auth.uid(),
      jsonb_build_object(
        'old', jsonb_build_object(
          'title', OLD.title, 'description', OLD.description, 'service_id', OLD.service_id,
          'priority', OLD.priority, 'sla_hours', OLD.sla_hours,
          'quoted_amount', OLD.quoted_amount, 'external_cost', OLD.external_cost,
          'currency', OLD.currency
        ),
        'new', jsonb_build_object(
          'title', NEW.title, 'description', NEW.description, 'service_id', NEW.service_id,
          'priority', NEW.priority, 'sla_hours', NEW.sla_hours,
          'quoted_amount', NEW.quoted_amount, 'external_cost', NEW.external_cost,
          'currency', NEW.currency
        )
      )
    );
  END IF;

  RETURN NEW;
END;
$$;
