-- Workload tracking, internal notes, AI chat, renewal metrics

-- Assignment columns
ALTER TABLE public.permits ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_permits_assigned_to ON public.permits (assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks (assigned_to);

-- Internal notes (private to staff, never shown in client portal)
CREATE TABLE IF NOT EXISTS public.client_internal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.client_internal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view internal notes" ON public.client_internal_notes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert internal notes" ON public.client_internal_notes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can update internal notes" ON public.client_internal_notes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner can delete internal notes" ON public.client_internal_notes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_internal_notes_client ON public.client_internal_notes (client_id, pinned DESC, created_at DESC);

-- AI chat messages (per client conversation)
CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view ai chat" ON public.ai_chat_messages
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert ai chat" ON public.ai_chat_messages
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can delete ai chat" ON public.ai_chat_messages
  FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_ai_chat_client ON public.ai_chat_messages (client_id, created_at);
