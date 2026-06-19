I agree this is not good enough. The QA page should not make you manually rediscover obvious camp pages, and it should not show homepage evidence unless the extractor truly failed to find a better page.

## Honest purpose of the QA page
The QA page is a human-review safety net, not the primary product result page. It should show only cases where automation is uncertain:
- Provider produced zero usable weeks.
- Week status/date confidence is below threshold.
- Evidence page looks wrong or weak.

Its job is to let a reviewer quickly see: city, provider, exact evidence URL, screenshot, why it was flagged, and fix/resolve it. It is not supposed to hide bad extraction behind a vague homepage link.

## What is wrong now
1. **`homepage?` tag**
   - This tag means the stored `source_url` does not look like a camp/class/register/enroll page.
   - In your screenshot, it is correct to warn because `https://phillyartcenter.com/` is only the homepage, while the exact page is `https://phillyartcenter.com/camps/summer-camps/`.
   - The tag itself is not the bug; the extractor choosing the homepage is the bug.

2. **Exact URL discovery is too weak**
   - Current code uses Firecrawl map with `search: "summer camp"`, then hardcoded URL keyword scoring.
   - That can miss obvious pages, and it falls back to the homepage.
   - It also currently prefers the provider website homepage over the existing Sawyer URL even when Sawyer has better registration data.

3. **City dropdown count is not hardcoded, but it is misleading**
   - `18` is coming from the current open QA rows, not from all MVS providers/cities.
   - The label says “All cities (18)” but that means “18 QA items”, not “18 cities”. That is confusing and should be changed.
   - The city list is built only from rows currently in `mvs_qa_queue`, so cities with no QA rows will not appear. If you expect it to mirror the MVS table, that requires querying the provider/city source too.

4. **Duplicate and stale QA rows likely remain**
   - The data shows repeated Philly Art Center week rows for the same week/source.
   - Re-runs insert new QA rows without cleaning existing unresolved week-level QA rows, so the count inflates.

## Implementation plan

### 1. Fix QA page wording and counts
- Rename the filter from `All cities (18)` to `All open QA items (18)` or show separate counts:
  - `18 open QA items`
  - `1 city`
  - `4 providers`
- Add a small city context line when filtered: `Philadelphia, PA · 18 open QA items · 4 providers`.
- Keep the back button at the top and bottom.
- Replace `homepage?` with clearer copy: `Weak evidence URL` and tooltip/title: `This evidence URL is the provider homepage, not a camp or registration page.`

### 2. Make the city dropdown come from actual MVS data
- Query distinct cities from `mvs_providers` (or the same city source used by the MVS table), not only `mvs_qa_queue`.
- Show every MVS city in the dropdown.
- For each city, show QA open item count separately, e.g. `Philadelphia, PA · 18 QA`.
- If a city has zero QA issues, it can still appear as `Austin, TX · 0 QA`.

### 3. Clean stale duplicate QA rows on re-run
- Before inserting new week-level QA rows for a provider, delete unresolved week QA rows for that provider’s existing week ids.
- Keep resolved rows as history.
- This prevents Philly Art Center’s duplicate 2026-06-29 / 2026-07-06 rows from inflating counts.

### 4. Replace brittle exact-page discovery
- Add a dedicated discovery step before scraping:
  1. Use Firecrawl map without relying on a single hardcoded query, collect links from the provider domain.
  2. Use Firecrawl search with provider name + city + camp/classes terms to discover pages Google/search can see.
  3. Include existing provider `url` (Sawyer schedule URL) as a candidate, not just fallback.
  4. Scrape several candidate pages lightly, not just one.
  5. Ask the AI to rank candidate pages by evidence quality: exact camp/weekly registration page > general camp page > homepage.
- Keep keywords only as weak hints, not the deciding system.
- For Philly Art Center, this should select `https://phillyartcenter.com/camps/summer-camps/` over `https://phillyartcenter.com/`.

### 5. Store better evidence
- Store the selected exact page in `mvs_weeks.source_url`.
- Use the screenshot from that exact selected page.
- If the screenshot is a full-page/homepage-like shot, mark it as weak evidence rather than pretending it is acceptable.

### 6. Verify with Philadelphia
- Re-run extraction for `Philadelphia, PA` after deployment.
- Confirm:
  - Philly Art Center evidence URL is `/camps/summer-camps/` if the page remains discoverable.
  - QA rows are not duplicated for the same provider/week.
  - Dropdown counts match real open QA rows and city/provider totals.
  - Provider rows with zero weeks still appear as provider issues.

## Technical notes
- Files to change:
  - `src/pages/MVSQAQueue.tsx`
  - `supabase/functions/mvs-extract-weeks/index.ts`
- May also adjust `supabase/functions/mvs-enrich-websites/index.ts` if it is still stripping exact discovered paths down to homepage when we actually need exact camp URLs.
- No new database table is required unless we decide to persist a separate `best_evidence_url` on providers later.