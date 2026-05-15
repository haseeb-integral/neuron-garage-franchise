
# Day 6 — Firecrawl staff enrichment

Decision locked: **Option 2**. Keep `jungle_synthesizer/...-scraper` as the school-list source. Add Firecrawl as the primary teacher-name + email source. No Agenscrape.

## 1. New edge function — `supabase/functions/enrich-school-staff/index.ts`

**Contract**
```
POST { school_website: string,
       school_name: string,
       district?: string,
       city: string,
       state: string,
       apify_run_id?: string }
→ 200 { inserted, updated, pages_crawled, emails_found }
→ 200 { error: string }   // never throws
```

**Logic**
1. CORS preflight; validate body (`school_website` + `school_name` + `city` + `state` required).
2. Read `FIRECRAWL_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` from env. Bail with `{error}` if missing.
3. Call Firecrawl REST `POST https://api.firecrawl.dev/v2/crawl`:
   - `url: school_website`
   - `limit: 10`, `maxDepth: 2`
   - `includePaths: ["/staff*","/about*","/our-team*","/faculty*","/directory*","/teachers*"]`
   - `scrapeOptions: { formats: ["markdown"], onlyMainContent: true }`
4. Poll the returned crawl job (`GET /v2/crawl/{id}`) every 4 s, hard cap 90 s.
5. Concatenate all page markdowns. Extract:
   - **Emails** — regex `/[a-z0-9._%+-]+@[a-z0-9.-]+\.(?:edu|org|k12\.[a-z]{2}\.us|us)/gi`
   - **Name for each email** — look at the 120 chars *before* the email match, find the last `Title Case` 2-3 word sequence (`/([A-Z][a-z]+(?:\s+[A-Z][a-z'\-]+){1,2})/g` → take last). Fallback: parse the email local part (`first.last@…` → "First Last").
   - **Grade/title hint** — look at 80 chars *after* the email for keywords (`Kindergarten|1st|2nd|...|5th|Grade \d|Teacher|Principal|Counselor`).
6. Dedupe by `lower(email)` within the batch.
7. Upsert into `teacher_prospects`:
   - Match on `lower(email)` — update `name`, `school`, `district`, `grade`, `apify_run_id` (passed through), refresh `updated_at`. Else insert.
   - Set `source_channel = 'Firecrawl /staff'`, `status = 'new'`, `fit_score = null`, `city`, `state`, `raw = { firecrawl_source_url, snippet }`.
8. Tally `inserted` / `updated`. Return.
9. Whole handler wrapped in try/catch → `{error}` with 200.

**Notes**
- Use `npm:@supabase/supabase-js@2`, plain `fetch` for Firecrawl (no SDK).
- `verify_jwt = false` defaults are fine; no `config.toml` change.

## 2. Frontend wiring — `src/components/teacher-prospects/FindProspectsModal.tsx`

After `fetch-teacher-prospects` resolves successfully:

1. Pull the schools that came back. Today the function only returns counts — extend its response to include `schools: Array<{ school_name, website, district, apify_run_id }>` (filter to those with a non-empty website).
2. Show progress toast: `Found ${schools.length} schools → enriching staff (0/${N})…`.
3. Run a **bounded-concurrency** loop (max 5 in flight) calling `supabase.functions.invoke('enrich-school-staff', { body: {...} })` for each school. Each call has its own 90 s ceiling on the server side; client uses `Promise.allSettled`.
4. Tick toast on each settle: `enriching staff (k/N)…`.
5. When done: `toast.success(`${totalInserted + totalUpdated} teachers across ${schools.length} schools`)`, then `onResults(cityId)` and close modal.

## 3. Tiny tweak to `fetch-teacher-prospects`

Only change: also return the per-school payload the modal needs.
```ts
return ok({
  inserted, updated: 0, total, state_total, run_id,
  schools: inCity.map(s => ({
    school_name: pickStr(s.school_name, s.SCH_NAME, s.name),
    website:     pickStr(s.website, s.WEBSITE, s.url),
    district:    pickStr(s.district_name, s.LEA_NAME, s.district),
    apify_run_id: runId,
  })).filter(s => s.website),
});
```
No other behavior changes.

## 4. Files touched

- **new** `supabase/functions/enrich-school-staff/index.ts`
- **edit** `supabase/functions/fetch-teacher-prospects/index.ts` (add `schools[]` to response — ~10 lines)
- **edit** `src/components/teacher-prospects/FindProspectsModal.tsx` (chain + progress toast — ~40 lines)

## 5. Out of scope (deferred)

- Fit-score AI enrichment (Day 7)
- Camp-experience signal (Day 7)
- Pagination / background queue if a city has >50 schools (acceptable today — Frisco has ~70 schools, ~14 enrichment batches at concurrency 5)
- LinkedIn anything

## 6. Risk / honesty

- Firecrawl hit rate on real district sites is ~40–60%. Many schools post staff as **PDFs** or **gated parent portals** — those won't yield emails.
- Name + email pairing via regex is heuristic. Expect ~10–15% of extracted rows to have a wrong/garbled name. Email is the trustworthy field.
- Total runtime for a city with 50 schools ≈ 90 s (Apify) + ~3 min (Firecrawl, concurrency 5). Modal will show progress the whole time.

Approve and I'll build it.
