# Plan — Guard Summary + B4 Verify UI + B2.2 Hybrid Queries

Three small phases, shipped in order. All approved before I touch code.

---

## Phase G — Show what the guard dropped (Provider Evidence screen)

**Why:** Right now the "Dropped by guard" filter exists but the user cannot see *what* was dropped or *why*. It feels invisible.

**What I will add on `/provider-evidence?city=...`:**

1. **A small "Guard summary" strip** at the top of the page, right under the header row (next to "228 active camps · 38 excluded"):
   - `Guard dropped: 14 prices across 9 providers` (blue pill)
   - Click → opens a small popover listing each dropped item: provider name, the dollar value that was thrown out, the field it came from (`price_min` / `price_max` / `per_day` / `per_hour` etc.), and a one-line reason ("looked like per-day", "below $50 floor", "above $5000 ceiling", "min > max swap", "unit unclear").

2. **Per-row hint** — when a row's `guard_drop` array is non-empty, show a tiny amber "guard: 2 dropped" chip in the Price column so the user can spot which providers were touched without opening the drawer.

3. **In the existing drawer** — a new "Prices dropped by guard" section listing the same items with reason strings.

4. **CSV export** — add two columns: `guard_dropped_count`, `guard_dropped_details` (semicolon-joined).

**Files touched (frontend only):**
- `src/pages/ProviderEvidence.tsx` — summary strip, per-row chip, CSV columns
- `src/components/phase2-demo/EvidenceDrawer.tsx` (or wherever the drawer lives) — new section
- `src/lib/mvs/useProviderEvidence.ts` — expose an aggregated `guardSummary` (already has `guard_drop` per row, just needs a rollup)

**Not touched:** database, edge functions, scoring math.

**Turns:** 1
**Risk:** low. Purely additive UI over data we already collect.
**Test:** open Austin evidence page → confirm summary pill shows a number → click → see the dropped list → confirm per-row chip appears on ≥1 row → export CSV → check new columns.

---

## Phase B4 — Manual Verify UI for amber "needs review" prices

**Why:** B1 (brand propagation) and later B3 (AI Overview) both write `price_needs_review = true`. Right now those amber prices sit forever with no way for a human to confirm or reject. B4 unlocks them.

**What I will add:**

1. **New DB columns on `mvs_providers`** (tiny migration):
   - `verification_status` text — one of `unverified` (default), `verified`, `rejected`
   - `verified_by` uuid nullable — references `auth.users`
   - `verified_at` timestamptz nullable
   - `verification_note` text nullable

2. **Two RPC-style edge function endpoints** (or one function with an `action` field) inside a new `mvs-verify-price` edge function:
   - `verify` → sets `price_needs_review = false`, `verification_status = 'verified'`, stamps user+time.
   - `reject` → nulls `price_min` / `price_max`, sets `verification_status = 'rejected'`, stamps user+time. Rejected rows are skipped by future catch-up runs (I will add a `WHERE verification_status IS DISTINCT FROM 'rejected'` guard in `mvs-discover-providers`).
   - `edit` → user types a corrected `price_min` / `price_max`, marks verified.

3. **UI in the Evidence drawer** — three buttons on any row where `price_needs_review = true`:
   - ✅ **Verify** (green) — one click, price flips from amber to normal.
   - ✏️ **Edit & Verify** (blue) — inline min/max inputs, save marks verified.
   - ❌ **Reject** (red) — nulls the price, row moves to "no price" bucket.

4. **Also in the main Evidence table** — a new "Verification" column showing `Unverified` / `Verified ✓` / `Rejected` badges, plus a new filter: `All / Needs review only / Verified only / Rejected`.

5. **Scoring impact:** verified prices already count (they were already stored). Rejected prices now correctly do **not** count. No change to the score formula.

**Files touched:**
- New migration for the 4 columns
- New edge function `supabase/functions/mvs-verify-price/index.ts`
- `supabase/functions/mvs-discover-providers/index.ts` — skip `verification_status = 'rejected'` in catch-up
- `src/pages/ProviderEvidence.tsx` — new column + filter
- Evidence drawer component — 3 buttons + edit inputs
- `src/lib/mvs/useProviderEvidence.ts` — surface new columns

