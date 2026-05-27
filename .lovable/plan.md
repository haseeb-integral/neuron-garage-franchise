## Goal

Remove **GreatSchools API**, **DonorsChoose**, and **Google Trends** from every user-visible doc, since these sources are no longer in scope.

## Files to touch (docs only — no app logic)

1. **`docs/architecture/system-overview.md`**
   - Section 4 table: delete the 3 rows (GreatSchools, DonorsChoose, Google Trends).
   - Section 5 data-flow diagram: remove `· GreatSchools (pending)` from the external-sources line.

2. **`docs/architecture/apis-and-data-sources.md`** (APIs & Data Sources sidebar page)
   - Delete the 3 table rows for GreatSchools API, DonorsChoose, Google Trends.

3. **`src/data/specMarkdown.ts`** (Full Spec sidebar page)
   - Line 237: remove "DonorsChoose activity (planned)" from fit-score inputs.
   - Line 245: drop "DonorsChoose" from the not-yet-wired list (keep Apollo/vendor lists wording).
   - Line 459: remove `donorschoose_id` from the `teacher_prospects` column list.
   - Line 549: remove the GreatSchools + DonorsChoose pending/blocked bullet.
   - Line 558: delete Task #11 (Wire GreatSchools API).

4. **`src/pages/Spec.tsx`**
   - Line 426: delete the `<li>` about wiring GreatSchools API.

5. **`src/data/demographicsMethodology.md`**
   - Line 82: drop "DonorsChoose activity" from the side-projects bullet.

6. **`src/data/emailOutreachDocs.md`**
   - Line 73: remove `DonorsChoose` from the source list (keep Apollo, Clay, LinkedIn Navigator, Manual CSV).

## Files NOT to touch

- Any scoring/data/hook/store code, edge functions, migrations, RLS, secrets, tests.
- Nashville parked fix — still parked, no work this round.
- `src/integrations/supabase/types.ts` (auto-generated; `donorschoose_id` column, if present in DB, is left alone — doc-only sweep).

## Risk

Low. Pure markdown/JSX text deletions in user-visible docs. Fully reversible.
