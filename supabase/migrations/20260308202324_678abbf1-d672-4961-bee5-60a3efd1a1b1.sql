
-- Fix the permissive INSERT policy on automation_log - only allow via service role (edge function)
DROP POLICY "Service can insert logs" ON public.automation_log;
CREATE POLICY "Users can insert own logs" ON public.automation_log FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.automation_rules WHERE id = rule_id AND user_id = auth.uid())
);
