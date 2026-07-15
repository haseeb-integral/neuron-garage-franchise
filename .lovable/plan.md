
# Plan — Most Accurate Provider Pricing (v2, isolated)

## Goal in one sentence

Get the weekly price right for as many providers as we can, and let a human trust the number in 10 seconds — **without touching any other feature in the app**.

## Why we are changing this

Today's Steps 1–3 read numbers off scraped pages but **don't check units**. Multi-week sessions, monthly daycare tuition, and full-summer bundles all get stored as "per week." Audit of the top 20 Austin Premium rows: **20 of 20 were wrong**.

B3 (Google AI Overview) got the right weekly price on **14 of 20** rows (70%) and correctly flagged junk rows (Home Depot, daycares) that Steps 1–3 falsely tagged Premium.

Cost stays flat: today ≈ $2–$3 per city, new plan ≈ $2–$4 per city. The win is accuracy and trust, not savings.

---

## New pricing order

```text
Step 0  Category filter        (reuse existing classifyExclusion.ts)
Step 1  B3 Google AI Overview  (Apify) — PRIMARY, returns price + is_summer_camp
Step 2  Firecrawl search       (only if Step 1 didn't answer) — unchanged code
Step 3  Firecrawl scrape       (only if Step 2 found pages) — unchanged code
Step 4  Gemini unit-aware      (extract amount + unit, normalize to weekly)
Step 5  Sanity ceiling         (flag anything > $1,200/wk for review)
```

---

## Where does "category" at Step 0 come from?

Two layers, both cheap:

**Layer 1 — Name pattern match (already exists).** We reuse `src/lib/mvs/classifyExclusion.ts`, the same helper the Strict Camp View uses today. It matches obvious non-camp names (daycare, preschool, Home Depot, public library, park). No new logic — we just call it earlier, before we spend Apify or Firecrawl credits.

**Layer 2 — B3 also returns a category.** Since B3 is Step 1 anyway, we ask it two things in the same Apify call:
1. What is the weekly price?
2. Is this a real summer day camp for kids? (`is_summer_camp: yes | no | unsure`)

B3's answer is grounded in Google's read of the provider's own website. If B3 says "no," we move the row to Excluded with reason "B3 says not a camp." If "unsure," we keep it and flag for review. Cost is the same 1 Apify call we're already making.

---

## Trust surface — how a human confirms the price in 10 seconds

Six trust items, all additive, all scoped to the Market Validation feature only.

**A. Price receipt popover.** On every provider row, a small ⓘ icon next to the price. Clicking opens a popover showing: source URL, raw quote pulled, detected unit (per_week / per_session / per_month), the conversion math, and the pull date. A "Report wrong price" button adds the row to the QA queue.

**B. Confidence pill next to the price.** Three colors:
- 🟢 High — B3 gave a clear weekly number AND the fallback agreed within 20%
- 🟡 Medium — only one source found a price, or sources disagreed
- 🔴 Review — price > $1,200/wk, or B3 said "not a camp," or unit unclear

Tier badge (Premium / Mid / Value) is **hidden on 🔴 rows** until cleared.

**C. QA Queue extension.** `MVSQAQueue.tsx` already exists. We add a "Prices to Review" tab that lists every 🟡 and 🔴 row with one-click "Confirm" / "Fix" / "Exclude" buttons. Human review lane, finishable.

**D. Auto spot-check report.** After every city run, pick 10 random Premium rows, generate a one-page HTML report: name → stored price → source URL → raw quote. Auto-posted as a Notifications bell entry to the person who ran the pipeline.

**E. City header counts.** Small line on the city page: *"Austin: 287 priced • 34 need review • 12 unpriced • 8 excluded."* Nothing is hidden.

**F. Never delete, always exclude with reason.** Existing rule — reused, not changed.

---

## Isolation — how we keep this from touching other features

Explicit safe list. **Nothing outside this list is edited.**

**Touched (new or edited):**
- `supabase/functions/mvs-price-b3/index.ts` — NEW edge function (B3 call)
- `supabase/functions/mvs-extract-weeks/index.ts` — reorder calls, add unit-aware Gemini prompt
- `supabase/functions/mvs-run-pipeline/index.ts` — add mvs-price-b3 into the chain (single line addition, behind a feature flag)
- `src/lib/mvs/classifyExclusion.ts` — reused as-is, no edits
- `src/lib/mvs/unpricedReason.ts` — small addition for new "review" reason strings
- `src/pages/MVSQAQueue.tsx` — add "Prices to Review" tab (new tab only, existing tabs untouched)
- 2–3 new small components under `src/components/phase2-demo/` or a new `src/components/mvs-trust/` folder: `PriceReceipt.tsx`, `ConfidencePill.tsx`, `PriceCountsRow.tsx`
- 1 migration: add columns `price_confidence`, `price_source`, `price_source_url`, `price_source_quote`, `price_unit_raw`, `price_needs_review` to `mvs_providers`. Additive only, no drops, no renames.

