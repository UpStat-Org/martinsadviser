-- Feature 5: Task Deadlines and Priority
ALTER TABLE public.tasks ADD COLUMN due_date date;
ALTER TABLE public.tasks ADD COLUMN priority text DEFAULT 'medium';

CREATE INDEX idx_tasks_due_date ON public.tasks (due_date);
