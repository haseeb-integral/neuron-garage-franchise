# Parked Fixes — Awaiting Approval

This is a running list of issues that are **identified, explained, and planned**, but **NOT to be implemented** until Brett (or Haseeb) approves. Tier 1 work always takes priority over anything on this list.

> **REMINDER FOR HASEEB:** Tier 1 is the current priority. After Tier 1 is finished, Lovable must remind Haseeb to get Brett's approval on every entry below before any work begins.

When a fix is approved, move it out of this list and into an active task.

---

_No parked fixes at the moment._

---

## Resolved

### Table row vs Center panel — category scores don't match for the same city
- **Filed:** 2026-05-27
- **Approved by Brett:** 2026-05-27
- **Shipped:** 2026-05-27
- **Fix:** `useCityRanking.ts` now writes the recomputed pillar scores (`categoryScores`) back onto each market row, so the ranked-table small Dem/TAM/Opp cells and the RowScorePopover read the same numbers that the selected-market panel, compare modal, and exports already used. One calibrated number everywhere.
- **Write-up retained at:** `docs/pending-approval/2026-05-27-nashville-score-mismatch.md`
