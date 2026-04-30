DO $$ BEGIN
  CREATE TYPE public.candidate_vote_value AS ENUM ('approve','needs_info','reject');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.candidate_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  voter text NOT NULL,
  vote public.candidate_vote_value NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, voter)
);

CREATE INDEX idx_candidate_votes_candidate ON public.candidate_votes(candidate_id);

ALTER TABLE public.candidate_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view votes"
  ON public.candidate_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert votes"
  ON public.candidate_votes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update votes"
  ON public.candidate_votes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete votes"
  ON public.candidate_votes FOR DELETE TO authenticated USING (true);

CREATE TRIGGER candidate_votes_updated_at
  BEFORE UPDATE ON public.candidate_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();