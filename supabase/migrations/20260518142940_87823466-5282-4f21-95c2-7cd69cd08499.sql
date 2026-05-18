
create extension if not exists pg_trgm;

create table public.public_schools (
  nces_id                 text primary key,
  school_name             text not null,
  district_name           text,
  district_nces_id        text,
  street_address          text,
  city_name               text,
  state_abbr              text,
  zip                     text,
  latitude                numeric(9,6),
  longitude               numeric(9,6),
  phone                   text,
  us_cities_scored_id     uuid references public.us_cities_scored(id) on delete set null,
  lowest_grade_offered    text,
  highest_grade_offered   text,
  school_level            text,
  is_elementary_serving   boolean generated always as (
    lowest_grade_offered in ('PK','KG','01','02','03','04','05')
  ) stored,
  school_type             text,
  is_charter              boolean default false,
  is_magnet               boolean default false,
  school_status           text,
  enrollment              integer,
  teachers_fte            numeric(8,2),
  nces_year               integer,
  nces_last_updated       date,
  raw                     jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index idx_schools_city      on public.public_schools (us_cities_scored_id);
create index idx_schools_state     on public.public_schools (state_abbr);
create index idx_schools_district  on public.public_schools (district_nces_id);
create index idx_schools_elem      on public.public_schools (is_elementary_serving);
create index idx_schools_level     on public.public_schools (school_level);
create index idx_schools_name_trgm on public.public_schools using gin (school_name gin_trgm_ops);

alter table public.public_schools enable row level security;

create policy "Authenticated can view public_schools"
  on public.public_schools for select to authenticated using (true);

create trigger trg_public_schools_updated_at
  before update on public.public_schools
  for each row execute function public.update_updated_at_column();
