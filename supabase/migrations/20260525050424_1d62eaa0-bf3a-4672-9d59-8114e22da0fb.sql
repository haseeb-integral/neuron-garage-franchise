
-- ============================================================================
-- 1. Alias table: alternate / colloquial school names (e.g. from Manus scrape).
-- ============================================================================
CREATE TABLE public.public_school_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nces_id text NULL,                       -- resolved link to public_schools when known
  school_name text NOT NULL,               -- the alias (what teachers might type)
  city_name text NOT NULL,
  state_abbr text NOT NULL,
  district_name text NULL,
  source text NOT NULL DEFAULT 'manus',    -- 'manus', 'greatschools', 'manual', ...
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Same row shouldn't get inserted twice from the same source.
CREATE UNIQUE INDEX public_school_aliases_dedupe
  ON public.public_school_aliases (
    lower(school_name), lower(city_name), lower(state_abbr), source
  );

CREATE INDEX public_school_aliases_city_state
  ON public.public_school_aliases (lower(city_name), lower(state_abbr));

CREATE INDEX public_school_aliases_nces_id
  ON public.public_school_aliases (nces_id) WHERE nces_id IS NOT NULL;

-- Trigram index for fast similarity() lookups during matching.
CREATE INDEX public_school_aliases_name_trgm
  ON public.public_school_aliases USING gin (school_name gin_trgm_ops);

-- Add the same kind of trigram index to public_schools.school_name so the
-- matcher can hit either source efficiently.
CREATE INDEX IF NOT EXISTS public_schools_name_trgm
  ON public.public_schools USING gin (school_name gin_trgm_ops);

ALTER TABLE public.public_school_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view public_school_aliases"
  ON public.public_school_aliases FOR SELECT
  TO authenticated USING (true);

-- Inserts/updates/deletes only via service role (backend ingestion of CSV,
-- not interactive UI). No INSERT/UPDATE/DELETE policies for authenticated.

CREATE TRIGGER trg_public_school_aliases_updated
  BEFORE UPDATE ON public.public_school_aliases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- 2. match_teachers_to_schools — per-city fuzzy matcher.
--
-- Scopes candidates to the requested city+state, scores each teacher's
-- free-text `school` against BOTH public_schools and the alias table using
-- pg_trgm similarity(), picks the best match per teacher, and writes the
-- resolved nces_id back to teacher_prospects.school_nces_id.
--
-- Inputs:
--   p_city      — city name (case-insensitive)
--   p_state     — 2-letter state code (case-insensitive)
--   p_threshold — minimum similarity to accept (default 0.6).
--                 Below this, the row is reported but NOT written.
--   p_dry_run   — if true, no writes; you just get the would-be results.
--
-- Returns one row per teacher considered:
--   teacher_id, teacher_school, best_match_name, best_match_nces_id,
--   similarity, source ('nces' | 'alias'), action
--     ('matched' | 'low_confidence' | 'no_candidates' | 'no_school_text'
--      | 'already_matched' | 'skipped_dry_run')
-- ============================================================================
CREATE OR REPLACE FUNCTION public.match_teachers_to_schools(
  p_city text,
  p_state text,
  p_threshold real DEFAULT 0.6,
  p_dry_run boolean DEFAULT false
)
RETURNS TABLE (
  teacher_id uuid,
  teacher_school text,
  best_match_name text,
  best_match_nces_id text,
  similarity real,
  source text,
  action text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'forbidden: manager role required';
  END IF;

  IF coalesce(trim(p_city), '') = '' OR coalesce(trim(p_state), '') = '' THEN
    RAISE EXCEPTION 'city and state are required';
  END IF;

  -- Build the candidate pool for this city: NCES schools + aliases, one query.
  -- All scoring happens once per teacher via LATERAL.
  RETURN QUERY
  WITH teachers AS (
    SELECT t.id, t.school, t.school_nces_id
    FROM public.teacher_prospects t
    WHERE lower(t.city) = lower(p_city)
      AND lower(t.state) = lower(p_state)
  ),
  candidates AS (
    SELECT s.nces_id, s.school_name, 'nces'::text AS src
    FROM public.public_schools s
    WHERE lower(s.city_name) = lower(p_city)
      AND lower(s.state_abbr) = lower(p_state)
    UNION ALL
    SELECT a.nces_id, a.school_name, 'alias'::text AS src
    FROM public.public_school_aliases a
    WHERE lower(a.city_name) = lower(p_city)
      AND lower(a.state_abbr) = lower(p_state)
  ),
  scored AS (
    SELECT
      tt.id AS teacher_id,
      tt.school AS teacher_school,
      tt.school_nces_id AS existing_nces_id,
      best.school_name AS best_match_name,
      best.nces_id AS best_match_nces_id,
      best.sim AS similarity,
      best.src AS source
    FROM teachers tt
    LEFT JOIN LATERAL (
      SELECT c.school_name, c.nces_id, c.src,
             similarity(c.school_name, tt.school) AS sim
      FROM candidates c
      WHERE tt.school IS NOT NULL AND tt.school <> ''
      ORDER BY sim DESC
      LIMIT 1
    ) best ON true
  )
  SELECT
    s.teacher_id,
    s.teacher_school,
    s.best_match_name,
    s.best_match_nces_id,
    s.similarity,
    s.source,
    CASE
      WHEN s.teacher_school IS NULL OR s.teacher_school = '' THEN 'no_school_text'
      WHEN s.best_match_name IS NULL THEN 'no_candidates'
      WHEN s.existing_nces_id IS NOT NULL AND s.existing_nces_id = s.best_match_nces_id THEN 'already_matched'
      WHEN s.similarity < p_threshold THEN 'low_confidence'
      WHEN p_dry_run THEN 'skipped_dry_run'
      ELSE 'matched'
    END AS action
  FROM scored s
  ORDER BY s.similarity DESC NULLS LAST;

  -- Write the actual matches when not in dry-run.
  IF NOT p_dry_run THEN
    WITH teachers AS (
      SELECT t.id, t.school, t.school_nces_id
      FROM public.teacher_prospects t
      WHERE lower(t.city) = lower(p_city)
        AND lower(t.state) = lower(p_state)
    ),
    candidates AS (
      SELECT s.nces_id, s.school_name
      FROM public.public_schools s
      WHERE lower(s.city_name) = lower(p_city)
        AND lower(s.state_abbr) = lower(p_state)
      UNION ALL
      SELECT a.nces_id, a.school_name
      FROM public.public_school_aliases a
      WHERE lower(a.city_name) = lower(p_city)
        AND lower(a.state_abbr) = lower(p_state)
        AND a.nces_id IS NOT NULL
    ),
    best AS (
      SELECT tt.id AS teacher_id, b.nces_id, b.sim
      FROM teachers tt
      JOIN LATERAL (
        SELECT c.nces_id,
               similarity(c.school_name, tt.school) AS sim
        FROM candidates c
        WHERE tt.school IS NOT NULL AND tt.school <> ''
          AND c.nces_id IS NOT NULL
        ORDER BY sim DESC
        LIMIT 1
      ) b ON true
      WHERE b.sim >= p_threshold
        AND (tt.school_nces_id IS NULL OR tt.school_nces_id <> b.nces_id)
    )
    UPDATE public.teacher_prospects t
       SET school_nces_id = best.nces_id,
           updated_at = now()
      FROM best
     WHERE t.id = best.teacher_id;
  END IF;
END;
$$;
