-- Feature 3: Permit History
CREATE TABLE public.permit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id uuid NOT NULL REFERENCES public.permits(id) ON DELETE CASCADE,
  changed_by uuid NOT NULL,
  change_type text NOT NULL, -- 'created', 'updated', 'renewed', 'expired'
  old_values jsonb,
  new_values jsonb,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.permit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view permit history" ON public.permit_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert permit history" ON public.permit_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = changed_by);

CREATE INDEX idx_permit_history_permit_id ON public.permit_history (permit_id);
CREATE INDEX idx_permit_history_created_at ON public.permit_history (created_at DESC);

-- Feature 5: Comments on Permits and Trucks
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL, -- 'permit', 'truck', 'client'
  entity_id uuid NOT NULL,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  body text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view comments" ON public.comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert comments" ON public.comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON public.comments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_comments_entity ON public.comments (entity_type, entity_id);
CREATE INDEX idx_comments_created_at ON public.comments (created_at DESC);

-- Feature 6: Saved Filters
CREATE TABLE public.saved_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  page text NOT NULL, -- 'dashboard', 'permits', 'finance'
  filters jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved filters" ON public.saved_filters
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved filters" ON public.saved_filters
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved filters" ON public.saved_filters
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved filters" ON public.saved_filters
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_saved_filters_user_page ON public.saved_filters (user_id, page);
