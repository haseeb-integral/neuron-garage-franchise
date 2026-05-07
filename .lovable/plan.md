## Edge Function: `fetch-city-market-data` (POC skeleton)

Create a single new file at `supabase/functions/fetch-city-market-data/index.ts`. No frontend changes, no secrets, no external API calls. Lovable auto-deploys on save.

### Behavior

- **Method:** `POST` (plus `OPTIONS` for CORS preflight)
- **Auth:** Validate caller JWT via `supabase.auth.getClaims(token)` — same pattern as `admin-create-user` (which uses `getUser`). Return 401 if missing/invalid.
- **Body validation:** `{ city: string (1–100), state: string (2–50) }`. Return 400 with field errors on bad input.
- **DB writes** (using `SUPABASE_SERVICE_ROLE_KEY`, matching the existing `admin-create-user` pattern):
  1. **Upsert `cities`** on `(city, state)` with defaults: `market_type='Suburb'`, `tier='C'`, `composite_score=72`, `population=100000`, `last_scraped_at=now()`, `notes='POC sample data'`. Return the row's `id`.
  2. **Insert `city_fetch_jobs`**: `{ city_id, city, state, source: 'poc', status: 'completed', started_at, completed_at, response_summary: { mode: 'poc', counts: {...} } }`.
  3. **Insert 3 sample `city_market_signals`** (delete existing for that `city_id` first to avoid `UNIQUE(city_id, signal_key)` conflicts on re-run): `population_growth`, `median_income_trend`, `school_enrollment` — each with `label`, `value`, `delta`, `delta_type`, `source='poc'`, `confidence=0.5`.
  4. **Insert 6 sample `city_category_scores`** (delete existing for that `city_id` first): `summer_camp_demand`, `school_density`, `child_population`, `dual_income_families`, `stem_jobs`, `competition_score` — each `score` 60–90.
  5. **Insert 2 sample `city_competitors`** (delete existing for that `city_id` first to keep re-runs clean): e.g. "Code Ninjas (sample)", "Mathnasium (sample)" with `source='poc'`.
- **Response (200):** `{ ok: true, city_id, inserted: { signals: 3, scores: 6, competitors: 2, job_id } }`. All errors return JSON with CORS headers.

### Technical notes

- Imports: `createClient` from `https://esm.sh/@supabase/supabase-js@2.45.0` (matches `admin-create-user`).
- Inline `corsHeaders` (same shape as existing functions): `Access-Control-Allow-Origin: *`, headers list includes `authorization, x-client-info, apikey, content-type`.
- Two clients: a user-scoped client (anon key + caller's `Authorization`) for `getClaims`, and a service-role client for writes (bypasses RLS cleanly since the function deploys with `verify_jwt = false`).
- No `supabase/config.toml` change needed — default `verify_jwt = false` is fine; we validate JWT in code.
- No new secrets. Uses pre-existing: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (or `SUPABASE_PUBLISHABLE_KEY`), `SUPABASE_SERVICE_ROLE_KEY`.
- Re-runnable: upsert on cities; delete-then-insert for signals/scores/competitors keyed by `city_id`.

### Out of scope (later steps)
- Apify / Firecrawl / Census calls
- Adding `APIFY_API_TOKEN`, `FIRECRAWL_API_KEY`, `CENSUS_API_KEY` secrets
- Frontend wiring on `/city-scoring`

### Verification after deploy
- Confirm file path: `supabase/functions/fetch-city-market-data/index.ts`
- Check deploy via edge function logs
- Optional smoke test: invoke with `{ "city": "Frisco", "state": "Texas" }` and report the JSON response + row counts
