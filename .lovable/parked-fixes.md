# Parked Fixes — Awaiting Approval

This is a running list of issues that are **identified, explained, and planned**, but **NOT to be implemented** until Brett (or Haseeb) approves. Tier 1 work always takes priority over anything on this list.

> **REMINDER FOR HASEEB:** Tier 1 is the current priority. After Tier 1 is finished, Lovable must remind Haseeb to get Brett's approval on every entry below before any work begins.

When a fix is approved, move it out of this list and into an active task.

---

## 1. Table row vs Center panel — category scores don't match for the same city

**Filed:** 2026-05-27
**Status:** PARKED — awaiting Brett's approval
**Full write-up:** [`docs/pending-approval/2026-05-27-nashville-score-mismatch.md`](../docs/pending-approval/2026-05-27-nashville-score-mismatch.md)

### One-line summary

For the same city (e.g. Nashville), the ranked table row shows one set of Dem / TAM / Opp numbers, and the center "Selected Market" panel shows a different set — even though the big Overall Score on top can be the same `100` in both places.

### Why the big number still matches

Two slightly different small-grade combinations can round to the same big grade after weighting and calibration, especially near `100`. So a matching Overall Score is **not** proof that the underlying category scores are consistent.

### Why it's a bug, not a feature

Brett's May-24 rule is **"one calibrated number everywhere."** The May-26 and May-27 fixes closed this for the compare modal but didn't finish the cleanup for the ranked table row vs center panel. This is the leftover.

### Fix (for when approved)

One shared scoring helper, called by:
- ranked table row cells (Dem / TAM / Opp / Score)
- center panel (overall score + category bars + driver text + formula popover)
- compare modal
- Excel + PDF exports

Files likely touched: `useCityRanking.ts`, `RankedMarketsList.tsx`, `CityScoring.tsx`, `recomputedPillars.ts`.

**Risk:** Low. Display-only unification. No DB / edge function / formula / calibration changes.

---
