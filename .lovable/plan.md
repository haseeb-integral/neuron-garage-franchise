# Phase 1 — Widen freshness window (30/60 → 90/120)

## What changes

Saved-data refresh thresholds move from:
- **Old:** 0–30 skip · 31–60 prompt · >60 fresh · fallback ≤60
- **New:** 0–90 skip · 91–120 prompt · >120 fresh · fallback ≤120

"Force fresh" still overrides everything. No DB schema change. No data migration.

## Files touched

1. **`src/lib/mvs/preCrawlFreshness.ts`** — `FRESH_SKIP_DAYS = 90`, `FRESH_PROMPT_DAYS = 120`. Update header comment.
2. **`supabase/functions/mvs-run-pipeline/index.ts`** — backend hard-guard `FRESH_SKIP_DAYS = 90` (line 129); soft-fail fallback window `ageDays <= 60` → `<= 120` (line 347) and error message `>60` → `>120` (line 353); comment on line 126 + 328.
3. **`src/pages/MarketValidationRollout.tsx`** — button tooltip "≤ 30 days" → "≤ 90 days" (line 316); footer note "≤ 30 days old" → "≤ 90 days old" (line 801).
4. **`src/data/userGuideMarkdown.ts`** — 4 user-facing lines (124–126, 143–145) updated to 90/120.
5. **`src/pages/MVSMethodology.tsx`** — lines 164–165 freshness + soft-fail paragraphs.
6. **`docs/feature-1a-mvs-v1-spec.md`** — lines 9, 37, 38, 193, 231 (spec wording).

UI dialog already says "X days ago" dynamically — no copy change needed there.

## Risk

- Cities may show data up to 90 days old without warning. Mitigation: Force fresh button unchanged.
- UI and backend constants must move together (both bumped this phase) so they don't disagree.

## Verify

- Type-check passes.
- Open `/market-validation`: Run tooltip shows "≤ 90 days"; footer note shows "≤ 90 days".
- A city with ~45-day-old data should now skip silently (was: prompt).
