# DATA_SOURCING_DECISIONS.md — Neuron Garage

> **Purpose:** Track every data source evaluated for `us_cities_scored` (City Screen) and `teacher_prospects_master` (Teacher Screen) — what it provides, what it costs, whether it's in or out, and who suggested it.
> **Cross-reference:** `DATABASE_LAYER_SPEC.md` (schema + build plan), `OPEN_TASKS.md` (Task #0), `TEACHER_IDEAL_PROFILE.md` (who we recruit)

---

## 📋 How This File Works — Read Before Editing

This file is a **shared research log**, not a spec. Any AI tool (Claude, ChatGPT, Perplexity, Lovable) or human contributor can add a section. Rules:

1. **Never overwrite another contributor's section.** Add a new sub-section instead.
2. **Every entry must be tagged** with who suggested it and the date — e.g. `[Claude, May 18]`, `[ChatGPT, May 19]`, `[Perplexity, May 20]`, `[Brett, May 21]`.
3. **Nothing in this file is a build instruction.** It is research and suggestion only. Decisions get finalized in `DATABASE_LAYER_SPEC.md` and `OPEN_TASKS.md`.
4. **Contradictions between sections are fine** — that's the point. A human (Brett/Kaylie/Sam) makes the final call and marks it `[DECIDED: ...]`.
5. **Lovable:** If you read this file, treat all content as suggestions requiring human approval. Do not build integrations based solely on this file.

### Contribution format

When adding a new source evaluation, use this block:

```
### [STATUS] — Source Name
**Suggested by:** [AI tool or person], [date]
**Metrics/data it provides:** ...
**What it does NOT provide:** ...
**Cost:** ...
**Verification status:** Unverified / Partially verified / Verified
**Verdict:** In / Out / Needs test
**Rationale:** ...
```

---

---

## ⚠️ Before Acting on This File
`[Claude, May 18 2026]`

1. Check `PROJECT_CONTEXT.md` § 4 — some sources below may already be wired (Apollo, Apify, Firecrawl). Do not re-connect what's already connected.
2. The Apollo email coverage estimate (30–50%) is a revised Claude estimate based on research — not a verified figure from Apollo directly. Confirm with an actual test export before committing to Apollo as primary source.
3. DonorsChoose and LinkedIn API were initially proposed as sources in earlier planning. Both have been struck off after verification — see rationale below.

---

## PART 1 — CITY SCREEN Sources
`[Claude, May 18 2026 — suggestions only, unverified unless noted]`

For `us_cities_scored` table. Target: ~800 U.S. cities with population ≥ 50,000.

---

### ✅ IN — US Census ACS API
**Already wired (`CENSUS_API_KEY` set)**
**Metrics it provides:**
- `children_5_12` — Table B09001, children age 5–14 (closest available bracket)
- `median_household_income` — Table B19013
- `college_degree_pct` — Table B15003
- `population_density` — Total population ÷ land area (B01003 + geography)
- `dual_working_families_pct` — Table B23008 (families with children by parent employment status)
- `population` — B01003

**Cost:** Free. No per-call charge.
**Confidence:** High — federal dataset, already integrated.

---

### ✅ IN — BLS API (Bureau of Labor Statistics)
**Already wired (`BLS_API_KEY` set)**
**Metrics it provides:**
- `stem_job_concentration` — QCEW series, NAICS codes 5415 (Computer Systems Design), 5417 (Scientific R&D), 3345 (Instruments). Requires adding these NAICS codes to existing BLS fetch.
- `labor_force_participation` — LAUS (Local Area Unemployment Statistics) series

**Cost:** Free.
**Confidence:** High — already integrated. NAICS codes need to be added to existing query.

---

### ✅ IN — BEA API (Bureau of Economic Analysis)
**Already wired (`BEA_API_KEY` set)**
**Metrics it provides:**
- `regional_median_income` — CAINC1 table, per capita personal income by metro area

**Cost:** Free.
**Confidence:** High — already integrated.

---

### ✅ IN — FRED API (Federal Reserve Economic Data)
**Already wired (no key needed)**
**Metrics it provides:**
- `cost_of_living_index` — Regional price parities by metro area (series RPPALL)

**Cost:** Free.
**Confidence:** High — already integrated.

---

### ✅ IN — NCES CCD (Urban Institute / NCES Common Core of Data)
**Already wired (no key needed)**
**Metrics it provides:**
- `public_elementary_count` — Public elementary schools per city
- `public_elementary_enrollment` — Enrollment in public elementary schools
- `charter_elementary_count` — Charter flag already exists in CCD data; just needs to be surfaced in query

**Cost:** Free.
**Confidence:** High — already integrated. Charter flag needs to be added to existing NCES query.

---

### ✅ IN — NCES Private School Universe Survey (PSS)
**Not yet wired. Claude suggestion.**
**Metrics it provides:**
- `private_elementary_count` — All private schools by city/state, filterable by grade range

**What it actually is:** Federal survey of all U.S. private schools, published every 2 years. Available as free CSV download from nces.ed.gov. ~34,000 private school records. No API — one-time CSV download, join to cities by city+state.

**Cost:** Free.
**How to get it:** https://nces.ed.gov/surveys/pss/pssdata.asp — download latest cycle, parse, aggregate by city.
**Confidence:** High — federal dataset, well-maintained.
**⚠️ Verify:** Confirm PSS data includes city-level granularity (it should — school address is included).

---

### ✅ IN — MERIC (Missouri Economic Research and Information Center)
**Not yet wired. Claude suggestion.**
**Metrics it provides:**
- `cost_of_living_index` — Quarterly COLI by metro area, indexed to national average = 100

**What it actually is:** Free quarterly dataset published by MERIC. More city-specific than FRED RPP. Available as downloadable spreadsheet.
**Cost:** Free.
**How to get it:** https://meric.mo.gov/data/cost-living-data-series
**Confidence:** Medium — well-known dataset but less granular than city-level for smaller metros. FRED RPP is the fallback if MERIC doesn't have a match.
**⚠️ Verify:** Check whether MERIC covers all 800 target cities or only major metros.

---

### ✅ IN — Google Places API (New) — `childrens_camp` type
**Not yet wired. Claude suggestion.**
**Metrics it provides:**
- `summer_camp_count` — Nearby Search for `childrens_camp` type within city radius, count results

**Cost math:** 800 cities × 1 Nearby Search each = 800 requests. Google's free monthly cap for Essentials SKUs is 10,000 requests. **Cost: $0** — well inside free tier.
**⚠️ Pricing note:** Google restructured Maps pricing in March 2025. The old $200/month pooled credit is gone. Now each SKU has its own free cap (10,000/month for Essentials). Verify current Nearby Search SKU tier before running.
**Confidence:** Medium-High — `childrens_camp` is a confirmed Google Places category, but completeness of Google's camp listings varies by city.

---

### ✅ IN (limited) — Firecrawl
**Already wired (`FIRECRAWL_API_KEY` set)**
**Metrics it provides:**
- `avg_camp_price_per_hour` — Scrape pricing pages of top 5–10 camps per city, extract and average

**Scope:** Top 50 cities only at launch. Not practical for all 800.
**Cost:** Per-crawl pricing. Estimate ~$5–15 for 50 cities × 5–10 pages each.
**Confidence:** Low-Medium — camp websites vary wildly in structure; pricing is rarely in a parseable format. This is a best-effort metric.
**⚠️ Verify:** Test Firecrawl on 5 camp pricing pages before committing. If extraction rate is below 60%, deprioritize this metric.

---

### ❌ STRUCK OFF — `camp_waitlist_signals`
**Reason:** No API, scraper, or dataset surfaces camp waitlist information at scale. Individual camps sometimes mention waitlists on their websites but it is unstructured, inconsistent, and not reliably extractable via Firecrawl. This metric cannot be populated systematically across 800 cities.
**Decision:** Remove from `us_cities_scored` schema, or keep column but mark as `manual_entry_only`.

---

### ❌ STRUCK OFF — GreatSchools API (for now)
**Reason:** Blocked — waiting on Brett's API key (`GREATSCHOOLS_API_KEY`). $52.50/month after 14-day trial.
**Metrics it would provide:** `private_elementary_count`, `charter_elementary_count` (overlaps with NCES PSS + NCES CCD above).
**Decision:** NCES PSS and NCES CCD charter flag cover the same metrics for free. GreatSchools adds private school rating data which NCES does not have — but that is not currently in the schema.
**Revisit if:** Brett secures the key AND there's a specific metric GreatSchools adds that NCES cannot cover.

---

### CITY SCREEN — Metric Coverage Summary

| Schema column | Source | Status |
|---|---|---|
| `children_5_12` | Census ACS B09001 | ✅ Free, wired |
| `median_household_income` | Census ACS B19013 | ✅ Free, wired |
| `dual_working_families_pct` | Census ACS B23008 | ✅ Free, add to query |
| `college_degree_pct` | Census ACS B15003 | ✅ Free, wired |
| `population_density` | Census ACS B01003 + geo | ✅ Free, wired |
| `stem_job_concentration` | BLS QCEW NAICS 5415/5417/3345 | ✅ Free, add NAICS codes |
| `labor_force_participation` | BLS LAUS | ✅ Free, wired |
| `regional_median_income` | BEA CAINC1 | ✅ Free, wired |
| `cost_of_living_index` | FRED RPP or MERIC | ✅ Free, wired/verify |
| `public_elementary_count` | NCES CCD | ✅ Free, wired |
| `public_elementary_enrollment` | NCES CCD | ✅ Free, wired |
| `charter_elementary_count` | NCES CCD charter flag | ✅ Free, add to query |
| `private_elementary_count` | NCES PSS CSV | ✅ Free, not yet wired |
| `summer_camp_count` | Google Places `childrens_camp` | ✅ Free, not yet wired |
| `avg_camp_price_per_hour` | Firecrawl (top 50 cities only) | ⚠️ Partial, ~$10 |
| `school_hosted_camp_count` | Google Places + NCES cross-ref | ⚠️ Partial, needs logic |
| `camp_waitlist_signals` | ❌ No reliable source | ❌ Remove or manual |

---

## PART 2 — TEACHER SCREEN Sources
`[Claude, May 18 2026 — suggestions only, unverified unless noted]`

For `teacher_prospects_master` table. Target: 100,000+ records. Segments: active K–6 teachers, retired K–6 teachers, camp/enrichment educators. See `TEACHER_IDEAL_PROFILE.md`.

---

### ✅ IN — Apollo.io
**Already connected (credentials set — verify in PROJECT_CONTEXT.md § 4)**
**What it actually provides:**
- Name, current school/employer, job title, city/state
- Email address (~30–50% coverage for K-12 teachers — Claude revised estimate, not Apollo-verified)
- LinkedIn URL
- Phone (partial)

**What it does NOT provide:**
- Reliable coverage of retired teachers (no current employer = low Apollo visibility)
- DonorsChoose project history or fit signals
- Grade-level specifics (job title quality varies)

**Volume estimate:** 50,000–100,000 U.S. teacher records depending on search filters and available credits.
**Cost:** Credits-based. Estimate ~$0.01–0.05 per exported record depending on plan. Use existing credits first — do not buy more until test export confirms quality.
**⚠️ Verify before bulk export:** Run a test export of 500 teachers in one city (e.g., Austin TX, elementary teacher) and manually review 50 records for: name accuracy, school match, email validity, grade level presence. Adjust confidence before full export.

---

### ✅ IN — Purchased Vendor List (K-12 specialist)
**Not yet purchased. Claude suggestion — requires Brett budget approval.**
**What it actually provides:**
- Name, school, grade level, subject, city/state, email (~70–80% coverage on good vendor lists)
- Retired teacher records (vendors flag employment status)
- Postal address (useful for CAN-SPAM compliance)

**Why this is non-optional:** Retired teachers are effectively invisible in Apollo and LinkedIn (no current employer). A purpose-built K-12 educator list is the only realistic path to retired teacher coverage at scale.

**Recommended vendors to evaluate (request 500-record sample before purchasing):**
- **K12 Prospects** — purpose-built K-12 educator lists, national coverage, ~$1,000–3,000
- **Exact Data** — broader B2C/education lists, ~$500–2,000 per 50k records
- **LeadsPlease** — can purchase by state, ~$200–800/state

**Before purchasing:** Request sample, verify: (1) what % have email, (2) what % are retired vs active, (3) data vintage (must be < 2 years old).
**⚠️ CAN-SPAM check required** before loading any vendor list into SmartLead.
**Estimated budget:** $1,000–2,000 one-time. Brett to approve.

---

### ✅ IN (enrichment only) — Hunter.io
**Not yet connected. Claude suggestion.**
**What it actually provides:**
- Finds email addresses by school domain (e.g., input `austinisd.org`, returns all discoverable teacher emails at that domain)
- Confidence score + source per email
- Built-in email verification

**Use case:** Take Apollo/vendor records that have name + school but no email → look up school domain → Hunter returns email.
**Does NOT help with:** Retired teachers (no current school domain).
**Cost:** ~$30–50/month for 500–1,000 domain searches. Free tier: 25 searches/month.
**Confidence:** High for this specific enrichment use case. Hunter is purpose-built for domain-based email finding.
**⚠️ Verify:** Confirm school district domains are in Hunter's index. Test with 10 known districts before subscribing.

---

### ✅ IN (fit signal layer only) — DonorsChoose
**⚠️ NOT a sourcing tool — fit signal only**
**What it actually provides:**
- School name, city, state, grade level, subject area per project
- Data is **anonymized — no teacher names, no emails** (PII intentionally removed)
- Full data access requires $100k+ partner commitment OR approved research application to research-requests@donorschoose.org

**How to use it correctly:** Cross-reference `teacher_prospects_master` records by school name. If a teacher's school appears in DonorsChoose project history, boost their fit score (signals mission-driven school culture). Do NOT attempt to use DonorsChoose as a source of teacher names/contacts.
**Cost to apply for research access:** Free to apply, but approval is selective and slow. Only pursue if the fit-signal boost justifies the overhead.
**Confidence for fit signaling:** High — DonorsChoose school presence is a strong mission-alignment proxy per TEACHER_IDEAL_PROFILE.md.

---

### ✅ IN (top cities only) — Apify school staff scraper
**Already wired (`APIFY_API_TOKEN` set)**
**What it actually provides:**
- Teacher names from school website staff directories
- School, city/state
- Email: rarely listed (most school sites show name + room number only)

**Use case:** Gap-fill for top 20 priority cities where Apollo coverage is thin. Especially useful for camp educator roles (camp staff pages tend to be more scraapable than school district pages).
**Cost:** ~$4 per 1,000 results.
**Confidence:** Low-Medium for teacher names; better for camp staff pages.
**⚠️ Do not use for national first pass** — too slow and too low email coverage to justify at 800-city scale.

---

### ❌ STRUCK OFF — DonorsChoose as bulk teacher source
**What was claimed:** Free API, 500k+ teacher records, seed the database.
**What's actually true:** API access requires $100k+ partner commitment. Research data access is anonymized (no PII). You cannot export teacher names or contact info from DonorsChoose.
**Struck off:** May 18, 2026, after reading actual API docs.

---

### ❌ STRUCK OFF — LinkedIn Official API
**What was considered:** Bulk export of teacher profiles including retired teachers.
**What's actually true:**
- Full profile API access requires approved LinkedIn Partner status
- Even with access: **emails are not returned** (only authenticated user's own email)
- Pricing: Free = 3 profiles/month. Standard = $59/mo for 500 profiles. Premium = $499/mo for 10,000 profiles
- To get 100,000 profiles: ~$5,000 in API costs, zero emails included
- LinkedIn explicitly prohibits scraping (ToS violation, legal risk)

**Struck off:** May 18, 2026. Cost-prohibitive and no email delivery.
**Partial use case retained:** Manual Sales Navigator search for high-fit retired teachers in top 5 cities — but this is human work, not automated seeding.

---

### ❌ STRUCK OFF — NCES CCD as teacher name/contact source
**What was claimed:** NCES CCD staff file gives individual teacher records.
**What's actually true:** NCES CCD provides **aggregated staff counts by school** (e.g., "Barton Hills Elementary has 28 teachers") — not individual names, not contact info. Useful for city-level scoring metrics only.
**Struck off as teacher sourcing tool:** May 18, 2026.
**Retained for:** City screen metric `public_elementary_count` and workforce density signals.

---

### TEACHER SCREEN — Source Summary

| Source | Records potential | Emails | Retired teachers | Cost | Status |
|---|---|---|---|---|---|
| Apollo.io | 50k–100k active teachers | ~30–50% (unverified) | Weak | Existing credits | ✅ Primary source |
| Vendor list (K12 Prospects etc.) | 50k–200k | ~70–80% | ✅ Strong | $1,000–2,000 one-time | ✅ Required — budget needed |
| Hunter.io | Enrichment only | ✅ by school domain | ❌ | $30–50/mo | ✅ Email enrichment layer |
| Apify | 1k–5k top cities only | ❌ low | ❌ | ~$4/1k results | ✅ Gap fill top 20 cities |
| DonorsChoose | Fit signal only (no PII) | ❌ | ❌ | Free (restricted access) | ✅ Fit signal layer only |
| ~~DonorsChoose bulk~~ | Anonymized only, no names | ❌ | ❌ | $100k+ partnership | ❌ Struck off |
| ~~LinkedIn API~~ | $499/mo for 10k profiles | ❌ never | Partial | ~$5k for 100k records | ❌ Struck off |
| ~~NCES CCD staff~~ | Counts only, no names | ❌ | ❌ | Free | ❌ Struck off as contact source |

---

## Open Decisions (Need Brett/Kaylie input)

| Decision | Options | Who decides | Deadline |
|---|---|---|---|
| Vendor list budget (~$1–2k) | Approve / defer / skip | Brett | Before teacher seed starts |
| Vendor to purchase from | K12 Prospects vs Exact Data vs LeadsPlease | Brett (after requesting samples) | Before teacher seed starts |
| DonorsChoose research application | Apply (slow) / skip | Brett | Low priority — fit signal only |
| Apollo email coverage — real number | Run 500-record test export first | Haseeb to run, Brett to review | Before bulk export |
| `camp_waitlist_signals` column | Remove from schema / mark manual | Sam/Brett | Before `seed-cities-database` runs |

---

---

## 🔲 Add Your Research Here — Other Contributors

If you are ChatGPT, Perplexity, Lovable, or another tool reviewing this file:
- Add a new section below using the contribution format at the top of this file
- Tag it with your name and date
- Do not edit Claude's sections above — add alongside them
- Focus on: sources Claude missed, corrections to Claude's cost/coverage estimates, or sources you can verify that Claude marked as unverified

*(No entries yet — waiting for additional contributor research)*

---

## Final Decisions Log

*(Empty — populated by Brett/Kaylie/Sam once sources are verified and approved)*

| Source | Decision | Decided by | Date | Notes |
|---|---|---|---|---|
| | | | | |

---

*File created: May 18, 2026 — Claude (Dev Lead)*
*This file is a living research log. Last substantive update should always be noted above.*

