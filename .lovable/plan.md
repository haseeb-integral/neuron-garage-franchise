## Status check against the 7-item v1.0 list

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | **PDF Market Brief (Phase 6)** | ❌ Not started | No PDF generator, no download button anywhere. |
| 2 | **QA Queue review page** | ✅ Done (with active polish) | `/mvs-qa-queue` exists, shows screenshot, AI guess, status dropdown, save, mark-resolved, city filter, provider grouping, provider-issue rows. Today's work improved evidence URL discovery, dedup, dropdown wording. |
| 3 | **Wire up Census ACS (Stage 4)** | ❌ Not started | No `mvs-acs-pull` step. Orchestrator `mvs-run-pipeline` does not call ACS. Scores 3 and 6 still use incomplete inputs. |
| 4 | **Run pipeline for 7 Tier A cities + Boston gate** | 🟡 Partial | Pipeline is runnable per city; Austin live, Philadelphia just exercised. NYC, Houston, Chicago, Boston, San Antonio, LA not yet flipped to Live. Boston calibration gate not implemented. |
| 5 | **Consolidate duplicate week extractors** | ✅ Done | Only `mvs-extract-weeks` exists; `-all` and `-austin-all` are gone. |
| 6 | **`/mvs-preview` admin sanity-check page** | ❌ Not started | No preview page exists. |
| 7 | **"One calibrated number everywhere" end-to-end** | 🟡 Partial | Verified on row / detail / compare. Cannot complete until PDF (#1) exists. |

## Safest, lowest-risk, one-turn next item

**Item 5 is already done, so the safest remaining one-turn task is Item 3 — add the ACS pull step (`mvs-acs-pull`) and call it from `mvs-run-pipeline`.**

Why this is the safest single turn:
- It is additive only: a new edge function plus one extra call in the orchestrator.
- No UI changes, no schema migration if we reuse the existing v1.0 ACS pipeline table for population denominators.
- Failure mode is contained: if ACS fails, scores 3 and 6 stay on current inputs (same as today). No regression risk for already-working surfaces.
- It unblocks accurate Scores 3 and 6 before any Tier A city is flipped to Live, which is required for #4 to be trustworthy.

Item 6 (`/mvs-preview`) is also low risk and one turn, but it is optional per the spec and does not unblock anything else.

## Proposed next single turn (only if you approve)

Implement Item 3:
1. Add `supabase/functions/mvs-acs-pull/index.ts` that, given `{ city, state }`, fetches "kids ages 5–12" and "affluent dual-income families" counts from the existing ACS source used by v1.0, and writes them to the city's MVS row (or a small `mvs_city_demographics` cache if v1.0 store is not reusable — decide after a 1-file read).
2. Call `mvs-acs-pull` from `mvs-run-pipeline` after provider discovery and before scoring, non-fatal on failure.
3. Read those fields in the Score 3 and Score 6 helpers (single calibrated helper — Brett's rule).
4. Verify: re-run pipeline for Philadelphia, confirm Scores 3 and 6 populate and the same numbers appear in row, detail panel, and compare modal.

No PDF work, no Tier A rollout, no UI restructuring in this turn.

Do you want me to proceed with Item 3 next, or pick a different item?