## Goal
Make Teacher Prospects return real rows for Frisco instead of staying empty.

## What’s broken now
- The database table `teacher_prospects` is confirmed empty.
- The school-fetch function is still returning only 15 schools for all of Texas.
- Because none of those 15 are in Frisco, the system finds 0 matching schools.
- Since school enrichment only runs after school matches exist, the Firecrawl step never starts.

## Plan
1. Fix the school-fetch function so it can reliably return Frisco schools from the current actor output.
   - Inspect the deployed payload and result shape from the actor.
   - Correct the query/pagination behavior so Texas is not truncated to 15 rows.
   - Add stronger logging for actor input, dataset totals, and city-match counts.

2. Verify the enrichment handoff after school matches are found.
   - Confirm the frontend main-page button runs the same fetch → enrich chain.
   - Confirm `enrich-school-staff` is invoked for matched schools.
   - Confirm inserts/updates land in `teacher_prospects`.

3. Validate with a real Frisco run.
   - Run the fetch for Frisco, TX.
   - Check recent function logs for both functions.
   - Query the table to confirm real rows exist and are visible in the app.

## Technical details
- Files likely involved:
  - `supabase/functions/fetch-teacher-prospects/index.ts`
  - `supabase/functions/enrich-school-staff/index.ts`
  - `src/pages/TeacherProspects.tsx`
- Validation will use:
  - edge function logs
  - direct function invocation
  - direct database reads from `teacher_prospects`

## Expected outcome
After rerunning search for Frisco, the backend should produce matched schools, trigger staff enrichment, and populate visible rows in `teacher_prospects`. 