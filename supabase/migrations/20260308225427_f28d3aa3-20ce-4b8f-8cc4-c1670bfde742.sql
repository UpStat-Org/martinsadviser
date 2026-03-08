CREATE OR REPLACE FUNCTION public.log_permit_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log (user_id, client_id, entity_type, entity_id, action, details)
    VALUES (NEW.user_id, NEW.client_id, 'permit', NEW.id, 'created',
      jsonb_build_object('permit_type', NEW.permit_type, 'permit_number', COALESCE(NEW.permit_number, ''), 'state', COALESCE(NEW.state, '')));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_log (user_id, client_id, entity_type, entity_id, action, details)
    VALUES (NEW.user_id, NEW.client_id, 'permit', NEW.id, 'updated',
      jsonb_build_object('permit_type', NEW.permit_type, 'permit_number', COALESCE(NEW.permit_number, ''), 'state', COALESCE(NEW.state, '')));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_log (user_id, client_id, entity_type, entity_id, action, details)
    VALUES (
      OLD.user_id,
      CASE WHEN EXISTS (SELECT 1 FROM public.clients c WHERE c.id = OLD.client_id) THEN OLD.client_id ELSE NULL END,
      'permit',
      OLD.id,
      'deleted',
      jsonb_build_object('permit_type', OLD.permit_type, 'permit_number', COALESCE(OLD.permit_number, ''))
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_truck_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log (user_id, client_id, entity_type, entity_id, action, details)
    VALUES (NEW.user_id, NEW.client_id, 'truck', NEW.id, 'created',
      jsonb_build_object('plate', NEW.plate, 'make', COALESCE(NEW.make, ''), 'model', COALESCE(NEW.model, '')));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_log (user_id, client_id, entity_type, entity_id, action, details)
    VALUES (NEW.user_id, NEW.client_id, 'truck', NEW.id, 'updated',
      jsonb_build_object('plate', NEW.plate, 'make', COALESCE(NEW.make, ''), 'model', COALESCE(NEW.model, '')));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_log (user_id, client_id, entity_type, entity_id, action, details)
    VALUES (
      OLD.user_id,
      CASE WHEN EXISTS (SELECT 1 FROM public.clients c WHERE c.id = OLD.client_id) THEN OLD.client_id ELSE NULL END,
      'truck',
      OLD.id,
      'deleted',
      jsonb_build_object('plate', OLD.plate)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_invoice_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log (user_id, client_id, entity_type, entity_id, action, details)
    VALUES (NEW.user_id, NEW.client_id, 'invoice', NEW.id, 'created',
      jsonb_build_object('amount', NEW.amount, 'status', NEW.status, 'due_date', NEW.due_date));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_log (user_id, client_id, entity_type, entity_id, action, details)
    VALUES (NEW.user_id, NEW.client_id, 'invoice', NEW.id, 'updated',
      jsonb_build_object('amount', NEW.amount, 'status', NEW.status, 'due_date', NEW.due_date));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_log (user_id, client_id, entity_type, entity_id, action, details)
    VALUES (
      OLD.user_id,
      CASE WHEN EXISTS (SELECT 1 FROM public.clients c WHERE c.id = OLD.client_id) THEN OLD.client_id ELSE NULL END,
      'invoice',
      OLD.id,
      'deleted',
      jsonb_build_object('amount', OLD.amount, 'status', OLD.status)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;