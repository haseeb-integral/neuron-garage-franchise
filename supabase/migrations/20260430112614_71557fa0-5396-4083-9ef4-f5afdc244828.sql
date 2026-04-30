CREATE TABLE public.candidate_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  stage candidate_stage NOT NULL,
  label text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  completed_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_checklist_candidate_stage
  ON public.candidate_checklist_items(candidate_id, stage);

ALTER TABLE public.candidate_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view checklist items"
  ON public.candidate_checklist_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert checklist items"
  ON public.candidate_checklist_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update checklist items"
  ON public.candidate_checklist_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete checklist items"
  ON public.candidate_checklist_items FOR DELETE TO authenticated USING (true);

-- Seeder function: ensures default Confirmation items exist for a candidate
CREATE OR REPLACE FUNCTION public.seed_confirmation_checklist(_candidate_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_labels text[] := ARRAY[
    'Answered all questions',
    'Prospect summarized key takeaways',
    'Asked if they want to move forward',
    'Scheduled next call',
    'Assigned homework'
  ];
  lbl text;
BEGIN
  FOREACH lbl IN ARRAY default_labels LOOP
    INSERT INTO public.candidate_checklist_items (candidate_id, stage, label)
    SELECT _candidate_id, 'confirmation'::candidate_stage, lbl
    WHERE NOT EXISTS (
      SELECT 1 FROM public.candidate_checklist_items
      WHERE candidate_id = _candidate_id
        AND stage = 'confirmation'::candidate_stage
        AND label = lbl
    );
  END LOOP;
END;
$$;

-- Trigger: when a candidate moves into / is created in confirmation, seed
CREATE OR REPLACE FUNCTION public.trg_seed_confirmation_checklist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.current_stage = 'confirmation'::candidate_stage
     AND (TG_OP = 'INSERT' OR OLD.current_stage IS DISTINCT FROM NEW.current_stage) THEN
    PERFORM public.seed_confirmation_checklist(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER candidates_seed_confirmation_checklist
  AFTER INSERT OR UPDATE OF current_stage ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.trg_seed_confirmation_checklist();

-- Backfill: seed for any candidates currently in confirmation
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.candidates WHERE current_stage = 'confirmation' LOOP
    PERFORM public.seed_confirmation_checklist(r.id);
  END LOOP;
END$$;