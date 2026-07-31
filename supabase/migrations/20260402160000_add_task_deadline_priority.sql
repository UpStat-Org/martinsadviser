-- Feature 5: Task Deadlines and Priority
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';

CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks (due_date);
