## Goal

Store **all** public schools per city (K–12, not just elementary) without breaking the live City Search UI. Rename the misleading `public_elementary_*` columns to `public_school_*`, and add explicit elementary-subset columns derived at write time. UI/signal_key rename and scoring formula decisions are deferred.

## Scope of this task (do now)

1. **Migration on `us_cities_scored`**
   - Rename `public_elementary_count` → `public_school_count`
   - Rename `public_elementary_enrollment` → `public_school_enrollment`
   - Add new columns:
     - `public_elementary_count` (int, nullable) — schools where `low_grade ≤ 05`
     - `public_elementary_enrollment` (int, nullable) — enrollment sum for that subset
   - Leave `private_elementary_count` and `charter_elementary_count` untouched (currently unwritten; rename later when we populate them).

2. **Edge function: `seed-cities-database`**
   - In `fetchNcesForCity()`:
     - Drop the `school_level IN (1,4)` filter — keep ALL open schools (`school_status === 1`) in the alias-matched city.
     - Compute `public_school_count` = total open schools, `public_school_enrollment` = sum of enrollment.
     - Compute `public_elementary_count` / `public_elementary_enrollment` from rows where `low_grade` parses to ≤ 5 (treat `PK`/`KG`/`KH` as ≤5).
   - In the upsert row (~line 509) write all four fields.
   - In `normalizeOnly` select (~line 396) and `supplyParts` (~line 424): **keep using `public_elementary_count` / `public_elementary_enrollment`** for the franchise-supply scoring — formula stays accurate to K–6 camper base.

3. **Edge function: `_shared/metricFetchers.ts`**
   - No column writes here; only internal field names on `NcesElementaryStaffing`. Leave as-is (still semantically about elementary teacher FTE, which is correct).

4. **Edge function: `fetch-school-counts`**
   - Signal_keys `public_elementary_count` / `public_elementary_enrollment` stay (UI reads them). No change.

5. **Regenerate Supabase types** (auto on migration apply).

6. **Verify Boston**
   - Re-run seed for Boston only.
   - Expected: `public_school_count` ≈ 115, `public_elementary_count` ≈ 83.

7. **Then run all 800.**

## Deferred to LATER.md / OPEN_TASKS.md

- **UI rename pass**: `CityScoring.tsx` lookups by `signal_key` "public_elementary_count" still display elementary numbers (correct today). When we later want to surface "total schools" as its own row, add a new `public_school_count` signal in `fetch-school-counts` and a row in `CityScoring.tsx`. Tracked as new task: **"City Search: add total-schools widget alongside elementary"**.
- **Rename `private_elementary_count` / `charter_elementary_count`** → `_school_count` + add elementary subset siblings. Do when those data sources are wired (currently unpopulated).
- **Scoring re-decision**: confirm with Sam whether `score_franchise_supply` should later blend elementary + middle/high once we recruit camp-only enrichment teachers from middle schools. Tracked.
- **Teacher search**: gains access to the wider school pool automatically once columns exist; teacher edge function work itself is already a separate open task.

## Risk + rollback

- **Risk: low.** Column rename is a single `ALTER TABLE`. Existing rows keep data (rename preserves values). UI reads via `signal_key` strings on `city_market_signals`, not directly from `us_cities_scored` columns, so the rename does not break the City Search screen.
- **One file writes the renamed columns**: `seed-cities-database/index.ts`. Updated in same deploy.
- **Rollback**: reverse `ALTER` + revert edge function. No data loss.

## Acceptance

- Migration applied, types regenerated.
- `seed-cities-database` deployed.
- Boston row shows `public_school_count` ≈ 115 and `public_elementary_count` ≈ 83.
- City Search UI for Boston still renders the same "Public Elementary Schools" number as before (≈83 now, since we switched to the low_grade ≤ 05 definition — this is the more defensible NCES-matching number we agreed on).
- LATER.md / OPEN_TASKS.md drafts prepared for Haseeb approval (per Doc-sync Mode A).

## Technical notes

```text
NCES low_grade values seen in CCD: "PK","KG","01"-"12","UG","AE"
Elementary filter: low_grade in {"PK","KG","01","02","03","04","05"}
                   AND school_status = 1 (open)
                   AND city matches alias set
Total filter:      school_status = 1 AND city matches alias set
```

Will draft the migration SQL + the `fetchNcesForCity` rewrite as the first two steps on implementation.
