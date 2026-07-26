# Unify Known Brands + Enforce Price Gates as Hard Override

## Why we are doing this

Right now the app has **two brand lists that disagree** and the AI classifier can hand out "Premium" without a price check. That is how Urban Roots East Austin Farm ($0/wk) ended up tagged Premium in Austin — the AI decided "farm, outdoor, recognized" was enough, and the safety rule that should have downgraded it only runs when a full reclassify sweep happens.

We will fix this so:

- There is **one brand list** in the database — the `mvs_operator_watchlist` table — that every part of the pipeline reads from.
- The **two-gate price rule** ($300 min AND $400 max per week) is a **hard override** — no matter what the AI says, if the price fails the gate, the row cannot be Premium.
- Any **new city** we run gets the same treatment automatically — no code changes needed.
- All **existing cities** get cleaned up in one sweep.

## What is affected

- **Edge function** `supabase/functions/mvs-classify-tier/index.ts` — replaces its hard-coded 10-name regex with a DB read, and adds the two-gate rule as a post-AI override.
- **Edge function** `supabase/functions/mvs-discover-providers/index.ts` — already reads from the DB (we fixed this earlier); confirm nothing regressed.
- **DB table** `mvs_operator_watchlist` — add one column so we can flag which brands are auto-Premium (some brands on the list are competitors but not premium-priced, e.g. YMCA).
- **DB data** — mark the right rows as premium.
- **Existing provider rows in `mvs_providers`** across all cities — one-time reclassify sweep to clean up leftovers like Urban Roots.

Nothing on the frontend changes. No user-visible UI moves. Scoring math stays the same.

## Plan in phases

### Phase 1 — Add a `is_premium_brand` flag to the watchlist (1 turn)

- Migration: add `is_premium_brand boolean not null default false` to `mvs_operator_watchlist`.
- Seed the flag: set `true` for the brands that are recognized national premium operators today (Galileo Learning, iD Tech, Steve & Kate's Camp, Snapology, Lavner Camps, Camp Invention, Stratford Schools Camp). Leave `false` for the rest (YMCA, KinderCare, Mathnasium, Sylvan, etc. — these are competitors for overlap scoring but not auto-Premium).
- Also review whether **British Soccer** and **Challenger Sports** (currently auto-Premium via the hard-coded regex but not on the watchlist) should be added as new rows. Recommend adding them as `direct` overlap + `is_premium_brand = true`.

**Risk:** Very low. New column, defaults to false, no existing behavior changes yet.

### Phase 2 — Rewrite classifier to use DB + enforce hard price gate (1 turn)

Edit `supabase/functions/mvs-classify-tier/index.ts`:

1. At function start, load the brand list once from `mvs_operator_watchlist where is_premium_brand = true`, including the `aliases` array. Build a case-insensitive matcher (name + aliases).
2. Delete the hard-coded `isNationalPremium` regex on line 256.
3. Replace it with `isNationalPremium = matchBrand(nameLc, brandList)`.
4. Move the two-gate check so it runs on **every priced row, including AI-tagged Premium ones**:
   - If `hasPrice` AND gates fail (`pMin < 300 OR pMax < 400`) → force to Mid (or Budget if `pMax < 200`), regardless of AI output or brand match.
   - Exception: `isNationalPremium` brand keeps Premium even if price is missing (this is the "no price + known brand" fallback).
5. If `!hasPrice` AND not a brand match → force Mid. Never Premium.
6. Keep the community/childcare downgrade branch as-is.

**Risk:** Medium. This changes classification behavior. But the behavior change is exactly what we want: honest tiers. Test on Austin first.

### Phase 3 — Verify on Austin, then sweep every city (1 turn)

1. Run reclassify on Austin only. Check:
   - Urban Roots → should drop to Mid.
   - German Free School ($0) → should drop to Mid.
   - Code Ninjas ($60/wk) → should drop to Mid (fails gate even though brand match, because it HAS a price and the price fails).
   - Real premium providers (iD Tech, Steve & Kate's, Snapology at $500+) → stay Premium.
2. Spot-check the Austin Pricing Acceptance score and premium count in the UI.
3. If clean, run reclassify on all other shortlist cities in sequence. Existing `mvs-classify-tier` already supports the `reclassify: true` flag.
4. New cities added later automatically inherit the fix — they run through the same classifier.

**Risk:** Low, because we validated on Austin first. Reclassify is idempotent.

### Phase 4 — Update the spec doc (1 turn)

Update `docs/feature-1a-mvs-v1-spec.md` to v1.9:
- Document `mvs_operator_watchlist.is_premium_brand` as the single source of truth for premium brand recognition.
- Document the hard two-gate override rule and its precedence over AI classification.
- Note that adding a new premium brand is now a one-row DB insert, not a code change.

## Turn budget

**4 turns total.** Each phase is one turn. I will stop after each phase and summarize what changed and what to test.

## What NOT to touch

- The `computeMvs.ts` scoring math (already correct after last change).
- The frontend UI (no user-visible changes needed).
- The `mvs-discover-providers` national brand loader (already unified to DB in an earlier session).
- The overlap/watchlist categories used by Scaled Operator scoring — those keep working the same way.

## Risks and mitigations

- **Risk:** Reclassify sweep changes premium counts across every city at once, which will move scores.
  **Mitigation:** Verify Austin first before touching other cities. Report the before/after premium counts for each city so you can see the delta.

- **Risk:** A brand we forgot to mark `is_premium_brand = true` gets demoted.
  **Mitigation:** Phase 1 will list the exact 7–10 rows getting flagged for your review before running Phase 2.

- **Risk:** Some AI-tagged Premium rows have a real premium price that the two-gate rule misses because of unit confusion (per_session vs per_week).
  **Mitigation:** Out of scope for this plan. That is a separate B3 unit-normalization fix we already discussed as "Option C" in the earlier thread. Flag it if we want to sequence that next.

## What I need from you

Approve the plan (or edit it), then I ship Phase 1 only and stop for your review.
