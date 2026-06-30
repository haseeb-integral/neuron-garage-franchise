## Are the risks covered?

**Yes — both risks from the earlier plan are handled:**

1. **"Cities may show data up to 90 days old without warning"**
   - Mitigated by: **Force Fresh** button (unchanged, always overrides) + the existing amber "stale" badge still shows the exact age on each row, so the user can see "this is 78 days old" and choose to re-crawl.

2. **"UI and backend constants must move together"**
   - Already handled in the prior phase: `src/lib/mvs/preCrawlFreshness.ts` (frontend) AND `supabase/functions/mvs-run-pipeline/index.ts` (backend hard-guard at line 129) were bumped to 90 in the same turn. The fallback window at line 347 was also widened to 120. So UI and backend agree.

## Did we miss anything? → Yes, 2 small spec-doc lines

I re-scanned every file that mentions day-based freshness. Code and user-facing copy are all updated. **But the technical spec doc `docs/feature-1a-mvs-v1-spec.md` still has two stale "60" numbers that contradict the rest of the spec** (which already says 90/120 at lines 9, 38, 193):

- **Line 178** — says `failed_no_data` means "no usable saved data within **60d**". Should be **120d** to match the backend.
- **Line 219** — says soft-fail fallback uses "saved data **≤60d**". Should be **≤120d** to match the backend.

These don't affect runtime behavior (code is correct), but they make the spec internally inconsistent and will confuse anyone reading it.

**Other places I checked and confirmed clean:**

- `src/lib/mvs/preCrawlFreshness.ts` → 90/120 ✓
- `supabase/functions/mvs-run-pipeline/index.ts` (hard-guard + fallback) → 90/120 ✓
- `supabase/functions/mvs-refresh-all/index.ts` → no own freshness guard, delegates to `mvs-run-pipeline` ✓
- `src/data/userGuideMarkdown.ts` (lines 124, 144, 145, 146) → 90/120 ✓
- `src/pages/MVSMethodology.tsx` → updated ✓
- `MarketValidationRollout.tsx` tooltips/footers → updated ✓
- `src/integrations/supabase/types.ts` → only the `done_stale` enum value, no day numbers (correct, auto-generated)
- The 3-minute `STALE_MS` in `mvs-run-pipeline` and `mvs-refresh-all` → this is a different thing (run-lock timeout for crashed pipelines), NOT data freshness. Leave it alone.

## Proposed cleanup phase (very small — 1 turn)

**File:** `docs/feature-1a-mvs-v1-spec.md`

- Line 178: `60d` → `120d`
- Line 219: `≤60d` → `≤120d`

**Risk:** none — doc-only edit, no code or runtime touched.

**Effort:** 1 Lovable turn, ~2 line edits.

Approve and I'll make these two doc fixes so the spec matches the code.
