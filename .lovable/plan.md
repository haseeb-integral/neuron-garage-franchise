## What this does

The Competitive Landscape (CSI) numbers come straight from Brett's Manus v2 table. They should not be re-weightable by the user. This change makes the drawer match that reality and cleans up two related display gaps.

## Three fixes

### 1. Remove the 34 / 33 / 33 sub-weight knobs
- In the CSI drawer, the three +/- counters and the Apply button go away.
- They're replaced by a read-only panel showing each input's current value, the v2 formula, and a "Locked — pulled from Manus v2 table" note.
- City rank already uses Manus's `csi_score` directly; this just makes the UI honest.

### 2. Fix the slider/normalization ranges
Internal numeric ranges used by the formula preview were too narrow. New ranges = real p99 across all 817 cities:

| Input | Old cap | New cap |
|---|---|---|
| National Brand Supply | 25 | 60 |
| Local Camp Estimate | 125 | 250 |
| Demand-Adjusted Market | 45,000 | 100,000 |

Big metros (NYC, LA) will no longer all flat-line at 100 in the Show Formula view.

### 3. Show which brands are in each city
Manus stored a per-city brand list in `csi_brand_detail` (e.g. `"KinderCare(1)|Code Ninjas(2)"`). The drawer will display this as a small "Brands present" list so users can see *which* national brands are driving each city's CSI, not just the combined weighted number.

## Files touched (technical)

- `src/lib/sowMetricRegistry.ts` — CSI `weight_within_category` → 0 (forces server-score fallback)
- `src/lib/sowNormalize.ts` — new ranges (60 / 250 / 100,000)
- `src/stores/cityScoringStore.ts` — bump persist version 7→8, reseed sub-weights so old 34/33/33 from localStorage clears
- `src/components/city-scoring/SubMetricWeightsDrawer.tsx` — when `categoryKey === "competitiveLandscape"`, render a locked read-only panel instead of editable controls; hide Apply + Reset; add "Brands present" list from `csi_brand_detail`
- `src/lib/cityScoringLiveData.ts` — pass `csi_brand_detail` through to the drawer

## Things NOT touched

- The CSI formula itself (still Manus v2)
- `csi_score` values in the DB
- The composite math (still `0.40·Demand + 0.30·TAM + 0.30·(100 − CSI)`)
- TAM and Demand drawers (still editable)
- Anything outside `/city-scoring`

## Verification

- Hard-refresh (Cmd-Shift-R) clears the old store. Open Austin → CSI drawer should show 3 inputs with no +/- buttons, no Apply, plus a "Brands present" list.
- City ranking order should not change (composite math is unchanged).
- Open a big metro (NYC) → Show Formula panel should now show distinct sub-scores instead of three 100s.

## Doc sync after merge (Mode A — needs your "go")

Will draft updates to `PROJECT_CONTEXT.md` (note CSI sub-weights locked), `HOW_IT_WORKS.md` (drawer behavior), `GLOSSARY.md` (CSI = read-only Manus v2 ratio) and summarize in chat before writing.