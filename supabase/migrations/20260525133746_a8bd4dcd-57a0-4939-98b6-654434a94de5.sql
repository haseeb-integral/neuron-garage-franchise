
-- Ensure pg_trgm is available (used for ILIKE '%foo%' acceleration)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram indexes for the search bar (name, school, city, email)
CREATE INDEX IF NOT EXISTS idx_teacher_prospects_name_trgm
  ON public.teacher_prospects USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_teacher_prospects_school_trgm
  ON public.teacher_prospects USING gin (school gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_teacher_prospects_city_trgm
  ON public.teacher_prospects USING gin (city gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_teacher_prospects_email_trgm
  ON public.teacher_prospects USING gin (email gin_trgm_ops);

-- Btree indexes for equality / sort filters
CREATE INDEX IF NOT EXISTS idx_teacher_prospects_created_at_desc
  ON public.teacher_prospects (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_teacher_prospects_city
  ON public.teacher_prospects (city);

CREATE INDEX IF NOT EXISTS idx_teacher_prospects_enrichment_source_lower
  ON public.teacher_prospects ((lower(enrichment_source)));

CREATE INDEX IF NOT EXISTS idx_teacher_prospects_needs_email
  ON public.teacher_prospects (needs_email_enrichment)
  WHERE needs_email_enrichment = true;

ANALYZE public.teacher_prospects;
