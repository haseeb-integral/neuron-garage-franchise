# APIs & Data Sources

- **Audience:** Brett, Sam, and any engineer joining the project.
- **Owner:** Haseeb &nbsp; · &nbsp; **Approver:** Brett

This is the single page that lists every external service Neuron Garage talks to — what it does, where it shows up in the app, where the key lives, and who owns the account today. **No secret values are written here.** All real keys live in Lovable Cloud secrets (vault); this page only names them.

> **Note on Firecrawl:** Firecrawl is used **both** inside this Lovable app (school/site scraping for teacher enrichment) **and** inside the three Manus apps. One vendor, multiple consumers. Account ownership decisions should reflect that.

---

## Part A — Plain-English overview

| Service | What it does for us | Where it shows up | Free / paid | Account owner today |
|---|---|---|---|---|
| **Firecrawl** | Scrapes school and district websites to enrich teacher records. *Also used by the three Manus apps.* | Teacher Search (enrichment), background jobs | Paid | Brett |
| **Apify** | Runs Google Maps scrapes for competitor lists and teacher prospects. | City Search (competitive landscape), Teacher Search (Find Prospects) | Paid | Brett |
| **SmartLead** ("Integral Leads") | Sends our cold email campaigns and receives replies via webhook. | Email Outreach (all of it) | Paid | Brett |
| **Deepgram** | Text-to-speech voice for the AI assistant. | Neuron AI panel (voice replies) | Paid | Brett |
| **Lovable AI Gateway** | One door to every AI model the app uses (Gemini, GPT-5 family). No third-party AI keys live in this project. | Every AI surface — City Ask-AI, Teacher Search AI, Observability AI, User's Guide chatbot, Neuron AI, reply classifier, CSV mapper, email body generation | Paid (Lovable plan) | Managed by Lovable |
| **Resend** | Sends transactional email — password resets, weekly digests, system notifications. | Auth flows, Data Health weekly digest | Paid | Brett |
| **US Census ACS** | Population, children, income, age, density for every US city. | City Search (Demand + TAM pillars) | Free (key required) | Brett |
| **BLS** (Bureau of Labor Statistics) | STEM jobs and labor force per metro. | City Search (TAM pillar) | Free (key required) | Brett |
| **BEA** (Bureau of Economic Analysis) | Regional income indicators. | City Search (Demand pillar) | Free (key required) | Brett |
| **FRED** (St. Louis Fed) | Median income, cost-of-living index. | City Search (Demand pillar) | Free (no key) | — |
| **NCES CCD** (via Urban Institute) | Every public K–12 school in the US — name, address, grades, enrollment. | City Search (school counts), `public_schools` table | Free (no key) | — |
| **NCES PSS** (embedded Excel) | Private elementary counts. | City Detail drawer (private schools widget) | Free (static lookup) | — |
| **Open-Meteo Historical** | Climate signals — snowfall, avg temp, sunny days, severe-weather days. | City Detail drawer (climate panel) | Free (no key) | — |
| **Apollo** | Teacher contact enrichment (email, LinkedIn). | Teacher Search (enrichment) | Paid | Brett |
| **Lovable Cloud** (Supabase under the hood) | Our database, auth, file storage, edge functions, realtime. | Everything | Paid (Lovable plan) | Managed by Lovable |

> Everything listed above is live in production today. Pending or stubbed services have been removed from this page.




---

## Part B — Engineer reference

Each entry below names the **secret** that the corresponding key is stored under in Lovable Cloud secrets, and the **edge function(s)** that read it. Never paste a key value into this page or any other file in the repo.

### Firecrawl
- **Secret name:** `FIRECRAWL_API_KEY`
- **Edge functions:** `enrich-school-staff`
- **Notes:** Same vendor account is shared with the three Manus apps. If we rotate the key here, coordinate with the Manus apps before rotating.

