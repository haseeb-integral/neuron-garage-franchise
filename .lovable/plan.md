## What's actually happening

I opened the file Brett uploaded (`neuron-garage-lovable-seed-v1.6-...csv`). Manus is right:

- **794 data rows** (not 200)
- **Top CSI = 95.00**, bottom = 5.00
- **Ranks 1 → 794**
- **`manus_export_version = v1.6` on every row**
- **No duplicate city+state pairs**

The file is correct. The bug is 100% in our importer (`src/components/phase2-demo/ImportManusCsvDialog.tsx`). Two problems:

### Bug 1 — We silently drop any city not in `us_cities_scored`

Line 158:
```
if (knownCities.size > 0 && !knownCities.has(key)) {
  return { ...r, status: "unknown_city", reason: "Not in US cities DB" };
}
```
And line 181 only writes rows with status `will_add` or `duplicate`. So `unknown_city` rows are **thrown away, no toast, no warning**.

Manus's file is mostly synthetic-sounding city names (Redbudgrove NM, Magnoliacliff IL, Cypressmeadow IN, etc.) — those don't exist in our `us_cities_scored` seed table. Only ~200 rows (real cities like Bloomington, Riverside, Covington) match, get written, and end up with rank ≥ 17 and CSI ≤ 21. That is exactly the "200 rows, max CSI 21.18, ranks 219–794" pattern we kept seeing.

### Bug 2 — We never read `manus_export_version` from the CSV

Line 122–131 only extracts `city`, `state`, `manus_csi_score`, `rank`. The column is dropped on parse, so it stays blank in the DB no matter what Manus sends.

## Plan — 1 phase, 1 turn

**Change only `src/components/phase2-demo/ImportManusCsvDialog.tsx`. No schema change, no other files touched.**

1. **Stop silently dropping "unknown" cities.**
   - Remove the `us_cities_scored` cross-check entirely. The Manus table is *reference data* — it should hold whatever Manus sends, even if the city name isn't in our US cities seed.
   - Drop the `knownCities` state and its lookup query.
   - Remove the `unknown_city` status from the preview.

2. **Read `manus_export_version` from the CSV** and pass it into the upsert payload so the column gets populated on every row.

3. **Add a small diagnostic line under the file summary** — literally what Manus asked for:
   > `File parsed: 793 rows • version v1.6 • top CSI 95.00 (Redbudgrove, NM)`
   
   So next time we can see instantly whether papaparse got the right file.

4. **Keep everything else the same:** CSI threshold, in-file dedup, upsert on `(city, state)`, human-shortlist and pipeline untouched.

## Risks / what stays safe

- Zero impact on human shortlist (`mvs_shortlist_cities`) or the pipeline.
- Zero impact on any scoring, crawlers, or UI outside this one dialog.
- Only the Manus reference table (`mvs_manus_cities`) changes — and it will now hold all 793 rows with correct CSI and version.

## What Brett tests after

1. Re-open the Market Validation page → **Import from Manus CSV** → drop the same file.
2. Preview should show **793 will add/refresh, version v1.6, top CSI 95.00**.
3. Click Confirm.
4. I verify the DB: 793 rows, min CSI 5, max CSI 95, ranks 1–794, version v1.6 on every row.

Say **go** and I'll ship it.