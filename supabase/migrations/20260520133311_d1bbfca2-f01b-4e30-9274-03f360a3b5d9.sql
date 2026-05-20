CREATE TABLE public.teacher_saved_lists (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_teacher_saved_lists_user_created
  ON public.teacher_saved_lists (user_id, created_at DESC);

ALTER TABLE public.teacher_saved_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own teacher saved lists"
  ON public.teacher_saved_lists FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own teacher saved lists"
  ON public.teacher_saved_lists FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own teacher saved lists"
  ON public.teacher_saved_lists FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own teacher saved lists"
  ON public.teacher_saved_lists FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_teacher_saved_lists_updated_at
  BEFORE UPDATE ON public.teacher_saved_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();