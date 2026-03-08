
-- 1. Expand log_client_activity to also handle INSERT
CREATE OR REPLACE FUNCTION public.log_client_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    VALUES (OLD.user_id, OLD.id, 'client', OLD.id, 'deleted',
      jsonb_build_object('company_name', OLD.company_name));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- Re-create trigger for clients (INSERT + UPDATE + DELETE)
DROP TRIGGER IF EXISTS log_client_activity ON public.clients;
CREATE TRIGGER log_client_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.log_client_activity();

-- Re-create triggers for permits (they exist as functions but triggers may be missing)
DROP TRIGGER IF EXISTS log_permit_activity ON public.permits;
CREATE TRIGGER log_permit_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.permits
  FOR EACH ROW EXECUTE FUNCTION public.log_permit_activity();

DROP TRIGGER IF EXISTS log_truck_activity ON public.trucks;
CREATE TRIGGER log_truck_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.trucks
  FOR EACH ROW EXECUTE FUNCTION public.log_truck_activity();

-- 2. Invoice activity trigger
CREATE OR REPLACE FUNCTION public.log_invoice_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    VALUES (OLD.user_id, OLD.client_id, 'invoice', OLD.id, 'deleted',
      jsonb_build_object('amount', OLD.amount, 'status', OLD.status));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE TRIGGER log_invoice_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.log_invoice_activity();

-- 3. Task activity trigger
CREATE OR REPLACE FUNCTION public.log_task_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log (user_id, client_id, entity_type, entity_id, action, details)
    VALUES (NEW.user_id, NEW.client_id, 'task', NEW.id, 'created',
      jsonb_build_object('name', NEW.name, 'status', NEW.status));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_log (user_id, client_id, entity_type, entity_id, action, details)
    VALUES (NEW.user_id, NEW.client_id, 'task', NEW.id, 'updated',
      jsonb_build_object('name', NEW.name, 'status', NEW.status));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_log (user_id, client_id, entity_type, entity_id, action, details)
    VALUES (OLD.user_id, OLD.client_id, 'task', OLD.id, 'deleted',
      jsonb_build_object('name', OLD.name));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE TRIGGER log_task_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.log_task_activity();

-- 4. Document signatures table
CREATE TABLE public.document_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  permit_id UUID REFERENCES public.permits(id) ON DELETE SET NULL,
  document_name TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signer_email TEXT,
  signature_data TEXT NOT NULL,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view signatures"
  ON public.document_signatures FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create signatures"
  ON public.document_signatures FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete signatures"
  ON public.document_signatures FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
