## Audit findings

- **Root cause of the LeafSpring mismatch:** the top Live Engine run and the LeafSpring card are using the same address but different school inputs.
  - Live Engine screenshot: `Private elementary`, enrollment `600`, grade `K-5 / K-6` → **60.57**.
  - Card anchor: `Daycare`, enrollment `150`, grade `Other` → **44.37**.
  - The database confirms both values are internally correct for their own inputs. This is an input mismatch, not a formula mismatch.

- **Secondary bug:** on page load, anchor cards hydrate by `address` only. If the latest cached row for `11651 W Parmer Ln` was a Live Engine run with different inputs, the anchor card could accidentally display a score from the wrong school type/enrollment while the card still says `Daycare / Other`.

- **Sub-score cross-check:** the 44.37 card value matches the database and formula exactly:
  - School Profile 27.50
  - Affluence 47.94
  - Family Density 62.73
  - Ecosystem 33.19
  - Accessibility 53.21
  - Recomputed SAS = 44.37

- **Live fetching / compute lag:** yes, some values require external live calls when there is no exact cached result:
  - Mapbox geocoding
  - Mapbox 10/15-minute isochrones
  - Census ACS aggregation on cache miss
  - Urban Institute school ecosystem on state-cache miss/expiry
  - OSM/Mapbox road + highway distance
  - Mapbox parking signal
  - Map rendering should not recompute scoring, but engine reruns do.

- **Decision wording audit:** I found no direct Brett message saying to switch to **Go / No-Go / Watch**. That phrase appears in our own remaining-work handoff/status text. The implemented table currently stores `recommend / worth_a_look / dont_recommend`, matching the earlier 1B decision surface. So I should not claim Brett specifically recommended Go/No-Go/Watch unless he confirms it.

## Fix plan

1. **Make LeafSpring presets canonical everywhere**
   - Update the Live Engine quick-test preset for LeafSpring Cedar Park to use the same canonical inputs as the anchor card:
     - School type: `Daycare`
     - Grade band: `Other`
     - Enrollment: `150` unless you give me a better real enrollment number.
   - Add enrollment to quick-test presets so clicking a preset fills all scoring inputs, not just name/address/type/grade.

2. **Prevent wrong cached rows from patching anchor cards**
   - Change `/site-analysis` hydration so Trinity/LeafSpring anchor cards only accept cached `site_analyses` rows when **address + school_type + enrollment + grade_band** all match the anchor’s frozen inputs.
   - If the same address was run with different inputs, keep it as a separate candidate card only when there is room, not as the anchor result.

3. **Add an exact-input cache check before recomputing**
   - Before calling `compute-sas`, look for a recent ready row with the exact same address, school type, enrollment, and grade band.
   - If found, render that cached result immediately and avoid expensive live recompute.
   - Keep the existing **Re-run** button as the explicit way to force a fresh backend run.

4. **Tighten the UI wording so Haseeb/Brett can see why numbers differ**
   - Show a compact input line near each score: `Daycare · Other · enrollment 150`.
   - In the Live Engine result, show the same input summary so a 60.57 vs 44.37 mismatch is immediately explainable.

5. **Decision wording: keep current storage, optionally relabel display**
   - Do **not** change the database enum yet.
   - If you want Brett-facing labels to read Go / Watch / No-Go, map the existing stored values like this:
     - `recommend` → `Go`
     - `worth_a_look` → `Watch`
     - `dont_recommend` → `No-Go`
   - This is a display-only rename unless Brett explicitly asks to change stored values.

6. **Smoke test after implementation**
   - Hard refresh `/site-analysis`.
   - Click LeafSpring Cedar Park quick test → it should fill Daycare / Other / 150 and compute **44.37-ish**, matching the card.
   - Re-run the LeafSpring card → it should stay aligned with the Live Engine result for the same inputs.
   - Verify Trinity card and Live Engine preset align the same way.
   - Confirm decision summary and export use the same recomputed values.
   - Verify no unexpected engine rerun happens when an exact cached result exists.