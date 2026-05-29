# Parked Fixes — Awaiting Approval

_Last reviewed: 2026-05-29 — no active parks._



This is a running list of issues that are **identified, explained, and planned**, but **NOT to be implemented** until Brett (or Haseeb) approves. Tier 1 work always takes priority over anything on this list.

> **REMINDER FOR HASEEB:** Tier 1 is the current priority. After Tier 1 is finished, Lovable must remind Haseeb to get Brett's approval on every entry below before any work begins.

When a fix is approved, move it out of this list and into an active task.

---

_No parked fixes at the moment._

---

## Resolved

### Table row vs Center panel vs Compare modal — scores don't match for the same city
- **Filed:** 2026-05-27
- **Approved by Brett:** 2026-05-27
- **Shipped:** 2026-05-27 (v2 — full unification)
- **Symptom:** Nashville under non-default weights showed SCORE=100 / DEM=100 / TAM=79 / OPP=68 in the table row, Overall=100 / DEM=83 / TAM=73 / OPP=68 in the center panel, and Overall=79 (Tier C) / DEM=83 / TAM=73 / OPP=68 in the Compare modal. Four surfaces, three different "Overall"s.
- **Root cause:** Four parallel score pipelines. The table row and center panel were reading the DB-stored composite + pillars (frozen at scoring time, ignoring the user's current weights). Only the Compare modal honestly recomputed from the applied weights/sub-weights.
- **Fix (v2):** `useCityRanking` now ALWAYS routes every row through the shared `buildRecomputedPillarScores` + `buildRecomputedRawComposite` helpers (no more "default branch returns stored values"). `CityScoring.tsx` `detailCategoryScores` now reads from `selectedRerankedMarket.categoryScores` so the panel pillars are identical to the row pillars. Compare modal already uses the same two helpers. One calibrated number everywhere.
- **Write-up retained at:** `docs/pending-approval/2026-05-27-nashville-score-mismatch.md`
