
-- Update tasks table: rename columns, add new ones, change defaults
ALTER TABLE public.tasks RENAME COLUMN title TO name;
ALTER TABLE public.tasks RENAME COLUMN description TO notes;
ALTER TABLE public.tasks DROP COLUMN priority;
ALTER TABLE public.tasks DROP COLUMN due_date;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_type TEXT NOT NULL DEFAULT '';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS operator TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.tasks ALTER COLUMN status SET DEFAULT 'not_started';
