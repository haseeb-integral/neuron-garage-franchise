## Locked findings

- **AI reasoning is wrong because two layers disagree.** The backend returns a raw nudge like `demand +20`, but the frontend then converts a single-category intent into a full rebalance (`60 / 8 / 8 / 8 / 8 / 8`). The card is still showing the raw backend story, not the final sliders the user actually sees.
- **County is blank because the current source row has no county field wired.** `us_cities_scored` has `metro_area` but no live `county_name` column right now, and `CityScoring.tsx` currently hardcodes Austin's mapped `county` to `null`.
- **Austin is still split across two city identities.** The ranked page uses `us_cities_scored.id = 9241bf5b-e311-4fbd-be5d-ef0256e70233`, but Austin fetch jobs still live under legacy `cities.id = 6f6ccba5-7d70-4058-8744-12d76bddb52a`. That split is why drawer counts/statuses drift.
- **The drawer is showing the full 46-metric registry, not 46 populated Austin values.** Austin has one seeded `us_cities_scored` row plus only **5** `city_market_signals` rows on the scored-city UUID today, **0** competitor rows on that UUID, and **6** fetch-job rows only on the old legacy city id.
- **“Not in current scoring model” is intentional today.** Those rows are the registry metrics with `enabled: false` in `src/lib/sowMetricRegistry.ts`. There are **10** of them. They are visible for transparency, but they are not part of the composite formula.

## Austin facts to lock before implementation

- `us_cities_scored` Austin row exists and currently has:
  - `population = 967862`
  - `metro_area = Austin-Round Rock-Georgetown, TX`
  - `children_5_12 = 77659`
  - `median_household_income = 91461`
  - `dual_working_families_pct = 95.6`
  - `college_degree_pct = 58.2`
  - `cost_of_living_index = 97.057`
  - `public_school_count = 271`
  - `public_elementary_count = 177`
  - `private_elementary_count = 46`
  - `charter_elementary_count = 42`
  - `composite_score_default = 70`
- Legacy `cities` Austin row still exists separately and has `county = Travis`, older score fields, and old job history.
- **County answer:** for Austin city, the county should be **one county: Travis**. The **five-county list** belongs to the metro, not to the city county field. So we should not stuff all five counties into `county`.

## Implementation plan

### 1. Fix the AI reasoning mismatch
- Keep the existing rebalance behavior for now.
- Change the AI answer UI so it explains the **final applied weights**, not the raw backend delta.
- Replace chips like `Demand +20` with final weights such as `Demand 60%`, `Pricing Power 8%`, etc.
- Update the reasoning sentence so it says the dominant category was raised and the remaining categories were automatically rebalanced to keep total weight at 100.

### 2. Fix Austin geography with correct field meaning
- Add a real **`county_name`** field to `us_cities_scored` and backfill Austin with `Travis`.
- Add a separate **metro-counties field** (text array or text) for the metro coverage list, and backfill Austin with `Bastrop, Caldwell, Hays, Travis, Williamson`.
- Update the UI labels so:
  - **County** = city county (`Travis`)
  - **Metro area** = `Austin-Round Rock-Georgetown, TX`
  - **Metro counties** = 5-county metro list
- Name-vs-meaning rule: do **not** overload `county_name` with metro counties.

### 3. Stop the drawer from mixing scored-city and legacy-city evidence incorrectly
- Create a single resolver for the selected market that knows:
  - canonical scored city id
  - optional legacy city id
- Use `us_cities_scored` as the truth for ranked-market facts and seeded values.
- For legacy evidence tables (`city_fetch_jobs`, old audit/status rows), read them through the mapped legacy id only as a temporary bridge.
- Remove the current `county: null` façade mapping in `CityScoring.tsx`.

### 4. Make drawer counts match actual Austin data
- Recompute the header counts from the **merged Austin evidence set** instead of whichever side happens to answer first.
- Count seeded/proxy/live/missing/blocked from a deterministic merged source:
  - scored-row fallback metrics
  - signal rows on scored uuid
  - legacy status map only when needed for historical audit rows
- Ensure the header count and row-level badges come from the same merged dataset so they cannot disagree.

### 5. Cross-check every Austin value shown in the center panel and drawer
- Verify each visible Austin value against the backend before showing it.
- Fix labels that are using the wrong source or the wrong meaning.
- Ensure center-panel values come only from real Austin backend fields, never mock/sample values.
- Keep Austin as the only target for this pass; after approval of Austin, apply the same root-cause fix globally.

### 6. Make missing metrics honest instead of misleading
- Keep showing the 46 registry rows for audit transparency, but distinguish clearly between:
  - seeded and available
  - historically fetched live data
  - not seeded yet
  - source unavailable
- Change copy like `Not collected yet` / `Pre-seeded score · audit pending` where it currently implies there should already be a value when there is no Austin field or signal row.

### 7. Clarify “Not in current scoring model” without changing scoring math
- Keep those rows out of the formula because scoring-math changes are out of scope.
- Rename the section to something clearer, e.g. **Tracked, not used in score**.
- Add a short explanation that these are visible for audit transparency but are excluded because the current scoring registry marks them `enabled: false`.

## Technical details

**Files likely to change**
- `src/pages/CityScoring.tsx`
- `src/components/city-scoring/AiAnswerCard.tsx`
- `src/components/city-scoring/MarketDetailDrawer.tsx`
- `src/lib/cityScoringLiveData.ts`
- `supabase/functions/ai-city-query/index.ts` (only if needed for cleaner structured explanation text)
- database migration for Austin geography fields

**Backend changes**
- Add `county_name`
- Add `metro_counties`
- Backfill Austin values

**Risk**
- Medium: touches the scored/legacy bridge and drawer audit logic.

**Undo path**
- Revert the Austin-first bridge changes and geography fields; ranking source remains `us_cities_scored`.

## Out of scope for this pass
- Changing the 46-metric scoring formula itself
- Globally backfilling county and metro-county data for all cities
- Dropping the legacy `cities` table entirely
- Rebuilding all historical fetch-job rows onto the scored-city uuid space

If you approve, I’ll implement Austin-first and verify the drawer against the backend before claiming it fixed.