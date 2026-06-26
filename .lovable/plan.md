
## Goal

When the user clicks a camp/provider name in the **Where the data comes from** (Sources) section of a Market Validation card — or in the new **City Competitors** page — show the saved screenshot of the listing page it was discovered on, with the source URL and discovery date. Also correct the Methodology and Spec docs so they no longer overstate what we save.

## What is true today (so we plan against reality, not the doc)

- `mvs_providers.screenshot_url` is set on ~97% of rows (2,642 / 2,723).
- It is the **listing-page** screenshot (e.g. Sawyer Boston search results), shared across every provider discovered on that page. 2,642 rows → only 93 distinct screenshot files.
- Files live in the **private** `mvs-screenshots` Supabase Storage bucket.
- We do NOT save raw HTML, markdown, or per-provider website screenshots.

## Phases

### Phase 1 — Backend: signed-URL helper (1 turn)

- Add a small helper `getProviderScreenshotUrl(providerId)` in `src/lib/mvs/` that:
  - Looks up `screenshot_url` on `mvs_providers`.
  - Calls `supabase.storage.from('mvs-screenshots').createSignedUrl(path, 300)` (5-min link).
  - Returns `{ signedUrl, capturedAt, sourceUrl, sourceName }`.
- No new tables, no edge function (RLS on `mvs_providers` already gates read; bucket stays private; signed URL is the access path).
- Smoke test: call from console for a known provider, confirm image loads.

### Phase 2 — UI: "View source proof" on provider rows (1–2 turns)

Two surfaces, same component:

1. **`LiveCityDeepDive.tsx`** — in each pillar's **Where the data comes from (N)** collapsible, add a small "📷 View source" link next to each provider name.
2. **`CityCompetitors.tsx`** — add a "View source" icon button in a new column (or in the existing source-listing cell).

Clicking opens a small `Dialog` (using existing `@/components/ui/dialog`) showing:
- The screenshot (signed URL, lazy-loaded).
- Caption: "Captured from {platform} on {capturedAt}".
- A link "Open original listing ↗" to `listing_url` / `source_listing_url`.
- A short honest note: *"This is the listing page where we found this provider. It is not a screenshot of the provider's own website."*
- Empty-state if `screenshot_url` is null: "No screenshot saved for this provider."

### Phase 3 — Doc correction (1 turn, copy only)

Fix the overstatement in:
- `src/pages/MVSMethodology.tsx`
- `src/pages/MVSSpec.tsx` + `docs/feature-1a-mvs-v1-spec.md`
- `src/data/userGuideMarkdown.ts` (Market Validation section)

Replace any line that implies "every provider gets a screenshot and a saved copy of the web page" with the accurate version:

> "For most providers we save a screenshot of the **listing page** they were discovered on (Sawyer, Yelp, Google, etc.), stored privately for audit. We do not save the provider's own website or the raw HTML of the listing page."

## What is NOT in this plan (call out, don't silently expand)

- Starting to capture per-provider website screenshots. (Possible later; would re-spend Firecrawl calls per provider and balloon storage. Needs its own approval.)
- Saving raw HTML/markdown of listing pages.
- Backfilling the 81 provider rows missing a screenshot.
- Any change to scoring math, freshness rules, or the pipeline.

## Risk / what not to touch

- Bucket stays **private**. Only short-lived signed URLs are exposed to the browser.
- No schema change, no migration.
- No edge function changes.
- `mvs_providers` RLS unchanged — only authenticated staff can read, so only staff can mint signed URLs.

## Turn estimate

- Phase 1: 1 turn
- Phase 2: 1–2 turns
- Phase 3: 1 turn
- **Total: 3–4 turns**

## Testing checklist after build

1. Open a validated city (e.g. Boston) → expand "Where the data comes from" on Pricing card → click 📷 on a provider → screenshot dialog opens with image, capture date, source link.
2. Open City Competitors page → click "View source" on a row → same dialog works.
3. Provider with no `screenshot_url` → dialog shows the empty-state message, no broken image.
4. Signed URL expires after 5 min (refresh dialog → still works because it re-signs on open).
5. Methodology, Spec, and User Guide pages no longer claim per-provider website screenshots.

Approve and I will start with Phase 1.
