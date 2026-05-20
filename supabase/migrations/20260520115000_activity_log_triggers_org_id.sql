-- ============================================================================
-- Multi-tenancy: rewrite activity_log trigger functions to pass org_id
-- explicitly from the source row (NEW/OLD.org_id) instead of relying on the
-- column DEFAULT current_org_id().
--
-- Why this matters:
--   1) current_org_id() picks the caller's *oldest* approved membership, not
--      their active org. Once a user belongs to >1 org, every audit row gets
--      written under the wrong org.
--   2) When a trigger fires inside an edge function running as service_role,
--      auth.uid() is NULL and the JWT claim is empty, so current_org_id()
--      returns NULL → INSERT fails the NOT NULL constraint → the whole
--      source UPDATE/INSERT/DELETE is rolled back. Cron-driven updates to
--      permits/tasks (check-permit-expirations) would silently break the
--      moment activity_log enforced NOT NULL on org_id.
--
-- All source tables already carry org_id (Week 2 rollout), so the trigger
-- can read NEW.org_id / OLD.org_id without extra lookups.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_client_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log (org_id, user_id, client_id, entity_type, entity_id, action, details)
    VALUES (NEW.org_id, NEW.user_id, NEW.id, 'client', NEW.id, 'created',
      jsonb_build_object('company_name', NEW.company_name, 'status', NEW.status));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_log (org_id, user_id, client_id, entity_type, entity_id, action, details)
    VALUES (NEW.org_id, NEW.user_id, NEW.id, 'client', NEW.id, 'updated',
      jsonb_build_object('company_name', NEW.company_name, 'status', NEW.status));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_log (org_id, user_id, client_id, entity_type, entity_id, action, details)
    VALUES (OLD.org_id, OLD.user_id, NULL, 'client', OLD.id, 'deleted',
      jsonb_build_object('company_name', OLD.company_name));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_permit_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log (org_id, user_id, client_id, entity_type, entity_id, action, details)
    VALUES (NEW.org_id, NEW.user_id, NEW.client_id, 'permit', NEW.id, 'created',
      jsonb_build_object('permit_type', NEW.permit_type, 'permit_number', COALESCE(NEW.permit_number, ''), 'state', COALESCE(NEW.state, '')));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_log (org_id, user_id, client_id, entity_type, entity_id, action, details)
    VALUES (NEW.org_id, NEW.user_id, NEW.client_id, 'permit', NEW.id, 'updated',
      jsonb_build_object('permit_type', NEW.permit_type, 'permit_number', COALESCE(NEW.permit_number, ''), 'state', COALESCE(NEW.state, '')));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_log (org_id, user_id, client_id, entity_type, entity_id, action, details)
    VALUES (
      OLD.org_id,
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
    INSERT INTO public.activity_log (org_id, user_id, client_id, entity_type, entity_id, action, details)
    VALUES (NEW.org_id, NEW.user_id, NEW.client_id, 'truck', NEW.id, 'created',
      jsonb_build_object('plate', NEW.plate, 'make', COALESCE(NEW.make, ''), 'model', COALESCE(NEW.model, '')));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_log (org_id, user_id, client_id, entity_type, entity_id, action, details)
    VALUES (NEW.org_id, NEW.user_id, NEW.client_id, 'truck', NEW.id, 'updated',
      jsonb_build_object('plate', NEW.plate, 'make', COALESCE(NEW.make, ''), 'model', COALESCE(NEW.model, '')));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_log (org_id, user_id, client_id, entity_type, entity_id, action, details)
    VALUES (
      OLD.org_id,
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
    INSERT INTO public.activity_log (org_id, user_id, client_id, entity_type, entity_id, action, details)
    VALUES (NEW.org_id, NEW.user_id, NEW.client_id, 'invoice', NEW.id, 'created',
      jsonb_build_object('amount', NEW.amount, 'status', NEW.status, 'due_date', NEW.due_date));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_log (org_id, user_id, client_id, entity_type, entity_id, action, details)
    VALUES (NEW.org_id, NEW.user_id, NEW.client_id, 'invoice', NEW.id, 'updated',
      jsonb_build_object('amount', NEW.amount, 'status', NEW.status, 'due_date', NEW.due_date));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_log (org_id, user_id, client_id, entity_type, entity_id, action, details)
    VALUES (
      OLD.org_id,
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

CREATE OR REPLACE FUNCTION public.log_task_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log (org_id, user_id, client_id, entity_type, entity_id, action, details)
    VALUES (NEW.org_id, NEW.user_id, NEW.client_id, 'task', NEW.id, 'created',
      jsonb_build_object('name', NEW.name, 'status', NEW.status));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_log (org_id, user_id, client_id, entity_type, entity_id, action, details)
    VALUES (NEW.org_id, NEW.user_id, NEW.client_id, 'task', NEW.id, 'updated',
      jsonb_build_object('name', NEW.name, 'status', NEW.status));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_log (org_id, user_id, client_id, entity_type, entity_id, action, details)
    VALUES (OLD.org_id, OLD.user_id, OLD.client_id, 'task', OLD.id, 'deleted',
      jsonb_build_object('name', OLD.name));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
