# Plan: Phase B2 + IDEA Lab price-swap fix

Two things bundled together because they both live in the same catch-up loop inside `mvs-discover-providers` and both touch how a price gets attached to a provider row. Small, safe, one shot.

---

## Part 1 — Phase B2: Directory-First Catch-Up Queries

### What we're changing and why
Today the "missing prices" catch-up loop searches Google in a generic order: mostly natural-language queries like *"Camp X tuition price per week 2026"*. That works for indie camps but keeps missing franchise/JS-walled brands (Little Gym, Goldfish, KidStrong, Snapology, Steve & Kate's outside big cities). We already know these brands almost always publish real dollar prices on a small set of marketplaces (ActivityHero, Sawyer, CampSpot, Peerspace, Winnetka, Yelp, Facebook Events).

B2 flips the order: **hit those known directories FIRST for every unpriced camp, then fall back to the generic Google query only if directories come up empty.** Same crawler, same guards, same amber "needs review" logic — just a smarter query order and a `platform` tag on the result so we know where it came from.

### Which parts of the app get touched
- `supabase/functions/mvs-discover-providers/index.ts` — catch-up loop query builder + ordering only. No change to discovery Phase 1, classification, scoring, or the pipeline runner.
- `src/pages/ProviderEvidence.tsx` — Evidence drawer already shows `platform`; will now more often show `ActivityHero` / `Sawyer` / etc. instead of `Google Search`. No new UI, just better data flowing in.
- No DB schema change. No RLS change. No scoring math change.

### How it fits without breaking anything
- Catch-up is opt-in per city (only runs on the "Missing Prices" button or as the tail of Force Fresh).
- Directory queries are *additive*: if none return a hit, we fall through to the exact same generic query we run today, so worst case the loop behaves identically to now.
- No overwrites: `price_needs_review=false` rows are still skipped, same as B1.
- No cost blow-up: same Firecrawl `/search` endpoint, same per-camp cap.

### Phases and Lovable turns
- **B2.1 (1 turn):** Add `buildDirectoryQueries(name, city)` helper in the edge function. Prepend its 6–8 queries (site:activityhero.com, site:sawyer.com, site:campspot.com, site:peerspace.com, site:yelp.com/biz, site:facebook.com/events, plus 1–2 city-specific summer-camp directory queries) to the existing generic queries. Tag every extracted price with the source `platform` so the drawer shows it. Ship + I'll manually run Austin "Missing Prices" to compare before/after.
- **B2.2 (only if B2.1 shows weak lift, ~50% chance we skip):** Add a second pass of natural-language + directory hybrid ("Camp X ActivityHero price"). Only if numbers underwhelm.

Estimate: **1 turn, possibly 2.**

### Risks / what NOT to touch
- Do not change discovery Phase 1 (that's what feeds the total 295 count for Boston). B2 only affects the catch-up loop.
- Do not change the price sanity guards (`PRICE_RULES`, regex). Bad prices from directories must still get dropped.
- Do not touch composite MVS scoring, weights, or freshness.
- Risk: a directory query occasionally returns a stale/wrong price. Mitigated because guards still run and B1's amber flag still applies to derived prices — direct-scrape prices from ActivityHero/Sawyer count as "trusted source" and stay green, same as today.

### What to test after B2.1 ships
- Run "Missing Prices" on Austin. Baseline is your current count after today's run (I'll snapshot the number before it starts).
- Compare: priced % before → after, and how many new rows show `platform: ActivityHero / Sawyer` in the Evidence drawer.
- Spot-check 3 franchise rows (Little Gym Austin, Goldfish Austin, KidStrong Austin if present) — did any of them fill?

---

## Part 2 — IDEA Lab Kids price-swap bug fix

### What's broken
In Austin, "IDEA Lab Kids" has a duplicate brand row where `price_min = $415` and `price_max = $45` got swapped somewhere in the extraction path. Because it's a duplicate brand row, it's also blocking B1's brand propagation from filling the other IDEA Lab locations (B1 requires ≥2 sibling agreement within ±15% — the swapped row poisons the median).

### Root cause (from earlier audit)
Two paths converge:
1. **Extraction bug:** when a source page lists a range like "$45–$415 for the week", our parser occasionally assigns min/max backwards if the dollar signs are on different lines or the em-dash is a weird unicode char. Not caught by the sanity guard because both numbers are individually plausible camp prices.
2. **Duplicate-row bug:** we created a second row for the same brand+city instead of updating the existing one, so now there are two IDEA Lab Kids rows for Austin.

### The fix — 3 small changes
1. **Extraction guard (edge function):** in `mvs-discover-providers` add a post-parse sanity check: `if (price_min > price_max) swap them`. One line, catches this class of bug forever.
2. **De-dupe SQL (one-shot):** merge the duplicate Austin IDEA Lab row — keep the row with the more-cited source, delete the swapped-price row, then re-run B1 propagation for Austin so sibling locations can fill.
3. **Unique guard (DB):** add a partial unique index on `(city, lower(name))` where `name IS NOT NULL` so this can't happen again. If a future run tries to insert a dup, upsert wins instead.

### Which parts get touched
- `supabase/functions/mvs-discover-providers/index.ts` — one-line min/max swap guard.
- New migration — one-shot cleanup UPDATE/DELETE for the Austin IDEA Lab row + partial unique index on `mvs_providers(city, lower(name))`.
- No UI change. Evidence drawer will just show the corrected price after the next Austin run.

### Phases
- **Fix.1 (1 turn):** Ship the swap guard + migration + de-dupe. I'll verify the Austin IDEA Lab row shows the right min/max and B1 propagation now fills the sibling locations.

Estimate: **1 turn.** Bundled in the same turn as B2.1 if it fits cleanly, otherwise the very next turn.

### Risks
- The unique index could theoretically block a legitimate second listing (e.g. two truly different providers with the same name in one city — rare but possible). Mitigation: index is on `lower(name)` only, so trailing modifiers like "IDEA Lab Kids (North Austin)" vs "IDEA Lab Kids (South Austin)" stay distinct. If we hit a false conflict, easy to drop the index — no data loss.
- One-shot SQL cleanup is scoped to Austin only for now. If we discover the same swap in other cities later, we can run the same cleanup per-city.

---

## Combined ship order (if you approve)
1. **Turn 1:** B2.1 directory-first queries + IDEA Lab swap guard + Austin one-shot cleanup migration + unique index. Ship together.
2. **You run:** "Missing Prices" on Austin. Compare before/after. Confirm IDEA Lab row is corrected and siblings now fill via B1.
3. **Turn 2 (only if needed):** B2.2 hybrid queries.
4. **Then:** move to B4 (Manual Verify UI), then B3 (Apify AI Overview scraper — using your idea, not the original Firecrawl-SERP idea).

Waiting for your approval before I touch any code.
