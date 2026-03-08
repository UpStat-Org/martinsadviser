
-- Automation rules table
CREATE TABLE public.automation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  days_before INTEGER NOT NULL DEFAULT 30,
  channel TEXT NOT NULL DEFAULT 'email',
  template_id UUID REFERENCES public.message_templates(id) ON DELETE SET NULL,
  subject TEXT,
  body TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own rules" ON public.automation_rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own rules" ON public.automation_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rules" ON public.automation_rules FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own rules" ON public.automation_rules FOR DELETE USING (auth.uid() = user_id);

-- Track which permits already had messages created to avoid duplicates
CREATE TABLE public.automation_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  permit_id UUID NOT NULL REFERENCES public.permits(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(rule_id, permit_id)
);

ALTER TABLE public.automation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own logs" ON public.automation_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.automation_rules WHERE id = rule_id AND user_id = auth.uid())
);
CREATE POLICY "Service can insert logs" ON public.automation_log FOR INSERT WITH CHECK (true);

-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
