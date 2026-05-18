# APIS.md — Neuron Garage

> Snapshot date: May 18, 2026
> Generated from the live Lovable Cloud secrets list, edge function source (`Deno.env.get(...)`), and the May 15 meeting decisions.
> Update this file when an API is added, removed, blocked, or changes status. See `PROJECT_CONTEXT.md` for the short inventory table.

---

## Section A — Live & wired

Every API below has a configured secret in Lovable Cloud AND is read by deployed edge function code.

### Census ACS (American Community Survey)
- **Purpose:** Population, children 0–14, median household income, density.
- **Secret:** `CENSUS_API_KEY`
- **Used in:** `supabase/functions/_shared/metricFetchers.ts`
- **Called from:** `fetch-city-market-data-sow`, `fetch-city-market-data`
- **Cost / limit:** Free. ~500 calls/day per key.
- **Owner of key:** Haseeb.
- **Fallback if down:** Last value cached in `city_market_signals`.
- **Docs:** https://www.census.gov/data/developers/data-sets/acs-5year.html
- **Status:** Live ✅

### BLS (Bureau of Labor Statistics)
- **Purpose:** STEM jobs, labor force participation, regional employment.
- **Secret:** `BLS_API_KEY`
- **Used in:** `supabase/functions/_shared/metricFetchers.ts`
- **Called from:** `fetch-city-market-data-sow`
- **Cost / limit:** Free. 500 queries/day per key.
- **Owner of key:** Haseeb.
- **Fallback if down:** Cached in `city_market_signals`.
- **Docs:** https://www.bls.gov/developers/
- **Status:** Live ✅

### BEA (Bureau of Economic Analysis)
- **Purpose:** Regional income / per-capita income metrics.
- **Secret:** `BEA_API_KEY`
- **Used in:** `supabase/functions/_shared/metricFetchers.ts`
- **Called from:** `fetch-city-market-data-sow`
- **Cost / limit:** Free, generous rate limits.
- **Owner of key:** Haseeb.
- **Docs:** https://apps.bea.gov/API/signup/
- **Status:** Live ✅

### FRED (Federal Reserve Economic Data)
- **Purpose:** Regional median income, Cost-of-Living Index proxies.
- **Secret:** _none — public endpoint_
- **Called from:** `fetch-city-market-data-sow`
- **Cost / limit:** Free.
- **Docs:** https://fred.stlouisfed.org/docs/api/fred/
- **Status:** Live ✅

### NCES CCD (via Urban Institute Education Data API)
- **Purpose:** Public school counts per city — **all** open public schools (any grade), plus a derived elementary-serving subset.
- **Secret:** _none — public endpoint_
- **Called from:** `fetch-school-counts`, `seed-cities-database`
- **What we store (as of May 18):** All open public schools (`school_status = 1`) matched to the city alias set go into `us_cities_scored.public_school_count` / `public_school_enrollment`. The elementary subset (`lowest_grade_offered ≤ 5`) is derived at write time into `public_elementary_count` / `public_elementary_enrollment`. *Previously we only stored the elementary count — column names were renamed in the same migration to avoid name-vs-meaning drift.*
- **Cost / limit:** Free.
- **Match rate today:** 48 / 50 sample cities matched. Boston verified: 129 total public schools / 94 elementary-serving.
- **Docs:** https://educationdata.urban.org/documentation/
- **Status:** Live ✅

### Apify — Google Maps Crawler actor
- **Purpose:** Competitor scraping (City Search) + teacher / school directory scraping (Teacher Search).
- **Secrets:** `APIFY_API_TOKEN`, `APIFY_GOOGLE_MAPS_ACTOR_ID` (default `compass/crawler-google-places`)
- **Called from:** `fetch-city-market-data-sow`, `fetch-teacher-prospects`, `enrich-school-staff`
- **Cost / limit:** Paid per actor run (~$0.25–$1 per city).
- **Owner of key:** Haseeb.
- **Status:** Live ✅

### Firecrawl
- **Purpose:** Web scraping / page enrichment for school sites and competitor pages.
- **Secret:** `FIRECRAWL_API_KEY`
- **Called from:** `enrich-school-staff`, `fetch-city-market-data-sow`
- **Cost / limit:** Paid (Firecrawl plan tiers).
- **Owner of key:** Haseeb.
- **Docs:** https://docs.firecrawl.dev/
- **Status:** Live ✅

### Lovable AI Gateway
- **Purpose:** In-app AI — fit-score reasoning, candidate summaries, email personalization.
- **Secret:** `LOVABLE_API_KEY` (managed by Lovable)
- **Called from:** Email outreach AI generation, AI-assisted fit narratives.
- **Cost / limit:** Free monthly allowance, then usage-based.
- **Models in use:** `google/gemini-2.5-flash` for fast tasks, `openai/gpt-5-mini` for nuance.
- **Status:** Live ✅

### Supabase (Lovable Cloud)
- **Purpose:** Auth, Postgres, Edge Functions, Storage (no buckets yet).
- **Secrets:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY(S)`, `SUPABASE_SECRET_KEYS`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWKS`, `SUPABASE_DB_URL`
- **Status:** Live ✅

---

## Section B — Approved but not yet wired

These are decided-on but blocked by an external dependency.

### GreatSchools
- **Purpose:** Private + charter elementary school counts per city (the gap in NCES coverage).
- **Secret needed:** `GREATSCHOOLS_API_KEY`
- **Blocker:** Brett to sign up at https://www.greatschools.org/api (14-day free trial → $52.50/mo) and paste the key into Lovable Cloud.
- **Status:** ⏳ Waiting on Brett

