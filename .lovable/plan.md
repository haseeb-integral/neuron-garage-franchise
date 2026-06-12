## Spell out "PEE" on Market Validation

**What PEE stands for:** Premium Enrichment Ecosystem (already in the formula block on the same page).

**Where "PEE Score" currently appears (user-facing):**

1. **Composite card label** — `src/pages/MarketValidation.tsx` line ~278
   - Current: `PEE Score`
   - New: `Premium Enrichment Ecosystem Score` (with `PEE` in parentheses on hover/tooltip, or just spelled out)

2. **Shortlist table column header** — `src/components/phase2-demo/ShortlistTable.tsx` (need to confirm exact line; this is the table at the top of the page)
   - Current header likely reads `PEE` or `PEE Score`
   - New: `Premium Enrichment Score` (shorter to fit the column) with tooltip "Premium Enrichment Ecosystem Score"

3. **Decision-points list** — line ~256 of `MarketValidation.tsx`
   - Current: "…override a borderline PEE Score?"
   - New: "…override a borderline Premium Enrichment Score?"

**Also check (read-only sweep, no other edits unless found):**
- The "Decision points" copy block
- Any tooltip / aria-label using "PEE"

**Not changing:**
- Internal variable names, comments, SOW references, or the formula block (which already says "Premium Enrichment Ecosystem Score = …")
- Site Analysis page (no PEE references there)

**Verify:** `rg -n "PEE" src/` after edits — only non-user-facing occurrences (comments, internal IDs) should remain.