**Turns:** 2 (1 = migration + edge function; 2 = UI wiring after types regenerate)
**Risk:** low-medium. Only humans trigger writes; RLS restricts to authenticated users. Rejected-skip in crawler is one added `WHERE` clause.
**Test:** open Austin → find an amber "Possible brand price" row → click Verify → amber chip disappears → refresh → still verified. Repeat for Reject → price gone, row shows Rejected badge. Run Missing Prices → rejected row is not re-tried.

---

## Phase B2.2 — Hybrid directory + brand queries (optional lift)

**Why:** B2.1 (directory-first) already shipped. B2.2 adds one more query variant for the 6 stubborn Austin unpriced camps and future cities.

**What changes in `mvs-discover-providers` catch-up loop only:**

1. **Add a 4th parallel query** — a **hybrid brand + city + "starting at" phrasing** query:
   `"{brand name}" summer camp "starting at" OR "from $" {city} {state}`
   Reason: franchises often bury a "starting at $X" line in blog posts, press releases, or local news. Generic queries miss these; the phrase-anchor query catches them.

2. **Add a 5th parallel query** — a **review-site query**:
   `{brand} {city} camp cost site:reddit.com OR site:mommypoppins.com OR site:redtri.com OR site:citymomsblog.com`
   Reason: parent blogs and Reddit threads often quote real prices when the provider's own site hides them.

3. **Extraction prompt tweak:** when the source is a review/blog, tag `platform = 'ParentBlog'` and mark `price_needs_review = true` (so B4 humans confirm before it counts).

4. **No UI changes.** No DB changes beyond what B4 already added.

**Files touched:**
- `supabase/functions/mvs-discover-providers/index.ts` only

**Turns:** 1
**Risk:** low. Two extra Firecrawl search calls per unpriced camp (cost ~$0.002 per camp per run). Amber flag ensures no bad price scores until a human confirms.
**Test:** run "Missing Prices Catch-up" on Austin's remaining 6 unpriced → check debug for `starting_at_hits` and `blog_hits` counters → open Evidence → look for new amber rows with `platform: ParentBlog` badge → Verify or Reject via B4.

---

## Suggested build order & turn count

| Order | Phase | Turns |
|---|---|---|
| 1 | G — Guard summary strip + chip + drawer + CSV | 1 |
| 2 | B4 — migration + edge function + UI | 2 |
| 3 | B2.2 — hybrid queries (only after B4 so amber rows are usable) | 1 |

**Total: 4 turns.**

---

## What is remaining AFTER these 3 phases

Only **B3 — Google AI Overview / Apify AI Mode scraper** is left from Phase B.

- Adds an Apify actor call (`apify/google-search-scraper` with AI Overview enabled) as a 6th parallel query in the catch-up loop.
- Reads the AI-summary text, extracts the dollar figure, visits one cited page to confirm the number literally appears, saves as `platform = 'AIOverview'` with `price_needs_review = true`.
- Needs a new secret (`APIFY_TOKEN`) and a health check because Google layout can change.
- Estimated 2 turns.
- Best done last because it depends on B4's Verify UI to be useful, and costs a bit more (~$3–$6 per shortlist pass).

**After B3, Phase B is fully done.** Then the open items in the backlog are:
- **Austin data cleanup sweep** — any remaining duplicate brand rows besides IDEA Lab (spot-check only)
- **Score-formula sensitivity check** — do the newly-priced 200+ camps push any city's Pricing Acceptance sub-score into a different band? (analytics task, no build)
- Any Notifications-system Phase 1 hookups still pending (candidate_assigned, city_scoring_finished triggers)

---

## What I will NOT touch

- Scoring math / `computeMvs.ts`
- `mvs_pipeline_runs` structure
- The catch-up loop's outer polling in `MarketValidationRollout.tsx`
- Any Force Fresh / Run Pipeline button behavior
- Design tokens / colors (keep existing navy/blue/amber palette)

Approve and I'll ship **Phase G first** in one turn.