### SmartLead ("Integral Leads")
- **Purpose:** Outbound email send + reply tracking for Email Outreach.
- **Secret needed:** `SMARTLEAD_API_KEY`
- **Blocker:** Sprint task #17. Account exists; integration code not built.
- **Status:** ⏳ Sprint pending

### Apollo
- **Purpose:** Teacher sourcing — bulk export of email-enriched K–6 teachers in target cities.
- **Secret needed:** `APOLLO_API_KEY` (also usable as one-off CSV export — no API needed for first seed)
- **Blocker:** Sourcing decision (see Section C). Access exists.
- **Status:** ⏳ Awaiting Brett's sourcing decision

### DonorsChoose
- **Purpose:** Free fit-signal layer for teachers (active classroom projects = active teacher).
- **Secret needed:** None (public API)
- **Blocker:** Not built. Recommended addition per May 15.
- **Docs:** https://www.donorschoose.org/about/open_api.html
- **Status:** ⏳ Backlog

### Clay
- **Purpose:** Email-enrichment waterfall (use only if Apollo email coverage < 40%).
- **Secret needed:** `CLAY_API_KEY`
- **Blocker:** Deferred — only adopt if Apollo coverage is insufficient.
- **Status:** ⏳ Conditional

---

## Section C — APIs that feed the database layer (Task #0)

This is the part that matters most for the May 20 deadline. The app is moving from **per-row live API calls** to **pre-seeded database tables** (`us_cities_scored`, `teacher_prospects_master`) refreshed on a schedule. Different APIs play different roles:

### Pattern 1 — Per-row live fetch (today, will be deprecated)
Called once per city when a user adds a city. Slow.

| API | Writes to | Replacement |
|---|---|---|
| Census ACS, BLS, BEA, FRED | `city_market_signals`, `city_category_scores` | Bulk seed `us_cities_scored` |
| NCES CCD | `cities.elementary_schools` | Bulk seed `us_cities_scored` |
| Apify Google Maps | `city_competitors`, `cities.competitor_count` | Scheduled refresh into `us_cities_scored` |

### Pattern 2 — Bulk seed for `us_cities_scored`
Called once across all 800+ U.S. cities, then refreshed monthly by a scheduled edge function.

| API | What it pulls | Frequency |
|---|---|---|
| Census ACS | Demographics for every city | Monthly |
| BLS | Employment metrics by metro | Monthly |
| BEA | Per-capita income by metro | Quarterly |
| FRED | COLI / median income series | Monthly |
| NCES CCD | Public elementary school counts | Annual |
| GreatSchools | Private + charter counts | Annual (once wired) |
| Apify Google Maps | Competitor density | Quarterly |

### Pattern 3 — Bulk seed for `teacher_prospects_master`
The teacher recruiting database. Sourcing strategy was **decided May 15** as combination A + B + D, pending Brett's sign-off on which providers to pay for.

| Source | Pattern | Role |
|---|---|---|
| Apollo (option A) | One-time CSV export + ongoing API top-ups | Primary — email-enriched K–6 teachers |
| Purchased vendor list (option B) | **CSV ingest, NOT an API** — Exact Data, LeadsPlease, or K12 Prospects ($500–$2,000 one-time) | Coverage layer for retired teachers |
| Apify school directory scraping (option C) | Per-school scrape via Apify Google Maps + Firecrawl | Targeted backfill for missing cities |
| DonorsChoose (option D) | Public API, scheduled scan | Fit-signal layer (proves teacher is active) |
| Clay (optional) | API enrichment waterfall | Only if Apollo email coverage < 40% |

> **Important distinction:** Purchased vendor lists are CSVs, not APIs. They need a one-time `seed-teachers-from-csv` edge function or a manual upload, not an integration. Track the vendor and purchase date in this file when the decision is made.

### Pattern 4 — On-demand enrichment (stays live, even after seed tables exist)
Some calls will always be live because the data changes per candidate / per teacher.

| API | Use case |
|---|---|
| Firecrawl | Pull a specific school's staff page when a user opens it |
| Lovable AI | Generate an email body, summarize a candidate profile |
| SmartLead | Send an outbound email |

---

## How to add a new API to this project (checklist)

1. Pick the secret name (uppercase + underscore, e.g. `GREATSCHOOLS_API_KEY`).
2. Ask the user to add it via Lovable Cloud (use the `add_secret` tool — never paste a key into code).
3. Add the `Deno.env.get('NEW_KEY')` call inside the edge function that needs it.
4. Deploy the edge function.
5. **Add a new block to Section A of this file** with: purpose, secret, used-in, called-from, cost, owner, fallback, docs.
6. Update `PROJECT_CONTEXT.md` § 4 (one line in the table).
7. If the new API affects user-visible behavior, update `HOW_IT_WORKS.md` too.

## How to remove / rotate an API key

- **Rotate value:** `update_secret` tool. No code change. No doc change.
- **Rotate ownership:** update the "Owner of key" line in Section A here only.
- **Remove the integration:** delete the `Deno.env.get` call, deploy, then `delete_secret`, then move the block from Section A to a new "Section D — Removed" with the date and reason.

---

*Source of truth for integration decisions: this file + `MAY15_MEETING_NOTES.md`. If they disagree, the meeting notes win and this file must be updated.*
