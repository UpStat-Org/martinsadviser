-- Runtime hardening after the initial service-order rollout: validate that an
-- assignee belongs to the tenant and record checklist removals in history.

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

  RETURN NEW;
END;
$$;

DROP TRIGGER validate_service_order_scope_trigger ON public.service_orders;
CREATE TRIGGER validate_service_order_scope_trigger
  BEFORE INSERT OR UPDATE OF org_id, client_id, service_id, assigned_to ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_service_order_scope();

CREATE OR REPLACE FUNCTION public.log_service_order_child_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_id uuid;
  order_org uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    order_id := OLD.service_order_id;
    order_org := OLD.org_id;
  ELSE
    order_id := NEW.service_order_id;
    order_org := NEW.org_id;
  END IF;

  IF TG_TABLE_NAME = 'service_order_checklist_items' THEN
    IF TG_OP = 'DELETE' THEN
      INSERT INTO public.service_order_events (
        service_order_id, org_id, event_type, from_value, actor_id, metadata
      ) VALUES (
        order_id, order_org, 'checklist_changed', OLD.status, auth.uid(),
        jsonb_build_object('item_id', OLD.id, 'title', OLD.title, 'operation', 'delete')
      );
    ELSIF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.document_path IS DISTINCT FROM OLD.document_path THEN
      INSERT INTO public.service_order_events (
        service_order_id, org_id, event_type, from_value, to_value,
        actor_id, metadata
      ) VALUES (
        order_id, order_org, 'checklist_changed',
        CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
        NEW.status, auth.uid(),
        jsonb_build_object('item_id', NEW.id, 'title', NEW.title, 'operation', lower(TG_OP))
      );
    END IF;
  ELSIF TG_TABLE_NAME = 'service_order_permits' THEN
    INSERT INTO public.service_order_events (
      service_order_id, org_id, event_type, actor_id, metadata
    ) VALUES (
      order_id, order_org,
      CASE WHEN TG_OP = 'DELETE' THEN 'permit_unlinked' ELSE 'permit_linked' END,
      auth.uid(),
      jsonb_build_object('permit_id', CASE WHEN TG_OP = 'DELETE' THEN OLD.permit_id ELSE NEW.permit_id END)
    );
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER log_service_order_checklist_event_trigger
  ON public.service_order_checklist_items;
CREATE TRIGGER log_service_order_checklist_event_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.service_order_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.log_service_order_child_event();
