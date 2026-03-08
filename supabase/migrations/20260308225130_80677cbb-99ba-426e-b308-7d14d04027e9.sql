CREATE OR REPLACE FUNCTION public.log_client_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log (user_id, client_id, entity_type, entity_id, action, details)
    VALUES (NEW.user_id, NEW.id, 'client', NEW.id, 'created',
      jsonb_build_object('company_name', NEW.company_name, 'status', NEW.status));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_log (user_id, client_id, entity_type, entity_id, action, details)
    VALUES (NEW.user_id, NEW.id, 'client', NEW.id, 'updated',
      jsonb_build_object('company_name', NEW.company_name, 'status', NEW.status));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_log (user_id, client_id, entity_type, entity_id, action, details)
    VALUES (OLD.user_id, NULL, 'client', OLD.id, 'deleted',
      jsonb_build_object('company_name', OLD.company_name));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;