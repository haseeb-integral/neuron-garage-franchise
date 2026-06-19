## Goal

Every number a user sees for a provider (`$min/wk`, `$max/wk`, `Category`, `Weeks`) must trace back to an exact source URL the user can open and visually confirm. The provider name must link to the provider's real website, not a Google search and not a blank marketplace SPA. Then run the Tier A rollout.

## Part 1 — Fix the data model so links are traceable

### 1.1 Schema (one migration)

Add to `mvs_providers`:
- `website_url text` — the provider's own homepage (e.g. `https://macbythesea.com`). This is what the UI links from the provider name.
- `source_listing_url text` — the marketplace/discovery page where we first found them (Sawyer activity-set, ActivityHero detail, Yelp page, Google Maps place URL). Kept for traceability.

Add to `mvs_weeks`:
- `source_url text` — the exact page the week-extractor scraped to produce that week's status/price/evidence. One per week row.

Keep the existing `mvs_providers.url` column for backwards compat; mark it as deprecated in a comment and plan to drop later.

### 1.2 Repair the damage from the earlier backfill

The Sawyer/ActivityHero `activity-set` URLs were overwritten with Google search URLs. We can't recover the originals. Two-step repair:

- **Backfill `source_listing_url` from what's salvageable.** For rows where current `url` is a Google search URL (the 133 we rewrote), set `source_listing_url = null` (lost) and rely on re-discovery in the next pipeline run to re-populate it. For Google Maps and Yelp rows, copy current `url` into `source_listing_url`.
- **Null out the bad `mvs_providers.url`** for the 133 Google-search rows so the week-extractor stops scraping a search results page next run. Those providers will be re-scraped from their `website_url` (see 1.3) instead.

### 1.3 Enrich `website_url` for every provider

One-time enrichment edge function `mvs-enrich-websites` (idempotent; safe to re-run):

For each provider missing `website_url`:
1. **First try the cheap path** — if `source_listing_url` is a Google Maps Places URL, Google Maps already returns `website` in its payload; re-fetch via Places API (New) `places:searchText` with `"{name} {city}"`, pick the first result whose `displayName` fuzzy-matches the provider name, store `websiteUri` as `website_url`.
2. **Fallback** — Firecrawl `search` with `"{name} {city} kids classes"`, limit 5, scrape none. Pick the first result URL whose hostname is NOT `hisawyer.com`, `activityhero.com`, `yelp.com`, `google.com`, `facebook.com`, `instagram.com`, `mapquest.com`, `yellowpages.com`. Store as `website_url`.
3. If both fail, leave `website_url` null.

Budget: ~800 providers × (1 Places call or 1 Firecrawl search) ≈ Places-heavy, low cost.

### 1.4 Wire `source_url` into the week extractor

In `mvs-extract-weeks/index.ts`:
- Prefer scraping `provider.website_url` over `provider.url`; fall back to `source_listing_url`.
- Record the URL actually scraped into every inserted `mvs_weeks.source_url`.
- Re-run extract-weeks for all Tier A cities so existing weeks get a `source_url`.

### 1.5 UI changes (LiveCityDeepDive + ShortlistTable provider rows)

- Provider name: `<a href={website_url ?? source_listing_url ?? googleSearchFallback}>`.
- Add a small "source ↗" link under each `$min/$max/Category/Weeks` cell that opens the latest `mvs_weeks.source_url` for that provider. If none, hide it.
- No other UI changes.

## Part 2 — Tier A rollout (after Part 1 ships clean data)

Execute in order, one city per step, with a verification pause:

1. **NYC** — run `mvs-run-pipeline` → verify scores → flip Live badge.
2. **Houston** — same.
3. **Chicago** — same.
4. **San Antonio** — same.
5. **Philadelphia** — same.
6. **LA** — same.
7. **Boston** — re-run with clean Part-1 data → **calibration gate check**: Boston must land in the top quartile of the 8-city set (Austin + 7 Tier A). If it doesn't, stop, surface the result to you, and do not flip Boston to Live without your sign-off on weight changes.

I will NOT batch this — one city per turn so you can spot-check each before the next runs. Pipeline runs cost Firecrawl + Gemini credits, so I'll show the firecrawl_calls count after each.

## Out of scope (this plan)

- PDF Market Brief (Phase 6, item #1 on the master list) — separate plan.
- QA Queue page (item #2), ACS pull (item #3), consolidation of `mvs-extract-weeks*` (item #5), `/mvs-preview` (item #6) — separate plans.

## Files touched

- New migration: `mvs_providers.website_url`, `mvs_providers.source_listing_url`, `mvs_weeks.source_url`.
- New edge function: `supabase/functions/mvs-enrich-websites/index.ts`.
- Edit: `supabase/functions/mvs-extract-weeks/index.ts` (scrape preference + record source_url).
- Edit: `supabase/functions/mvs-discover-providers/index.ts` (write both `source_listing_url` and `website_url` from Google Maps payload going forward).
- Edit: `src/components/phase2-demo/LiveCityDeepDive.tsx` (link target + per-week "source ↗").
- Edit: `src/lib/mvs/useLiveMvs.ts` and `src/lib/mvs/computeMvs.ts` (select new columns, expose to UI).

## Questions before I build

1. **Confirm Google Maps connector is usable** for `places:searchText` enrichment — it's listed in your connectors but I want to confirm you're OK with us calling it ~800 times for the one-time backfill. (Cheaper than Firecrawl search.)
2. **Tier A rollout cadence** — one city per turn with you spot-checking, or run all 6 + Boston gate in one go and report results?
