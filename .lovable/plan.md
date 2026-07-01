## What I checked first

**Q1 — Is B1 / B3 wired into the "Catch-Up Missing Prices" UI button?**

- The UI button in `LiveCityDeepDive.tsx` calls `mvs-discover-providers` with `{ city, catchupBatch: [ids] }`.
- Inside the edge function's catchup block:
  - **B3 (Google AI Overview) IS wired in.** It fires as the final fallback (line 1528), but ONLY when Firecrawl + Gemini extraction returned no price at all.
  - **B1 (Brand Price Propagation) is NOT wired into catch-up.** It only runs at the start of a Force Fresh full pipeline (`propagateBrandPrices` at top of file).
- Chicago database check: `ai_overview_snippet=0`, `price_derived_from_brand=0`, `platform='google_ai_overview'=0`, `price_needs_review=0` out of 194 rows.
- So B3 code did run, but Apify either returned no AI Overview box for those queries, OR the earlier Firecrawl steps already found a price and B3 was skipped. B1 never ran because the button skips the brand-propagation step.

**Q2 — Are `ai_overview_snippet` and `ai_overview_source_url` on the table?** Yes, confirmed on `mvs_providers`. The drawer already reads them. They are simply empty because no B3 hits landed for Chicago.

---

## Plan (2 small phases)

### Phase 1 — "Why unpriced?" reason chip in the UI

Goal: every unpriced camp shows one short reason so the reader knows why. Hide the whole line/section when the count is 0.

**Reason categories (computed client-side from existing columns, no schema change):**

| Reason chip | Rule |
|---|---|
| Excluded (non-camp) | `classifyExclusion()` says excluded |
| No website on file | `website_url` and `url` both empty |
| Booking wall (JS-only site) | domain in Sawyer / Enrollsy / ActivityHero list AND no price |
| Directory-only, no price shown | has listing_url but no price_min |
| Tried all sources, no price found | has website, catchup ran, still null |
| Needs human review | `price_needs_review = true` |

**Where the chip shows:**
1. **Provider Evidence table** (`ProviderEvidence.tsx`): a small muted "Why unpriced" pill in the price cell for rows where `price_min IS NULL AND not excluded`.
2. **Evidence Drawer**: one sentence under the Tuition Truth block: "Why we have no price: <reason>".
3. **LiveCityDeepDive** unpriced summary card: a small breakdown like "12 no website · 8 booking wall · 5 needs review". Whole block hidden when unpriced total = 0.

**Files touched:**
- `src/lib/mvs/unpricedReason.ts` (new pure helper).
- `src/pages/ProviderEvidence.tsx` (chip + drawer line).
- `src/components/phase2-demo/LiveCityDeepDive.tsx` (summary breakdown, hidden when 0).

**Turns:** 1

### Phase 2 — Wire B1 brand propagation into the catch-up path (optional, ask first)

Not requested in this message. Flagging it so you decide later. Right now brand-derived prices only appear after a full Force Fresh. If you want the UI Catch-Up button to also copy sibling brand prices, that's a separate ~1 turn change to `mvs-discover-providers`.

**Not doing this now unless you say so.**

---

## Risks / not touched
- No DB schema changes.
- No edge function changes in Phase 1 (pure UI).
- Existing Verify/Reject flow, CSV export, and scoring math unchanged.

## What to test after Phase 1
- Open Chicago Evidence — each unpriced row shows a reason chip; priced rows unchanged.
- Chicago has 0 rows with `ai_overview_snippet` → the "Google AI Overview" description block stays hidden (already the case).
- If a city has 0 unpriced camps, the "Why unpriced" summary block does not render at all.

Reply **"go phase 1"** to build. Say **"also B1 in catch-up"** if you want Phase 2 too.