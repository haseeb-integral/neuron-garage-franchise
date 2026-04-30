-- Enum for pipeline stages
CREATE TYPE public.candidate_stage AS ENUM (
  'new_lead',
  'initial_qualification',
  'business_overview',
  'fdd_review',
  'immersion',
  'confirmation',
  'signing',
  'disqualified'
);

-- Candidates table
CREATE TABLE public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NULL,
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  current_stage public.candidate_stage NOT NULL DEFAULT 'new_lead',
  fit_score INTEGER NOT NULL DEFAULT 0 CHECK (fit_score >= 0 AND fit_score <= 100),
  fit_tag TEXT NOT NULL DEFAULT 'Untagged',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_candidates_current_stage ON public.candidates(current_stage);

-- Stage history
CREATE TABLE public.candidate_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  from_stage public.candidate_stage NULL,
  to_stage public.candidate_stage NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by TEXT NULL,
  notes TEXT NULL
);

CREATE INDEX idx_csh_candidate_id ON public.candidate_stage_history(candidate_id);

-- Enable RLS
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_stage_history ENABLE ROW LEVEL SECURITY;

-- Policies: any authenticated user can read & write
CREATE POLICY "Authenticated can view candidates"
  ON public.candidates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert candidates"
  ON public.candidates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update candidates"
  ON public.candidates FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete candidates"
  ON public.candidates FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated can view stage history"
  ON public.candidate_stage_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert stage history"
  ON public.candidate_stage_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update stage history"
  ON public.candidate_stage_history FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete stage history"
  ON public.candidate_stage_history FOR DELETE TO authenticated USING (true);

-- Trigger for updated_at
CREATE TRIGGER trg_candidates_updated_at
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed sample candidates across all stages
INSERT INTO public.candidates (first_name, last_name, email, phone, city, state, current_stage, fit_score, fit_tag, status) VALUES
  ('Sarah',    'Mitchell', 'sarah.mitchell@email.com', '(214) 555-0142', 'Frisco',        'TX', 'new_lead',              88, 'High Potential', 'active'),
  ('Marcus',   'Johnson',  'marcus.j@email.com',       '(972) 555-0188', 'Plano',         'TX', 'initial_qualification', 72, 'Follow-Up',      'active'),
  ('Amanda',   'Rodriguez','amanda.r@email.com',       '(954) 555-0177', 'Coral Springs', 'FL', 'business_overview',     91, 'High Potential', 'active'),
  ('Brian',    'Thompson', 'brian.t@email.com',        '(214) 555-0123', 'Frisco',        'TX', 'fdd_review',            78, 'Follow-Up',      'active'),
  ('Lisa',     'Nguyen',   'lisa.nguyen@email.com',    '(972) 555-0144', 'Plano',         'TX', 'immersion',             89, 'High Potential', 'active'),
  ('David',    'Chen',     'david.chen@email.com',     '(512) 555-0133', 'Austin',        'TX', 'confirmation',          86, 'High Potential', 'active'),
  ('Kevin',    'Patel',    'kevin.patel@email.com',    '(954) 555-0119', 'Coral Springs', 'FL', 'signing',               93, 'High Potential', 'active'),
  ('James',    'Carter',   'james.carter@email.com',   '(512) 555-0199', 'Austin',        'TX', 'disqualified',          45, 'Not a Fit',      'disqualified');
