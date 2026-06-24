
# Plan — Fix soft-hide so it works for every card type

## What's broken
Previous fix only hides a card when its slot id starts with `persisted-`. But there are 3 ways a card can end up in the view:

1. **Hydration from DB** → slot id = `persisted-<row.id>` ✅ hide works
2. **"Load into card" from Saved Sites drawer** → slot id = `loaded-<timestamp>` ❌ hide does nothing → refresh brings it back
3. **Freshly computed via Live Engine** → slot id = `slot-<timestamp>` ❌ same problem

## Fix (1 turn)
Track the underlying `site_analyses.id` directly on the slot.

**File:** `src/pages/SiteAnalysis.tsx` only.

1. Add `analysisId?: string` to `SlotState`.
2. Hydration sets `analysisId = row.id`.
3. preferCache hit in `runSlot` sets `analysisId = cached.id`.
4. `removeSlot`: if slot has an `analysisId`, hide it (covers all three slot types).

**Not touched:** scoring math, compute-sas, DB schema, RLS, MV page.

## Verification (Playwright)
1. Score 4 sites → ✕ a fresh card → refresh → stays gone.
2. Load from Saved Sites drawer → ✕ → refresh → stays gone.
3. Hydrated persisted card → ✕ → refresh → stays gone.
4. Load a hidden one from drawer → reappears with no compute-sas call → refresh keeps it visible.
