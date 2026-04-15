
-- 1. Add assigned_to to permits
ALTER TABLE public.permits ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_permits_assigned_to ON public.permits(assigned_to);

-- 2. Add assigned_to to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);

-- 3. Create client_internal_notes table
CREATE TABLE IF NOT EXISTS public.client_internal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_internal_notes_client_id ON public.client_internal_notes(client_id);

ALTER TABLE public.client_internal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view internal notes" ON public.client_internal_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create internal notes" ON public.client_internal_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can update internal notes" ON public.client_internal_notes FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete internal notes" ON public.client_internal_notes FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_client_internal_notes_updated_at
  BEFORE UPDATE ON public.client_internal_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Create ai_chat_messages table
CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_client_id ON public.ai_chat_messages(client_id);

ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ai chat messages" ON public.ai_chat_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create ai chat messages" ON public.ai_chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete ai chat messages" ON public.ai_chat_messages FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
