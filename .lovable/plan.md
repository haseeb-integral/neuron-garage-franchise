## Goal
Make Teacher Prospects search reliable so running a city search always produces schools first and teacher rows second.

## Exact problem
- The current backend starts a state-wide Apify run, then filters the results down to the city.
- For big states like Texas, that actor is unstable:
  - sometimes it is still `RUNNING` when our function times out,
  - sometimes it gets rate-limited by NCES on page 2,
  - when that happens it only returns the first 15 schools.
- Because Frisco never appears in those 15 rows, enrichment never starts and `teacher_prospects` stays empty.

## Permanent fix
1. Replace the school-discovery step in `fetch-teacher-prospects`.
   - Stop depending on the state-wide `jungle_synthesizer` run for city searches.
   - Query NCES directly by `city + state` and parse the city-scoped school results.
   - Return matched schools plus websites/districts in the same response shape the frontend already expects.

2. Keep Firecrawl as the primary staff-enrichment layer.
   - Preserve `enrich-school-staff` as the step that turns school websites into teacher/email rows.
   - Ensure the main page still runs fetch → enrich → reload results.

3. Make failure states explicit and non-confusing.
   - Remove the misleading “try a smaller state” behavior for city searches.
   - Return clearer errors when NCES returns no city matches or no usable websites.
   - Add logs for schools found, schools with websites, enrichment started, and rows inserted.

4. Validate end-to-end with Frisco, TX.
   - Run the new school fetch.
   - Run enrichment on returned Frisco schools.
   - Confirm `teacher_prospects` contains rows afterward.

## Files to update
- `supabase/functions/fetch-teacher-prospects/index.ts`
- Possibly `src/pages/TeacherProspects.tsx` only if the frontend needs better error messaging

## Expected result
When you click search for Frisco, the backend should fetch Frisco schools directly, start enrichment for the schools with websites, and finally populate `teacher_prospects` instead of leaving it empty.