### Apify
- **Secret names:** `APIFY_API_TOKEN`, `APIFY_GOOGLE_MAPS_ACTOR_ID`
- **Edge functions:** `fetch-teacher-prospects` (teacher scrape), competitor scrape jobs

### SmartLead
- **Secret names:** `SMARTLEAD_API_KEY`, `SMARTLEAD_WEBHOOK_SECRET`
- **Edge functions:** `smartlead-proxy`, `smartlead-push-leads`, `smartlead-webhook`
- **Gotcha:** `track_settings` uses **negative** booleans (`DONT_TRACK_OPEN`, `DONT_TRACK_CLICK`) — see SmartLead API Spec page.

### Deepgram
- **Secret name:** `DEEPGRAM_API_KEY`
- **Edge functions:** `deepgram-tts`

### Lovable AI Gateway
- **Secret name:** `LOVABLE_API_KEY` (auto-managed by Lovable)
- **Edge functions:** `ask`, `ask-city`, `neuron-ai`, `neuron-ai-confirm`, `ai-city-query`, `city-analyst`, `teacher-search-ai`, `observability-ai`, `users-guide-ai`, `csv-suggest-mapping`, `smartlead-webhook` (reply classification)
- **Models in use:** see System Architecture page, Section 3.

### Resend
- **Secret names:** `RESEND_API_KEY`, plus webhook secret for bounce/unsubscribe ingestion
- **Edge functions:** `send-transactional-email`, `process-email-queue`, `preview-transactional-email`, `handle-email-suppression`, `handle-email-unsubscribe`, `weekly-data-health-digest`

### US Census ACS
- **Secret name:** `CENSUS_API_KEY`
- **Edge functions:** `seed-cities-database`, `backfill-census-gaps`, `_shared/metricFetchers.ts` (SOW sprint metrics), `mvs-acs-pull`, `_shared/census.ts` (tract-level site analysis)
- **Vintage in use:** ACS 5-year **2024** (data span 2020–2024) for city-place pulls (`seed-cities-database`, `backfill-census-gaps`, `_shared/metricFetchers.ts`). Tract/county pulls for Site Analysis (`_shared/census.ts`, `mvs-acs-pull`) currently use vintage 2022 — bump when refreshed.
- **% Dual-Income Households formula:** `B23007_006E / B23007_002E`
  - Numerator `B23007_006E` = married-couple family with own children <18, husband in labor force (employed/AF) **AND** wife in labor force.
  - Denominator `B23007_002E` = ALL family types (married + single-parent) with own children <18.
  - Single-parent families stay in the denominator by design — this measures the prevalence of the dual-earner family profile in the market, not the employment rate among married couples.
  - The earlier formula `(B23007_006E + B23007_011E) / B23007_002E` produced inflated values in low-employment cities and was retired 2026-07.

### BLS
- **Secret name:** `BLS_API_KEY`
- **Edge functions:** city-data fetchers (see `_shared/metricFetchers.ts`)

### BEA
- **Secret name:** `BEA_API_KEY`
- **Edge functions:** city-data fetchers

### FRED, NCES CCD, NCES PSS, Open-Meteo
- No API keys required. Called directly from edge functions.
- `seed-cities-database`, `backfill-public-schools`, `seed-cities-weather`, `fetch-school-counts`.

### Lovable Cloud (Supabase)
- **Public:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- **Server-only:** service role key (edge functions env, never bundled)

---

## Adding a new external API — checklist

1. Add the key as a **Lovable Cloud secret** (never in `.env`, never in a committed file).
2. Read it from the edge function via `Deno.env.get(...)`.
3. Add the provider to **both** tables above (Part A overview + Part B engineer reference).
4. Update the **System Architecture** page Section 4 (Data sources and integrations) so the two pages agree.
5. If the new service is shared with another app (e.g. the Manus apps), say so explicitly — like the Firecrawl note above.

---

*If anything in this page is out of date, fix this page first, then the code.*
