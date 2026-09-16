-- A linked permit or task is part of the same client case, not only the same
-- tenant. Enforce that invariant at the database boundary.

CREATE OR REPLACE FUNCTION public.validate_service_order_permit_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  order_org uuid;
  order_client uuid;
BEGIN
  SELECT org_id, client_id INTO order_org, order_client
  FROM public.service_orders
  WHERE id = NEW.service_order_id;

  IF order_org IS NULL OR order_org <> NEW.org_id THEN
    RAISE EXCEPTION 'service order permit must belong to the order organization';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.permits p
    WHERE p.id = NEW.permit_id
      AND p.org_id = NEW.org_id
      AND p.client_id = order_client
  ) THEN
    RAISE EXCEPTION 'permit must belong to the service order organization and client';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_task_service_order_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.service_order_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.service_orders so
    WHERE so.id = NEW.service_order_id
      AND so.org_id = NEW.org_id
      AND so.client_id = NEW.client_id
  ) THEN
    RAISE EXCEPTION 'task must belong to the service order organization and client';
  END IF;
  RETURN NEW;
END;
$$;
