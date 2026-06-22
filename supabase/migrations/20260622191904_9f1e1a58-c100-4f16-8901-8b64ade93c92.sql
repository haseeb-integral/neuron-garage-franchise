
ALTER TABLE public.site_analysis_acs_cache
  ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;

UPDATE public.site_analysis_acs_cache
   SET expires_at = created_at + interval '365 days'
 WHERE expires_at IS NULL;

ALTER TABLE public.site_analysis_acs_cache
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '365 days'),
  ALTER COLUMN expires_at SET NOT NULL;
