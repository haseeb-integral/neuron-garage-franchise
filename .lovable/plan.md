## No-Fake-Numbers Refactor — MV + SAS

### Goal
Two things in one pass:
1. **No fake/demo numbers ever leak into scoring or displayed scores** on MV or SAS pages. Empty state = "—" with a "Not yet scored" pill.
2. Split `src/data/phase2DemoData.ts` so real config and shared types are not mixed with demo fallbacks.

### Safety promises (will not change)
- MV page still loads, lists all 9 cities, live data still shows.
- SAS page still loads. Saved live sites still show.
- Build stays clean, all 121 tests still pass.
- Live scoring engine (`computeMvs`, `useLiveMvs`, `useSiteScore`, `cityScoringLiveData`) is not touched.

### Audit findings (so far — will reconfirm when background audit returns)

| Symbol | Real category | Leaks fake numbers into scoring? |
|---|---|---|
| `SITE_CONFIDENCE_THRESHOLDS` | Real SAS config | No |
| `SCHOOL_PROFILE_FACTORS` | Real SAS doc data | No (rendered on methodology page only) |
| `MARKET_BALANCE_BANDS`, `MARKET_BALANCE_ACTIVE_BAND` | Cosmetic chip labels | No, but `ACTIVE_BAND` is hardcoded "underserved" — only used on Methodology page, not MV scoring |
| `SCRAPE_CADENCE`, `QA_QUEUE_FLAGGED_COUNT` | UI labels | No |
| `ShortlistRow`, `SiteAnalysisDemoSite` | TypeScript types | No |
| **`SHORTLIST_DEMO`** | Seed list of 9 cities + **fake pricing / scaledOperator / diversity / depth / composite numbers** | **YES** — when no live overlay exists, the ShortlistTable shows these numbers as if real |
| **`sanAntonioMarketValidationDemo`** | Sub-scores, signals, providers | Currently unused on MV page (LiveCityDeepDive replaced it). Still fed into `sampleBriefAdapter` for PDF export. |
| **`austinSiteAnalysisDemo`** (Trinity + LeafSpring) | Two demo sites with hardcoded composites | **YES** — rendered on SAS page as if real sites |
| `SITE_ACCESSIBILITY_CALLOUTS` | Hardcoded "3 min · Loop 360" etc. for Trinity / LeafSpring | Tied to the two demo sites — goes when they go |
| `sampleBriefAdapter.deriveBalance()` | Back-solves marketBalance from demo composite | **YES** for sample rows — only runs when row has no live data |

### Your answers locked in
- **Empty score cells → "—" with a "Not yet scored" pill.**
- **Trinity / LeafSpring removed entirely** from SAS — only live sites show.

---

### Phases (4 small turns)

**Phase 1 — Stop fake-number leak on MV table (1 turn)**
- `ShortlistTable.tsx`: when no live overlay exists for a row, render each score cell as "—" instead of `r.pricing`, `r.scaledOperator`, etc. Add a small "Not yet scored" pill next to the city name when overlay is missing.
- `SHORTLIST_DEMO`: strip the fake number fields. Keep only `id`, `city`, `state`, and a flag/label. The 9 cities still appear in the table (so the list is preserved) but their score columns show "—" until the pipeline runs.
- `decisionsExport.ts`: when no overlay, write empty string in CSV instead of the demo number.

**Phase 2 — Remove Trinity / LeafSpring from SAS (1 turn)**
- Delete `austinSiteAnalysisDemo` and `SITE_ACCESSIBILITY_CALLOUTS`.
- `SiteAnalysis.tsx`: remove all references; show an empty-state card ("No sites saved yet — add a candidate site to begin") when the live saved-sites list is empty.
- `SavedSitesDrawer.tsx`: confirm it only reads live `useSavedSites`, not demo.

**Phase 3 — Clean the sample PDF brief path (1 turn)**
- `sampleBriefAdapter.ts`: stop deriving fake `marketBalance` from a demo composite. If a row has no live data, the brief export button is disabled (or routes to a "needs live data" message). PDF brief becomes live-only.
- Remove `sanAntonioMarketValidationDemo` usage. Remove the file's `subScores` and `premiumProviders` blocks entirely.

**Phase 4 — Split the file (1 turn, zero behavior change)**
- New `src/lib/sas/config.ts` ← `SITE_CONFIDENCE_THRESHOLDS`, `SCHOOL_PROFILE_FACTORS` (real SAS config).
- New `src/lib/mvs/shortlistSeed.ts` ← the slim seed list (id/city/state only) + `ShortlistRow` type + `MARKET_BALANCE_BANDS`, `SCRAPE_CADENCE`, `QA_QUEUE_FLAGGED_COUNT`.
- Delete `src/data/phase2DemoData.ts`.
- Update all 9 import sites to the new paths.
- Run typecheck + vitest.

### Risks and what NOT to touch
- Do NOT change `computeMvs.ts`, `useLiveMvs.ts`, `useSiteScore.ts`, `cityScoringLiveData.ts`, or any edge function — live scoring is correct, this is only about removing fake fallbacks.
- Do NOT touch the Methodology pages' rendered sample tables (those are clearly labeled as documentation examples, not scores).
- Risk: a test might assert on `row.pricing = 88` for NYC. Mitigation: typecheck + vitest run after each phase; fix tests to match the new shape.

### Verification after Phase 4
- `/market-validation` → all 9 cities visible. Cities without live data show "—" + "Not yet scored". Live cities (e.g. Austin) show live numbers.
- `/site-analysis` → no Trinity / LeafSpring. Empty state if no live sites; saved live sites render normally.
- Search the codebase: `rg "phase2DemoData"` returns no hits.
- `tsgo --noEmit` clean, `vitest run` all green.
- CSV export and PDF brief still work for live cities.

Waiting for your approval before I start Phase 1.
