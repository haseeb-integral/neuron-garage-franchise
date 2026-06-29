
# Provider Evidence Review — Plan (read-only, no code yet)

## 1) Best UI placement

- Add a button **"Review Provider Evidence"** in `LiveCityDeepDive.tsx`, right next to the existing "Premium providers — live" / Competitors header (same row as the camera/screenshot button).
- Clicking it routes to a **new full page**: `/market-validation/evidence/:cityKey` (not a drawer). The reason: you asked for a spreadsheet-style grid — drawers are too narrow. We reuse the same routing pattern as `/market-validation/competitors/:cityKey` (`CityCompetitors.tsx`).
- Inside that page, a **right-side drawer** opens for a single row's full detail (using the existing `Drawer` component from `src/components/ui/drawer.tsx`).
- Read-only in this phase. No write actions wired up. Verify / Reject / Edit buttons are rendered **disabled** with a "Coming in next phase" tooltip so the layout is final.

## 2) Existing tables / fields we can reuse

Already in the database — no new columns needed for v1:

- **`mvs_providers`** — `name`, `city`, `url`, `source_listing_url`, `website_url`, `price_min`, `price_max`, `category_raw`, `tier`, `screenshot_url`, `confidence`, `source_run_id`, `sources` (jsonb), `created_at`.
- **`mvs_pipeline_runs.source_counts.discover.google_search_queries[]`** — the per-query debug array we just started persisting. Each entry has: query string, raw result count, top URLs, providers found, prices kept, prices dropped by the regex guard, and dropped-reason text.

Mapping to the columns you asked for:

| Column you asked for | Source |
|---|---|
| Provider name | `mvs_providers.name` |
| City | `mvs_providers.city` |
| Source query | `google_search_queries[].query` (joined by provider name match) |
| Source type | derive from query bucket: `google_search`, `sawyer`, `firecrawl_listing` (already in `sources` jsonb) |
| Source URL | `source_listing_url` or first entry in `sources` |
| price_min / price_max | `mvs_providers.price_min/max` |
| Kept or dropped by guard | from `google_search_queries[].prices_dropped[]` (matched by name) |
| Evidence snippet | `google_search_queries[].providers[].snippet` if present, else top URL title |
| Extraction phase | derive: Phase 2 if from listing query, Phase 3/4 = "—" until those ship |
| Verification status | **new** — see §3 |
| Human notes | **new** — see §3 |
| Last checked date | `mvs_providers.updated_at` for now |

## 3) New fields needed later (NOT in this phase — flagged only)

For when the Verify / Reject / Edit buttons get wired up:

- New table `mvs_provider_verifications` (one row per provider review action):
  - `provider_id` (fk), `reviewer_id`, `status` enum (`missing | found_by_ai | needs_review | verified | rejected | manually_corrected`), `notes` text, `corrected_price_min`, `corrected_price_max`, `checked_at`.
- A view that joins `mvs_providers` ⟕ latest `mvs_provider_verifications` so the grid stays one query.

This phase only **renders columns** for these; values come back empty / "Needs Review" by default.

## 4) Lowest-risk implementation plan (phases, ~turns)

**Phase E1 — Route + empty page shell (1 turn)**
- New file `src/pages/ProviderEvidence.tsx`.
- Route in `App.tsx`.
- Button in `LiveCityDeepDive.tsx` header.
- Page just shows city name and a "Loading…" state.

**Phase E2 — Read-only data grid (1–2 turns)**
- New hook `src/lib/mvs/useProviderEvidence.ts`: fetches `mvs_providers` for the city + latest `mvs_pipeline_runs.source_counts` for that city, joins in-memory by provider name.
- Render with the existing `Table` component (`src/components/ui/table.tsx`). Sortable headers, text search, CSV export (reuse pattern from `CityCompetitors.tsx`).
- Disabled action buttons + "Coming soon" tooltip.

**Phase E3 — Right-side detail drawer (1 turn)**
- Click a row → `Drawer` from `src/components/ui/drawer.tsx` (or `Sheet` for right side — confirm in build).
- Shows: query used, top URL, raw snippet from debug, guard result (kept / dropped + reason), screenshot link if present, all `sources[]` entries.

Total: ~3–4 Lovable turns. Each phase ships independently.

## 5) How this supports Phase 2 / 3 / 4

- **Phase 2 (current):** lets a human eyeball which queries actually surface real providers with real prices, and confirms the regex guard isn't over-dropping. Direct feedback into prompt tuning.
- **Phase 3 (Google/Gemini fallback):** the "Extraction phase" column will start showing Phase 3 rows. Reviewers can compare Phase 2 vs Phase 3 yield side by side.
- **Phase 4 (per-provider website scrape):** same grid grows a "website price" sub-row. The verification table from §3 becomes the ground-truth set we score Phase 4 accuracy against.

## 6) What can break

- Nothing in pricing math, scoring, freshness, City Search, Saved Sites, Candidate Pipeline, PDFs — this is a new isolated page.
- Risk areas: large cities with 200+ providers → render perf. Mitigation: virtualize the table or paginate at 100 rows.
- Risk: `google_search_queries` only exists for runs done **after** the Option-1 debug change. Older runs show "—" in the Source query column. Acceptable.

## 7) How to test

- Open `/market-validation/evidence/columbus-oh` after Phase E2 ships. Confirm:
  - All 62 Columbus providers appear.
  - The 8 prices kept by the new "prices per week tuition" query are tagged to that query.
  - The 12 prices dropped by the guard appear with `kept = No` and a drop reason.
  - CSV export downloads and opens in Excel.
- Spot-check 1 provider where we know the source URL (use the row drawer).
- Visit a city with **no** recent debug-enabled run (e.g. Boston) → grid renders, Source query column shows "—". No crash.

## 8) Rollback

- Single new route + single new page + one new button. Rollback = remove the route, the button, and delete `ProviderEvidence.tsx` + `useProviderEvidence.ts`. No DB migrations in this phase, so nothing to undo on the backend.

---

## Separate flag — "Columbus, OH OH" duplicate-state bug

- **Location:** `supabase/functions/mvs-discover-providers/index.ts`, in the Google query builder. The city key arriving as `"Columbus, OH"` gets the state appended again → `"Columbus, OH OH ..."`.
- **Safest one-line fix (not applied yet):** before appending state, strip an existing trailing `, <STATE>` from the city string. Something like:
  ```ts
  const cityOnly = city.replace(/,\s*[A-Z]{2}\s*$/i, "").trim();
  const q = `${cityOnly}, ${state} kids summer camp prices per week tuition`;
  ```
- Risk: zero — purely cosmetic in the query string. But it changes search results slightly, so it should ship as its own tiny PR after this evidence screen lands, with one re-run of Columbus to confirm provider count doesn't regress.

---

**Awaiting your approval before I start Phase E1.** No code, no DB changes, no Phase 3 or Phase 4 work in the meantime.
