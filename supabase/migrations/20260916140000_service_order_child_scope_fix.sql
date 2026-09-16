-- A generic record trigger cannot statically reference permit_id when invoked
-- by the checklist table. Split permit validation from the shared order/org
-- validation so PostgreSQL can compile each trigger against its own row type.

CREATE OR REPLACE FUNCTION public.validate_service_order_child_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  order_org uuid;
BEGIN
  SELECT org_id INTO order_org
  FROM public.service_orders
  WHERE id = NEW.service_order_id;

  IF order_org IS NULL OR order_org <> NEW.org_id THEN
    RAISE EXCEPTION 'service order child must belong to the order organization';
  END IF;

  RETURN NEW;
END;
$$;

-- Keep the two inexpensive checks explicit in the permit-specific function.
CREATE OR REPLACE FUNCTION public.validate_service_order_permit_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  order_org uuid;
BEGIN
  SELECT org_id INTO order_org
  FROM public.service_orders
  WHERE id = NEW.service_order_id;

  IF order_org IS NULL OR order_org <> NEW.org_id THEN
    RAISE EXCEPTION 'service order permit must belong to the order organization';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.permits p
    WHERE p.id = NEW.permit_id AND p.org_id = NEW.org_id
  ) THEN
    RAISE EXCEPTION 'permit must belong to the service order organization';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER validate_service_order_permit_scope_trigger
  ON public.service_order_permits;
CREATE TRIGGER validate_service_order_permit_scope_trigger
  BEFORE INSERT OR UPDATE ON public.service_order_permits
  FOR EACH ROW EXECUTE FUNCTION public.validate_service_order_permit_scope();
