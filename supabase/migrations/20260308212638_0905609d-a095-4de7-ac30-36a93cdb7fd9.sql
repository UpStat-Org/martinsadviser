
-- Create activity_log table
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  entity_type text NOT NULL, -- 'permit', 'truck', 'client', 'message'
  entity_id uuid,
  action text NOT NULL, -- 'created', 'updated', 'deleted'
  details jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated users can view all logs (same pattern as clients/permits)
CREATE POLICY "Authenticated users can view activity logs"
  ON public.activity_log FOR SELECT
  USING (true);

-- RLS: users can insert own logs
CREATE POLICY "Users can insert own activity logs"
  ON public.activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups by client
CREATE INDEX idx_activity_log_client_id ON public.activity_log(client_id);
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at DESC);

-- Function to log permit changes
CREATE OR REPLACE FUNCTION public.log_permit_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    VALUES (OLD.user_id, OLD.client_id, 'permit', OLD.id, 'deleted',
      jsonb_build_object('permit_type', OLD.permit_type, 'permit_number', COALESCE(OLD.permit_number, '')));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Function to log truck changes
CREATE OR REPLACE FUNCTION public.log_truck_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    VALUES (OLD.user_id, OLD.client_id, 'truck', OLD.id, 'deleted',
      jsonb_build_object('plate', OLD.plate));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Function to log client changes
CREATE OR REPLACE FUNCTION public.log_client_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_log (user_id, client_id, entity_type, entity_id, action, details)
    VALUES (NEW.user_id, NEW.id, 'client', NEW.id, 'updated',
      jsonb_build_object('company_name', NEW.company_name, 'status', NEW.status));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Create triggers
CREATE TRIGGER trg_permit_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.permits
  FOR EACH ROW EXECUTE FUNCTION public.log_permit_activity();

CREATE TRIGGER trg_truck_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.trucks
  FOR EACH ROW EXECUTE FUNCTION public.log_truck_activity();

CREATE TRIGGER trg_client_activity
  AFTER UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.log_client_activity();
