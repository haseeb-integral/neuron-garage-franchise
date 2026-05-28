ALTER TABLE public.candidate_checklist_items
  ADD COLUMN kind text NOT NULL DEFAULT 'homework';

CREATE INDEX IF NOT EXISTS idx_checklist_candidate_stage_kind
  ON public.candidate_checklist_items (candidate_id, stage, kind);