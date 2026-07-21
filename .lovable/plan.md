
# Plan — Option C: Tighten the Premium Tier Classifier

## The bug in plain words

Right now a provider is called **Premium** if EITHER its min price OR its max price is $400 or more. So a camp that lists **$100–$500** (a $100 drop-in day rate with a $500 full-week option) becomes Premium, and its $100 gets counted as the "premium weekly price". That is why Austin's Pricing Acceptance score fell to 6.8: the median premium price came out at $175 because dozens of Premium rows are $100-min drop-in listings.

The two-gate rule ("min ≥ $300 AND max ≥ $400") was discussed earlier but it was never actually put into the classifier. The classifier still uses the OR rule.

## What we will change

**One file only:** `supabase/functions/mvs-classify-tier/index.ts`

Change the price-based tier decision from:

```
if (pMax >= 400 OR pMin >= 400) → Premium
```

to a two-gate rule:

```
if (pMin >= 300 AND pMax >= 400) → Premium
else if (pMin < 200 AND pMax < 200) → Budget
else → Mid
```

Special cases stay the same:
- Community/childcare-like names → Community (unchanged)
- No price + known national premium brand → Premium (unchanged)
- No price + unknown brand → Mid (unchanged, Option A rule)

## Pages/features affected

1. **Premium provider count** everywhere (Market Validation card, Deep Dive "170 premium providers" chip, exports).
2. **Pricing Acceptance score** — should climb because the low-$100 min outliers stop dragging the median down.
3. **Market Depth score** — recalibrated because there will be fewer premium camps in Austin.
4. **MBI (Market Balance Index)** — the ratio uses `premiumProviderCount` as the denominator, so it will rise (fewer premium providers).
5. **Enrichment Diversity** — reads from the premium set too.

Nothing in the client UI code needs to change. All downstream scores read `tier = 'premium'` and will simply recompute.

## Rollout — 3 small phases

**Phase 1 — Ship the classifier fix (1 turn)**
Change the OR to AND in `mvs-classify-tier/index.ts`. Deploy.

**Phase 2 — Reclassify existing Austin rows (1 turn)**
Call the classifier with `reclassify=true` for Austin (and any other city with data). No new scraping needed — this only re-reads existing `mvs_providers` rows and rewrites the `tier` column.

**Phase 3 — Verify (no code, just checking)**
Read Austin's new premium-provider list, confirm the $100-min drop-in rows are now Mid, and check that Pricing Acceptance, Market Depth, MBI, and Enrichment Diversity all move in the expected direction.

## Risks

- **Premium count will drop.** For Austin, likely from ~170 to somewhere in the 30–60 range. That is the whole point of the fix, but it will look like a big change on the dashboard. Nothing is being deleted — the providers just move from Premium to Mid.
- **Other cities also recompute.** Any city we've already run will get restated the next time it is reclassified. If you want to hold off on non-Austin cities until we validate Austin, we can add a city filter to Phase 2. Recommend running all cities so scores stay consistent, but your call.
- **No effect on discovery.** This does not remove providers. It only changes the tier label.

## Not touched

- Discovery queries, Apify/Yelp/Sawyer feeds, and the b3 price step — all unchanged.
- Community/childcare-like rule and the national-premium-brand override — unchanged.
- Normalization bands in `computeMvs.ts` — unchanged (we're fixing the input data, not the formula).

## Estimated turns

- Phase 1: 1 turn
- Phase 2: 1 turn
- Phase 3: 0 turns (just reading numbers together)

Approve and I ship Phase 1.