**Explicitly NOT touched (safe list):**
- MVS composite scoring formula (`src/lib/mvs/computeMvs.ts`)
- Recomputed pillars (`src/lib/recomputedPillars.ts`) — Brett's "one calibrated number" rule stays intact
- Provider discovery (`mvs-discover-providers`)
- City Search pillars, weights, tiers, or thresholds
- Candidate Pipeline, Teacher Prospects, SmartLead, Email Outreach, Site Analysis, Observability, DB Health, Onboarding, City Scoring
- Any table other than `mvs_providers` (additive columns only)
- Any RLS policy or grant
- The Notifications bell (only INSERT into `notifications` — no schema change)
- `mvs-classify-tier` code (unchanged; it re-reads `mvs_providers` after we finish pricing)

**Feature flag.** New env var `MVS_B3_PRIMARY_ENABLED` (default `false` on first ship). Pipeline reads it and falls back to today's Steps 1–3 order if it's `false`. Lets us ship, test on Austin, and roll back with one env change if anything goes wrong.

**No breaking changes.** Every new DB column is nullable with a safe default. Rows priced under the old logic keep working — they just show a grey "legacy" pill until re-priced.

---

## Phases and turn estimates

**Phase 0 — Migration + reuse existing category filter** — *1 turn*
- Add nullable columns to `mvs_providers`.
- Wire `classifyExclusion.ts` into `mvs-run-pipeline` so obvious junk skips paid steps.
- Test: re-run Austin, confirm Home Depot / Goddard / Kido no longer get priced.

**Phase 1 — B3 edge function (Step 1)** — *2 turns*
- New `mvs-price-b3` function. Calls Apify Google AI Overview per provider.
- Parses answer with regex + tiny Gemini safety-net parser.
- Returns `{ price_min, price_max, unit, is_summer_camp, source_url, source_quote }`.
- Test: run on the 20 Austin audit rows, confirm same 9 correct weekly prices.

**Phase 2 — Reorder pipeline behind feature flag** — *1 turn*
- `mvs-run-pipeline` calls `mvs-price-b3` first when `MVS_B3_PRIMARY_ENABLED=true`.
- Old Steps 1–3 run only for rows B3 didn't answer.
- Test: end-to-end Austin, both flag states.

**Phase 3 — Unit-aware Gemini (Step 4 fallback)** — *2 turns*
- Rewrite prompt in `mvs-extract-weeks` to require `{ amount, unit, weeks_in_session? }`.
- Add normalizer: per_session ÷ weeks, per_month ÷ 4.33, per_summer ÷ 10.
- Reject answers with no unit.
- Test: re-price Spilled Milk, Steve & Kate's, campusATX.

**Phase 4 — Sanity ceiling + confidence pill** — *1 turn*
- Set `price_confidence` (`high` / `medium` / `review`) at end of pipeline.
- `ConfidencePill.tsx` next to the price on provider rows.
- Hide tier badge on `review` rows.

**Phase 5 — Price receipt popover** — *1 turn*
- `PriceReceipt.tsx` — small ⓘ icon → popover with source URL, raw quote, unit, math, date.

**Phase 6 — QA Queue "Prices to Review" tab + city header counts** — *1 turn*
- Add tab to `MVSQAQueue.tsx`.
- Add `PriceCountsRow.tsx` to the city page.
- Test: 🟡 and 🔴 rows show up, one-click clear works.

**Phase 7 — Auto spot-check report** — *1 turn*
- End-of-pipeline: pick 10 random Premium rows, render one-page HTML summary.
- Post to Notifications bell for the triggering user.

**Phase 8 — Rerun and QA** — *1 turn*
- Full Austin re-run.
- Manual spot-check top 20 Premium rows the same way as the audit.
- Report before/after accuracy count.

**Total: ~10 turns.**

---

## Risks and what to watch

- **Apify quota:** 1 call per provider ≈ 300 per city. Fine for one city, watch if we run many cities per day.
- **Google AI Overview coverage:** ~30% of small providers get no AIO — that's why Steps 2–4 stay as fallback.
- **Parse errors on AIO text:** manual audit had 2/14. Mitigated by Gemini safety-net parser.
- **Feature flag off = zero change:** if anything goes wrong, flip `MVS_B3_PRIMARY_ENABLED=false` and the app is back to today's behavior.

---

## What "done" looks like

- On a fresh Austin re-run, the top 20 Premium rows are actually Premium when spot-checked.
- Every priced row shows a confidence pill and a clickable source receipt.
- 🔴 rows show "Review" instead of a wrong Premium badge.
- City header shows priced / review / unpriced / excluded counts.
- No changes to composite scoring, tier thresholds, or any feature outside MVS.
- Feature flag lets us roll back with one env change.

---

## Approval needed before I start

Please confirm:
1. B3 as **primary** pricing step, old Steps 1–3 as **fallback**, behind a feature flag — approved?
2. Reuse existing `classifyExclusion.ts` at Step 0 + B3's `is_summer_camp` field — approved?
3. Six trust items (receipt, confidence pill, QA tab, spot-check report, city counts, exclude-with-reason) — approved?
4. Isolation safe list — anything on the "NOT touched" list you want me to also allow changes to, or add to the list?
5. Any of the 10 turns you want re-scoped or split further?

I will not touch code until you say go.
