# Wire Teacher Search to real Apify data

## 1. Edge function: `supabase/functions/fetch-teacher-prospects/index.ts`

Contract:
```
POST { city: string, state: string, limit?: number }   // limit default 100
→ 200 { inserted: number, updated: number, run_id: string, total: number }
→ 200 { error: string }   // never throws
```

Notes on secrets — the existing Lovable Cloud secret is **`APIFY_API_TOKEN`** (not `APIFY_API_KEY`). I'll use that. Actor ID `jungle_synthesizer/k12-school-staff-directory-scrape` is hardcoded per your spec.

Logic:
1. CORS preflight + Zod-validate body `{ city, state, limit? }`.
2. Start Apify run async + poll (more reliable than `run-sync` for 100-row scrapes that can exceed the sync timeout):
   - `POST https://api.apify.com/v2/acts/jungle_synthesizer~k12-school-staff-directory-scrape/runs?token=…`
     body: `{ location: \`${city} ${state}\`, maxResults: limit ?? 100 }`
   - Capture `runId` + `defaultDatasetId` from response.
   - Poll `GET /v2/actor-runs/{runId}` every 5s until `status` ∈ {`SUCCEEDED`,`FAILED`,`ABORTED`,`TIMED-OUT`}. Hard cap 110s (Edge Function limit ~150s).
3. Fetch dataset: `GET /v2/datasets/{datasetId}/items?clean=true&format=json`.
4. Service-role Supabase client. Normalize each item defensively (Apify schemas vary):
   ```
   name             = item.name || `${item.first_name ?? ''} ${item.last_name ?? ''}`.trim()
   school           = item.school || item.school_name
   district         = item.district || item.school_district
   email            = (item.email || '').trim().toLowerCase() || null
   grade            = item.grade || item.grade_level
   experience_years = Number(item.years_experience) || null
   ```
   Plus literals: `city`, `state`, `fit_score: null`, `status: 'new'`.
5. Upsert: if `email` present → match on `lower(email)` → update; else insert. Tally `inserted` / `updated`.
6. Wrap entire handler in try/catch → `{ error }` with status 200 ("never throws" per spec).

## 2. Frontend wiring — `src/components/teacher-prospects/FindProspectsModal.tsx`

Replace the `setTimeout(1500)` mock with:
```ts
const city = sampleCities.find(c => c.id === Number(selectedCityId));
const { data, error } = await supabase.functions.invoke('fetch-teacher-prospects', {
  body: { city: city.city, state: city.state, limit: 100 }
});
if (error || data?.error) toast.error(...); else { toast.success(`${data.inserted + data.updated} prospects`); onResults(city.id); }
```

Page (`src/pages/TeacherProspects.tsx`) — add a `useEffect` that fetches from the `teacher_prospects` table filtered by selected city/state, mapping rows to the existing `TeacherProspect` shape so the table component is untouched. Also re-fetch after `onResults` fires.

## 3. Table display — `src/components/teacher-prospects/TeacherTable.tsx`

No structural changes. The mapping layer in step 2 handles missing fields:
- `fitScore: row.fit_score ?? null` → render as `—` when null (small adjustment to `FitScoreBadge` to handle null).
- `enrichmentStatus`: derive `'Enriched'` if `email` present else `'Pending'` (so the envelope icon already wired in `TeacherTable` lights up correctly).
- `tag`: derive from `status` ('new' → 'Untagged').
- `linkedin`, `phone`, `hasSummerCampExp`, `aiReasoning`: empty strings / false / `''` — these are display-only and degrade gracefully.

Filters, sorting, bulk-actions, detail panel — all untouched.

## 4. Out of scope (next sprint days)
- Fit-score AI enrichment (`fit_score` stays null; UI shows `—`).
- LinkedIn / camp-experience signals (Day 7 enrichment).
- Pagination of >1000 rows from `teacher_prospects`.

## Files touched
- **new** `supabase/functions/fetch-teacher-prospects/index.ts`
- **edit** `src/components/teacher-prospects/FindProspectsModal.tsx` (real invoke)
- **edit** `src/pages/TeacherProspects.tsx` (load from Supabase)
- **edit (tiny)** `src/components/teacher-prospects/FitScoreBadge.tsx` (render `—` when null)

## Open question

Your spec calls the secret `APIFY_API_KEY` but the project actually has **`APIFY_API_TOKEN`** (already set, used by `fetch-city-market-data-sow`). I'll use `APIFY_API_TOKEN`. Tell me if you'd rather I add a new `APIFY_API_KEY` secret instead.
