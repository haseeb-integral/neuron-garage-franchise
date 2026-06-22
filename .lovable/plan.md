## Goal

Just add the new "Verify with Link" work we finished to the bottom of your existing **Site Analysis (1B) — Done** list. No code changes. This is only a written update so the list stays current.

## Updated list (additions are at the bottom)

**Site Analysis (1B) — Done**

- Removed all "recommend / do not recommend" wording everywhere.
- Removed the "★ Mark winner" button and winner banner.
- Changed from 3-tier to 4-tier confidence scale: Strong, High, Medium, Low.
- Renamed "Export decision pack" to "Export Site Report (PDF)".
- PDF now opens when any site has a score — no winner needed.
- PDF Section 10 renamed to "Summary & Next Steps" with neutral wording.
- Score pills, sub-score bars, and legend all use the new 4-tier bands.
- Removed the "Suggested: <tier>" score-based hint from the live engine card, so the score is never shown as a recommendation.
- Built the Watch List as the "Saved Sites Drawer" (My Sites / Team Sites tabs) with saver name, save time, last re-scored time, and four single-row actions: Save, Re-run, Replace, Remove.
- Live Re-run uses the same recomputeSiteScores helper as the rest of the app, so one calibrated number shows everywhere.
- Polished final PDF look refreshed in SitePackDocument.tsx (cover, sections, layout).
- Sidebar SAS Methodology page updated — added Section 8 covering the Saved Sites Drawer, metadata, action buttons, live re-run, and alignment rules.
- Applied Market Validation (1A) improvements to Site Analysis (1B).

**New — Trust & "Verify with Link" (just added)**

- Every number on the SAS page now carries a source tag: **Fresh**, **From cache**, **Backup source**, **Missing**, **You entered**, or **Estimate**.
- Added a small **ⓘ** icon on every metric tile. Click it to see: what the number is, where it came from, the year, when we fetched it, and buttons to **Open source** and **Copy link**.
- Added a **Data Sources strip** above the site cards showing one chip per provider (Census, Schools, Roads, Drive time) with their freshness at a glance.
- Added a yellow **Degraded banner** that appears only if any number used a backup source, so users are warned before trusting the score.
- Built real verify links for each provider:
  - **US Census ACS** → opens the live `api.census.gov` URL with the exact variable + tract IDs, plus a human-readable `data.census.gov` link.
  - **Urban Institute schools** → opens each school's profile page on `educationdata.urban.org`.
  - **OpenStreetMap roads** → opens the Overpass Turbo query we ran.
  - **Mapbox drive time** → opens a **Google Maps directions** link between the same two points (since Mapbox needs a private key).
  - **User input** → shows "You entered this on [date]".
  - **Heuristic estimates** → shows the formula and a clear "this is an estimate, not a measurement" note.
- Census cache now has a **1-year expiry** (`expires_at` column). Expired rows are treated as misses so we always refetch stale data.
- PDF export got a new **"11. Sources & Methodology"** page listing every number with its full verification URL printed underneath — so even a printed PDF can be verified by typing the link.

## What does not change

- No score math changes.
- No pillar weights changes.
- No tile or PDF layout changes outside the additions above.

This is purely a written update to keep the done list accurate. Approve and I'll mark it done — nothing to build.
