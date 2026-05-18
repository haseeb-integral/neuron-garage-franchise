
alter table public.teacher_prospects
  add column if not exists school_nces_id text references public.public_schools(nces_id) on delete set null,
  add column if not exists us_cities_scored_id uuid references public.us_cities_scored(id) on delete set null,
  add column if not exists teacher_type text,
  add column if not exists subject text,
  add column if not exists segment text,
  add column if not exists linkedin_url text,
  add column if not exists donorschoose_id text,
  add column if not exists last_enriched_at timestamptz,
  add column if not exists enrichment_source text;

create index if not exists idx_tp_school_nces on public.teacher_prospects(school_nces_id);
create index if not exists idx_tp_city_scored on public.teacher_prospects(us_cities_scored_id);
create index if not exists idx_tp_type on public.teacher_prospects(teacher_type);
