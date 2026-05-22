## Updated plan — locked to your instructions

**Scope confirmed:**
- Steps 1, 3, 4, 5 from the previous plan: **dropped, no changes.**
- `csi_score`: **leave as is.**
- `csi_local_camp_estimate` (Manus): **keep as is — Brett trusts Manus.**
- New work: **get real `summer_camp_count` for the missing cities via a Manus brief + downloadable seed CSV.**

**One correction up front (honest):** you said 817 cities. 817 is the BLS-salary number. `summer_camp_count` is actually **NULL for all 977 cities** in `us_cities_scored` (verified just now: `total=977, has_value=0, null_count=977`). The Manus brief below targets all 977.

---

## Deliverable 1 — Seed CSV for Manus

File: `cities-needing-camp-counts.csv` (977 rows, ~80 KB)

Columns (pulled straight from `us_cities_scored`, no derived fields):

| Column | Source | Purpose |
|---|---|---|
| `city_id` | `us_cities_scored.id` (uuid) | Primary key for upsert back into our DB |
| `city_name` | `us_cities_scored.city_name` | Scrape target |
| `state_name` | `us_cities_scored.state_name` | Scrape target |
| `state_abbr` | `us_cities_scored.state_abbr` | Scrape target |
| `county_name` | `us_cities_scored.county_name` | Geo disambiguation (e.g. multiple "Springfield"s) |
| `metro_area` | `us_cities_scored.metro_area` | Geo disambiguation |
| `latitude` | `us_cities_scored.latitude` | Radius search center |
| `longitude` | `us_cities_scored.longitude` | Radius search center |
| `population` | `us_cities_scored.population` | Sanity check on counts |
| `children_5_12` | `us_cities_scored.children_5_12` | Sanity check on demand |
| `public_elementary_enrollment` | `us_cities_scored.public_elementary_enrollment` | Sanity check |

(I can't write to `/mnt/documents/` while in plan mode — the CSV will be generated and download-linked the moment you approve this plan and switch to build mode. The SQL is ready: `COPY (SELECT id AS city_id, city_name, state_name, state_abbr, county_name, metro_area, latitude, longitude, population, children_5_12, public_elementary_enrollment FROM us_cities_scored ORDER BY state_abbr, city_name) TO STDOUT WITH CSV HEADER`.)

---

## Deliverable 2 — Manus prompt (copy/paste, ready to send)

> **Task: Real `summer_camp_count` for 977 U.S. cities — Neuron Garage Competitive Landscape**
>
> **Context.** Neuron Garage is an internal franchise-recruiting tool for an after-school / summer STEM enrichment brand (Kaylie Reed's company). Competitive Landscape category currently uses your v2 modeled estimate (`elementary_enrollment × 0.003`). We now need a **real measured count** per city to replace the modeled value. Brett trusts your data — please apply the same rigor as the v2 brand-supply scrape.
>
> **Deliverable.** A CSV with one row per `city_id` from the attached seed file (`cities-needing-camp-counts.csv`, 977 rows). Required output columns:
>
> ```
> city_id,
> city_name,
> state_abbr,
> summer_camp_count,                  -- integer, the headline metric
> summer_camp_count_method,           -- short text: "google_maps" | "yelp" | "state_license_db" | "composite" | "no_data"
> summer_camp_count_radius_miles,     -- numeric, the radius used (default 10)
> summer_camp_count_sources,          -- semicolon-separated source URLs / DB names actually consulted
> summer_camp_count_last_verified,    -- ISO date you ran the scrape
> summer_camp_count_confidence,       -- "high" | "medium" | "low"
> notes                               -- free text (edge cases, why low confidence, etc.)
> ```
>
> **Definition of "summer camp" (strict — please honor):**
> - Day camp or week-long enrichment program serving children ages **5–12**
> - Operates during summer break (June–August in most states)
> - Located within **10 miles** of the city's `latitude` / `longitude`, OR inside the city's `county_name`
> - **Include:** independent local camps, school-hosted summer programs, YMCA/JCC/Boys & Girls Club summer camps, STEM camps, sports camps, art camps, day-care-run summer programs
> - **Exclude:** overnight / sleepaway camps, college-run pre-college programs for high-schoolers, year-round after-school programs that don't run a distinct summer offering, single-day workshops, virtual-only programs
>
> **Source hierarchy (use the most reputable available — your call):**
> 1. **State / county child-care licensing databases** (most authoritative — e.g. TX HHSC Child Care Search, CA CCLD, NY OCFS). Many states publish a public list of licensed summer day-camp providers.
> 2. **ACA (American Camp Association) accredited camps directory** — `https://find.acacamps.org`
> 3. **Google Maps Places API** — query "summer camp" + city, filter by `type=primary_school|amusement_park|tourist_attraction` ruled out, manually verify top-N
> 4. **Yelp Fusion API** — category `summercamps`, location radius 10 mi
> 5. **YMCA / JCC / Boys & Girls Club official location directories** (national chains, deduplicate against #3/#4)
> 6. **City Parks & Rec department websites** (Firecrawl is fine here)
>
> **If you find a more reputable source than the above for a given state, use it** — just record it in `summer_camp_count_sources`.
>
> **Quality rules:**
> - Deduplicate by name + street address (same camp listed in Google Maps and Yelp = 1 count)
> - If a single operator runs camps at multiple locations within the city, count each **location**, not each operator
> - Where no source returns any camps, return `summer_camp_count = 0`, `confidence = "low"`, `method = "no_data"`, and note which sources you checked
> - Do **not** model / estimate / extrapolate. If a city genuinely has 0 verifiable summer camps, that's the answer.
> - Do **not** copy the `enrollment × 0.003` proxy into this column under any circumstances.
>
> **Sanity check columns we'll run on your output:**
> - Cities with `population > 50000` AND `summer_camp_count = 0` → flagged for re-check
> - Cities with `summer_camp_count > population / 500` → flagged as likely double-count
> - Sum of `summer_camp_count` nationally compared to ACA's published total (~15,000 accredited day camps) for plausibility
>
> **Delivery format:** Same CSV format you used for the 2026-05-21 v2 Competitive Landscape upload. Drop into `data/incoming/competitive-landscape/<date>/` with a sibling `methodology-vX.md` describing source mix per state.
>
> **Attached:** `cities-needing-camp-counts.csv` (seed file with 977 rows + lat/lng + sanity-check columns).

---

## What happens after Manus delivers

1. New migration adds columns: `summer_camp_count_method`, `summer_camp_count_radius_miles`, `summer_camp_count_sources`, `summer_camp_count_last_verified`, `summer_camp_count_confidence` on `us_cities_scored`. `summer_camp_count` already exists (integer, currently NULL on all 977).
2. CSV upsert by `city_id` (idempotent, per TPD.md §3).
3. Re-score pass updates `score_csi` (Manus may want to recompute `csi_score` with this real number replacing `csi_local_provider_estimate` — that's a Brett-level decision, not ours).
4. Doc-sync: append to `OPEN_TASKS.md` under "B7 Apify competitor scrape — superseded by Manus 2026-XX-XX run" and update `APIS.md` source list.

---

## What I need from you

1. Approve this plan → switch to **Build mode**.
2. On approval I will: generate the CSV at `/mnt/documents/manus-camp-scrape/cities-needing-camp-counts.csv` and surface the Manus prompt as `/mnt/documents/manus-camp-scrape/manus-brief.md` so you can download both and forward to Brett/Manus in one go.

No code, no DB, no UI changes happen in this step — it's just the brief + CSV bundle.
