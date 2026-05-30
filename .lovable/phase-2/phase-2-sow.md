# Neuron Garage Acquisition Platform — Phase 2 Scope of Work

> **Version:** 1.0 draft (merged from sources, 2026-05-30)
> **Predecessor:** Phase 1 — City Search v1.0 (948 cities, 12 metrics across 3 categories)
> **Timeline:** 4-week build + 2-week grace, **starts only after this SOW is locked by Brett**
> **Architects:** Brett + Sam. Brett hands the locked plan to Haseeb, who executes the 1.0 build.
> **Operating split:** Heavy data refinement → Manus. Display + UX → Lovable.

## Sources merged into this SOW

| # | Source | Folder location |
|---|--------|-----------------|
| 1 | Sam's v2 PDF — Module 1 Enhancements (Feature 1A + 1B) | `sources/neuron-garage-module1-enhancements-v2.pdf` |
| 2 | Sam meeting transcript, May 29 2026 | `sources/transcript Sam meeting May 29.txt` |
| 3 | Brett's 5-point Phase 2 sketch | `sources/brett-5-point-sketch.md` |

This SOW is what the team builds against. If something here is wrong, fix it in this file — chat-level edits don't count until they land here. Update `phase-2-status.md` whenever an item moves and log every edit in `CHANGELOG.md`.

---

## Operating Mode (from May 29 call)

1. **Architecture-first.** A full architecture cycle is locked before any building starts. The lesson from Phase 1: Haseeb went too deep into details for a few weeks; Brett had to take the wheel and reverse course. Phase 2 fixes that by putting Brett + Sam on the architecture and Haseeb on execution.
2. **One feature at a time, kept separate in the UI.** Don't fuse features. If two features share data, route through a clean interface — don't muddy the surface.
3. **Heavy data refinement → Manus.** Apify scrapes, Firecrawl page pulls, LLM extraction, refinement pipelines, scoring. Up to four Manus apps now (City Search, Competitive Landscape, Validation, and the new CSI-saturation app).
4. **Display + UX → Lovable.** Read pre-refined scores from Manus, render them, expose sliders, generate PDFs.
5. **One calibrated number everywhere.** Pillar and composite scores read from the same recomputed helper on every surface (table cells, popovers, selected-market panel, compare modal, exports). Never from stale DB-stored values.
6. **Tier the cost.** Tier 1 runs on hundreds of cities (pennies/city, federal data). Tier 2 runs on the 25–50 shortlist (dollars/city). Tier 3 runs on-demand per site (cheap). Don't run Tier 2 work on a Tier 1 universe.

---

# Phase 2 — Item Index

| # | Item | Version | Owner | Source |
|---|------|---------|-------|--------|
| 1 | Market Validation Engine (Feature 1A) | 1.0 | Manus refines + scores; Lovable displays + generates PDF | Sam PDF + Brett #1 |
| 2 | Site Analysis Engine (Feature 1B) | 1.0 | Manus scores; Lovable displays + compares + PDF | Sam PDF + Brett (added on call) |
| 3 | Candidate Pipeline 1.5 | 1.5 | Lovable | Brett #2 + transcript ("1.1 candidate pipeline upgrade") |
| 4 | Candidate-facing form & page (new login) | 1.0 | Lovable | Transcript (Sam, new idea on call) |
| 5 | Teacher Search 1.5 | 1.5 | Lovable | Brett #3 |
| 6 | SmartLead / Email Outreach 1.5 | 1.5 | Lovable | Brett #4 |
| 7 | Mailboxes (sending health) | 1.0 | Lovable | Brett #5 |
| 8 | Video Training / Onboarding module | 1.0 | Sam's team produces; Lovable hosts | Transcript (Sam #7) |
| 9 | 4th Manus app — Market Saturation / CSI Index upgrade | 1.0 | Manus | Brett + transcript |

There are 9 items total. Sam's PDF specifies items 1 and 2 completely. The rest are listed in Brett's sketch and the transcript by name and intent, but **detailed specs are not yet written for items 3, 5, 6, 7, 8, 9**. Item 4 has a one-paragraph direction from the call. Where a section says **TBD — Brett to fill**, that's an explicit gap, not an oversight.

---

# Item 1 — Market Validation Engine (Feature 1A) [1.0]

## Question it answers

Is this a validated premium enrichment market with active, paying demand?

## Primary output

Branded PDF report (12 sections), shareable internally or with prospective franchise candidates. Also displayed in-app per shortlisted city.

## Owner split

- **Manus** — Apify Maps discovery, Firecrawl page fetch + screenshots, Gemini 2.0 Flash extraction (via Lovable AI Gateway), confidence gating, week-level → provider-level → city-level aggregation. Writes refined results to the shared Supabase Postgres / Storage.
- **Lovable** — reads refined results, renders all six sub-scores + composite on the city detail surface, sliders + "Show Formula" drawers per v1.0 doctrine, low-confidence human-QA queue UI (page screenshot + LLM classification + four-button correction), branded PDF generator.

## Composite formula (verbatim from PDF, with `+` signs intact)

```text
Premium Enrichment Ecosystem Score =
    0.20 × Pricing Acceptance Score
  + 0.25 × Market Absorption Score      ← new, dominant demand-side signal
  + 0.20 × Scaled Operator Score
  + 0.10 × Enrichment Diversity Score
  + 0.10 × Market Depth Score
  + 0.15 × Market Balance Index
```

Market Absorption is the dominant weight (25%). Without it, every other sub-score measures supply only. A market where premium camps sell out by March is fundamentally different from one with leftover inventory in May, even when every other metric matches.

## Sub-score 1 — Pricing Acceptance (weight 0.20)

**Question:** Are families already paying Neuron Garage-level pricing?

Three signals capturing the *shape* of the local price distribution (not a single threshold):

| Signal | Formula |
|---|---|
| Median premium price/week | median of all premium provider weekly prices |
| 75th percentile premium price/week | 75th percentile of the same set (Neuron Garage's positioning anchor) |
| % of premium providers at $500+/week | count(price ≥ $500) ÷ total premium providers |

```text
Pricing Acceptance Score =
    0.40 × normalize(median price, range $300–$700)
  + 0.40 × normalize(75th percentile, range $400–$800)
  + 0.20 × (% at $500+)
```

Normalization is min-max against the typed range, capped 0–100. A market with median $550, 75th-percentile $625, and 60% of premium providers at $500+ produces a score around 75–85.

**Data sources:** Provider websites, camp registration platforms (Sawyer, ActivityHero, CampBrain, CampMinder), camp directories, aggregator listings. Same data pull powers Market Absorption — collected once.

## Sub-score 2 — Market Absorption (weight 0.25, NEW)

**Question:** Are existing premium operators actually selling out?

Three signals built from week-level registration state across the premium provider universe:

| Signal | Formula | Available |
|---|---|---|
| Sellout Rate | (sold_out weeks + waitlist weeks) ÷ total weeks scraped | Year 1 |
| Time-to-Sellout | average (sellout date − registration open date) ÷ season length | Year 1 if multi-scrape, else Year 2 |
| Year-over-Year Velocity | % of weeks sold out at this scrape date vs same date last year | Year 2 onward |

```text
Market Absorption Score =
    0.60 × normalize(Sellout Rate, range 0%–80%)
  + 0.25 × normalize(Time-to-Sellout, inverse — earlier = higher score)
  + 0.15 × normalize(YoY Velocity, range -20% to +30%)
```

In Year 1 only Sellout Rate is fully populated. The other two come online with subsequent scrapes. The score gracefully degrades — if only Sellout Rate is available, it carries the full weight.

### Data collection methodology — 5-stage pipeline

1. **Discovery** — Apify Google Maps actor identifies premium providers in each shortlisted city (same scrape as Pricing Acceptance).
2. **Registration page identification** — Firecrawl sitemap + classifier prompt finds each provider's registration listing page.
3. **Structured extraction** — Gemini 2.0 Flash via Lovable AI Gateway extracts week-by-week registration state into a strict JSON schema:

```json
{
  "camp_provider": "Galileo Frisco",
  "scrape_date": "2026-03-15",
  "weeks": [
    {
      "week_label": "Week 1: June 9-13",
      "theme": "Innovation Lab",
      "price": 549,
      "age_range": "5-7",
      "status": "sold_out",
      "status_evidence": "Red 'SOLD OUT' badge over week tile",
      "confidence": 0.95
    }
  ]
}
```

`status` enum: `sold_out`, `waitlist`, `low_availability`, `open`, `unknown`. Every extracted week carries `status_evidence` — this is the audit trail.

4. **Confidence gating + human QA** — Any week with confidence < 0.7 is routed to an internal review queue: page screenshot + LLM classification + four-button correction UI. ~10–15 minutes per shortlisted city per scrape.
5. **Aggregation** — Week-level statuses roll up to provider-level and city-level absorption rates.

### Signal types the extractor recognizes

| Signal | Example | Confidence |
|---|---|---|
| Explicit sellout language | "SOLD OUT", "Registration Closed", "Full" | High |
| Waitlist language | "Join Waitlist" replacing "Register" CTA | High |
| Scarcity language | "Only 2 spots left", "Last few spots" | High but noisy |
| Missing register button | Week listed but CTA absent/disabled | Medium |
| Early-close evidence | Weeks closed before published deadline | Medium-high |

### Temporal cadence (this is what makes the score predictive)

| Scrape date | What it tells us |
|---|---|
| Mid-January | Baseline (registration just opened). Sellouts here = exceptionally hot. |
| Mid-February | Early-bird response. Sellouts here = strong, sophisticated market. |
| Mid-March | Most diagnostic single snapshot. |
| Mid-April | Mainstream window. |
| Mid-May | Last-call. Markets still open here are weak. |

Year 1 = single mid-March scrape per shortlisted city. Year 2 = full five-scrape cadence for any city under active evaluation.

### Tooling summary

| Tool | Role | Status |
|---|---|---|
| Apify Google Maps actor | Provider discovery | Already wired in v1.0 |
| Firecrawl | Page fetching + screenshot capture | Already wired in v1.0 |
| Gemini 2.0 Flash via Lovable AI Gateway | Structured extraction | Already wired in v1.0 |
| Supabase Postgres | Week-level data store | Already in stack |
| Supabase Storage | Raw HTML + screenshot archive | Already in stack |
| Inngest or Trigger.dev | Background scrape scheduling | New, ~$20–50/month |
| Internal review UI | Low-confidence QA queue | New, ~3–5 days of Lovable work |

### Failure modes to plan for

| Mode | Handling |
|---|---|
| Provider has no public registration page (email/phone only) | Marked `unknown`. If >20% of premium providers in a market, the city's score gets a low-confidence badge. |
| Provider doesn't list weeks individually | Treated as one observation per provider rather than per week. Coarser but still usable. |
| Bot detection | Firecrawl rotating proxies handle most. Chronic offenders fall back to manual screenshot during the review cycle. |
| JS-heavy registration platforms (Sawyer, CampMinder) | Firecrawl with JS render wait. Hit underlying APIs only as a v2 optimization if cost becomes an issue. |

## Sub-score 3 — Scaled Operator (weight 0.20)

**Question:** Have sophisticated enrichment operators already validated this market?

Splits into two numbers because all scaled-operator presence is **not** equal:

- **Competitive overlap.** Steve & Kate's at $700/week is in Neuron Garage's lane. Code Ninjas' 1-week robotics intro is adjacent. Mad Science's after-school program is distant.
- **Validation vs saturation.** A market with 5 operators each running 4 sites isn't 5× as good as one with 5 operators each running 1 site. The first might be saturated; the second is validated but uncrowded.

Each scaled operator is tagged with two attributes during extraction:

| Attribute | Values |
|---|---|
| Competitive overlap | `direct` (price + age + theme overlap with NG) / `adjacent` (partial overlap) / `distant` (different segment) |
| Local site count | integer (number of locations of this operator in the metro) |

```text
Operator Validation     = count of distinct national operators present in market
                          (capped at 8 to avoid overweighting)
Direct Competitor Load  = sum of site counts for operators tagged 'direct',
                          per 10,000 kids ages 5–12

Scaled Operator Score =
    0.65 × normalize(Operator Validation, range 0–8)
  + 0.35 × (100 − normalize(Direct Competitor Load, range 0–5 per 10k))
```

Higher validation count = better. Higher direct competitor load = worse. The score rewards markets that are validated but not yet crowded with direct competition.

### National Operator Watchlist (starter, extendable in slider UI)

Galileo, Steve & Kate's, Camp Invention, Snapology, Code Ninjas, iD Tech, Mad Science, Engineering For Kids, Bricks 4 Kidz, Kids Inventor Lab, Maker Kids, theCoderSchool, Wiz Kidz, Sylvan Learning summer programs, Mathnasium summer enrichment. Each tagged with default overlap classification, editable per-city when local context warrants.

## Sub-score 4 — Enrichment Diversity (weight 0.10)

**Question:** Do families in this market invest in a variety of enrichment experiences?

```text
Category Count   = number of distinct enrichment categories with ≥1 premium provider
Diversity Ratio  = Category Count ÷ Premium Provider Count

Enrichment Diversity Score =
    0.70 × normalize(Category Count, range 2–10)
  + 0.30 × normalize(Diversity Ratio, range 0.1–0.6)
```

Category count rewards breadth; diversity ratio penalizes markets that are deep-but-narrow (10 robotics camps and nothing else doesn't actually demonstrate broad enrichment spending).

**Eligible categories:** STEM, Robotics, Coding, Science, Maker, Art, Theater, Music, Academic Enrichment, Debate, Chess, Entrepreneurship.

## Sub-score 5 — Market Depth (weight 0.10)

**Question:** How large is the premium enrichment ecosystem?

```text
Premium Provider Count = count of distinct premium enrichment providers in market
Market Depth Score     = normalize(Premium Provider Count, range 4–40)
```

A market with 40 premium providers behaves differently from one with 4. Simple, auditable, largely captured by other scores — hence the modest 10% weight.

## Sub-score 6 — Market Balance Index (weight 0.15, diagnostic)

**Question:** Is there still room in this market?

```text
Coverage Ratio        = Affluent Dual-Income Family Count ÷ Premium Provider Count
                        (families: dual-income, HH income ≥ $150k, kids ages 5–12)
Market Balance Index  = normalize(Coverage Ratio, range 50–500)

≥ 350      → Underserved
200–349    → Balanced
100–199    → Competitive
< 100      → Saturated
```

The supply-demand bridge that doesn't require capacity modeling.

## Premium Provider Definition (two-stage)

Collect the **full** camp universe in each shortlisted city, then classify each provider into one of four tiers:

| Tier | Definition |
|---|---|
| Premium | Price ≥ $400/week AND (STEM/maker/robotics/coding/science/art/theater/music/academic enrichment) AND not childcare-positioned |
| Mid | $250–$399/week, enrichment-positioned |
| Budget | < $250/week OR community/parks-and-rec/YMCA-positioned |
| Community | Faith-based, scholarship-driven, or municipally subsidized |

**The six sub-scores are computed only from the Premium tier.** Full dataset is captured for:
- Pricing-ladder context in the Market Brief (where premium sits relative to mid/budget)
- A "Premium share of total camp inventory" diagnostic (premium count ÷ all camps)
- Investigation when a market scores anomalously

Marginal cost of collecting and classifying mid/budget providers: ~$5–10 per city in additional LLM extraction. Worth it for the context.

**Excluded from Premium (but still collected):** Childcare camps, general day camps, YMCA-style camps, parks-and-recreation camps, summer daycare programs, faith-based camps.

## Inputs / data sources

- v1.0 city shortlist (25–50 cities)
- Apify Google Maps actor (provider discovery)
- Firecrawl (page fetch + screenshot capture)
- Gemini 2.0 Flash via Lovable AI Gateway (structured extraction)
- Supabase Postgres + Storage (week-level data + raw artifact archive)
- Inngest or Trigger.dev (background scheduling, NEW)
- Census ACS (already in stack from v1.0)

## Cost envelope

| Component | Cost |
|---|---|
| Apify Maps (shared with other scores) | ~$0 marginal |
| Firecrawl (~60 pages incl. registration sub-pages) | $3–6 per scrape per city |
| Gemini Flash extraction | ~$0.10 per scrape |
| Storage + DB | negligible |
| Inngest/Trigger.dev scheduling | ~$20–50/month |
| Human QA | ~1–2 hours per scrape cycle across full shortlist |

**~$3–6 per scrape per city. Five scrapes per active city per year ≈ $15–30/city/year. For a 25-city shortlist: $400–750/year total for Market Absorption.** Tier 2 envelope from the PDF: $30–80 per city per scrape including all sub-scores.

## Branded PDF report — 12 sections

1. Executive Summary (composite score, tier, single-sentence verdict)
2. Premium Enrichment Ecosystem Score breakdown (Show Formula drawers)
3. Market Absorption Analysis — sellout rates, time-to-sellout curve (when available), week-level evidence table
4. Pricing Analysis — distribution chart, median + 75th percentile, comparison to Neuron Garage target pricing
5. Scaled Operator Analysis — operator list with overlap classifications + site counts
6. Enrichment Diversity Analysis — category breakdown
7. Market Depth Analysis — provider count vs peer cities
8. Market Balance Index — supply/demand context
9. Market Strengths
10. Market Risks
11. SWOT Summary
12. Methodology Appendix — scrape dates, sample sizes, confidence levels, evidence URL index

## Validation plan

### Internal anchors (Neuron Garage history)

| Location | Market | Site | Outcome | Validation use |
|---|---|---|---|---|
| Trinity (Westlake) | Austin | Trinity Episcopal | Strong & growing (101 campers/wk in 2025) | Positive anchor |
| Wayside (Eden Park) | Austin | Wayside: Eden Park Academy | Successful (63 campers/wk in 2025 after relocation) | Positive anchor |
| St. Francis | Austin | St. Francis School | Operating | Positive anchor |
| Magellan → St. Francis | Austin | Relocated 2025 | Enrollment fell 65 → 50 on relocation | Site-sensitivity test |
| **LeafSpring (2023)** | **Austin** | **Daycare facility, far from customer base** | **Closed after 27 avg campers/wk** | **Negative anchor — critical** |
| Telluride | Telluride | — | Operating | Positive anchor in a small market |

**LeafSpring is the most important data point in the validation set.** It is the only labeled failure case. FDD narrative attributes the failure to commute distance from the established customer base — exactly what a properly tuned Feature 1B should detect. **The test: does Feature 1B score LeafSpring materially lower than Trinity? If not, the weights need rework before broad rollout.**

### External proxies (Year 1)

Score 5–10 metros where Galileo, Steve & Kate's, or comparable premium STEM operators have flagship multi-site presence for 5+ years: **Bay Area suburbs, Seattle Eastside, North Dallas, Northern Virginia, Boston metro.** Proxy successes for "premium STEM camps work here." If Feature 1A puts them in the top quartile of our shortlist, the model is directionally calibrated. Costs nothing additional once the engine is built.

## Acceptance criteria

- All six sub-scores computed for every city in the 25–50 shortlist, with `+` signs intact in the composite formula and stored values matching the published formula to 2 decimal places.
- Every score traces to a source URL + captured screenshot (audit trail).
- Confidence < 0.7 weeks land in the human-QA queue UI; correction propagates back to the score.
- LeafSpring scores in the bottom quartile of validation anchors. External proxy metros (Bay Area, Seattle Eastside, North Dallas, NoVA, Boston) land in the top quartile of the shortlist.
- One calibrated number everywhere: city table cell, popover, selected-market panel, compare modal, PDF — all read from the same recomputed helper.
- Branded 12-section PDF generates from the city detail surface in < 30 seconds.
- Sliders + "Show Formula" drawers function per v1.0 doctrine.

## Out of scope

- Predicting whether a specific Neuron Garage location will succeed (franchisee quality, sales, marketing, execution all dominate market signal at the location level).
- Running Feature 1A on hundreds of cities. Tier 2 is shortlist-only.
- Modeling premium camp capacity (number of seats per provider) — Market Balance Index uses a Coverage Ratio that avoids capacity modeling.
- Hitting underlying registration-platform APIs (Sawyer, CampMinder). Firecrawl with JS render wait is the v1 path; API integration is a v2 optimization only if cost requires it.

---

# Item 2 — Site Analysis Engine (Feature 1B) [1.0]

## Question it answers

How attractive is this specific school location?

## Primary output

Site Opportunity Score (0–100) per candidate site, with **side-by-side comparison view supporting up to 4 candidate sites** and a branded per-site PDF report.

## Owner split

- **Manus** — drive-time isochrone computation (Mapbox or HERE Maps API), Census ACS pulls inside each isochrone, NCES school data, score computation.
- **Lovable** — input form (school name + address required; school type + enrollment optional), comparison UI for up to 4 sites, isochrone map rendering, branded PDF report generator.

## Inputs

**Required:** School Name, School Address
**Optional:** School Type, Enrollment

## Composite formula

```text
Site Opportunity Score =
    0.25 × School Profile Score
  + 0.25 × Neighborhood Affluence Score
  + 0.20 × Family Density Score
  + 0.15 × School Ecosystem Score
  + 0.15 × Accessibility Score
```

## Sub-score 1 — School Profile (weight 0.25)

**Signals:** School Type, Grade Levels Served, School Enrollment.

```text
School Profile Score =
    0.50 × school_type_factor
        (Private elementary = 100,
         Public elementary  = 70,
         Charter elementary = 75,
         Montessori         = 85,
         Other K-8          = 50,
         Other              = 30)
  + 0.25 × normalize(Enrollment, range 150–800)
  + 0.25 × grade_alignment_factor
        (K-5 or K-6      = 100,
         K-8             = 80,
         Pre-K through 5 = 95,
         Other           = 50)
```

**Rationale:** All three operating Neuron Garage locations in the FDD are at private elementary schools. School type carries the strongest weight because the FDD evidence is consistent on this point.

## Sub-score 2 — Neighborhood Affluence (weight 0.25)

**Analysis radius:** 10-minute AND 15-minute drive-time isochrones.

**Signals:** Median household income, % HH above $150k, % dual-income HH — measured at census-tract level within each isochrone.

```text
Neighborhood Affluence Score =
    0.40 × normalize(Median HHI 10min, range $80k–$200k)
  + 0.35 × normalize(% HH above $150k, range 10%–50%)
  + 0.25 × normalize(% Dual-Income HH, range 40%–80%)
```

The 10-minute isochrone is weighted 60% and the 15-minute 40% in the underlying normalization, because **closer families are materially more likely to enroll.**

**Data sources:** Census ACS (already in stack via v1.0), drive-time isochrones from Mapbox or HERE Maps API.

## Sub-score 3 — Family Density (weight 0.20)

**Signals:** Families with children ages 5–12, total children ages 5–12, within 10-min and 15-min drive time.

```text
Family Density Score =
    0.50 × normalize(Children 5–12 within 10min, range 1,000–15,000)
  + 0.30 × normalize(Children 5–12 within 15min, range 3,000–40,000)
  + 0.20 × normalize(Families with kids 5–12 within 10min, range 500–8,000)
```

## Sub-score 4 — School Ecosystem (weight 0.15)

**Signals:** Elementary school count, private school count, nearby student population — within 15-minute drive.

```text
School Ecosystem Score =
    0.40 × normalize(Elementary school count, range 3–25)
  + 0.30 × normalize(Private school count, range 1–10)
  + 0.30 × normalize(Total nearby student pop, range 2,000–25,000)
```

More nearby schools = more channels to reach families through promotional partnerships.

## Sub-score 5 — Accessibility (weight 0.15)

**Signals:** Distance to major road, distance to highway, drive-time reach population.

```text
Accessibility Score =
    0.30 × accessibility_factor(distance to major road)
        (< 0.5 mi = 100, 0.5–1 mi = 80, 1–2 mi = 60, > 2 mi = 30)
  + 0.30 × accessibility_factor(distance to highway)
        (< 2 mi = 100, 2–4 mi = 80, 4–7 mi = 50, > 7 mi = 30)
  + 0.40 × normalize(Population reachable within 15min, range 50k–500k)
```

## Branded PDF report — per-site sections

1. Executive Summary — Site Opportunity Score, recommendation, one-sentence verdict
2. School Profile Analysis
3. Neighborhood Affluence Analysis (with isochrone maps)
4. Family Density Analysis
5. School Ecosystem Analysis
6. Accessibility Analysis
7. Strengths
8. Risks
9. Opportunities
10. Recommendations

Side-by-side comparison view supports up to 4 candidate sites.

## Inputs / data sources

- Mapbox or HERE Maps API (drive-time isochrones) — pick one in execution-plan ticket
- Census ACS (already wired)
- NCES school data (already in stack)
- Provider's own NG location history for validation anchors

## Cost envelope

Tier 3 — on-demand per site. Isochrone + ACS lookups are cheap; no per-city floor.

## Acceptance criteria

- Form accepts school name + address (required); enrollment + school type optional.
- Site Opportunity Score computed within 10 seconds of submit.
- Up to 4 candidate sites compared side-by-side in one view.
- Isochrone maps render in the PDF.
- **LeafSpring scores materially lower than Trinity** when both are run through Feature 1B. This is the calibration gate — if it fails, weights are reworked before rollout.
- Per-site PDF generates from the site detail surface in < 20 seconds.

## Out of scope

- Predicting franchisee/operator success — same scope rule as Feature 1A.
- Lease economics, build-out cost, regulatory checks — facility selection inputs that sit outside Module 1.
- More than 4 sites in a single comparison.

---

# Item 3 — Candidate Pipeline 1.5 [1.5]

## Question it answers

How do we make the existing Candidate Pipeline easier to operate end-to-end (intake, scoring, stage gates) and cleaner inside each candidate's detail view?

## Primary output

Upgraded Candidate Pipeline UI in the existing app, with a redesigned "Notes & Activity" tab on the candidate detail view (per Brett's call: *"upgrade Notes & Activity with the Google Form"* and *"that'll be one of the first things we do — 1.1 candidate pipeline upgrade Notes and Activity with Google Form"*).

## Owner split

Lovable.

## Inputs / scope (from Brett's sketch + transcript)

- Replace / upgrade the "Notes & Activity" tab inside the candidate detail (e.g. Adria's detail page) with a structured form-driven activity capture. Brett's framing: take a Google Form, hand it to Lovable, let it build the form + storage + display.
- Cleaner stage gates (manual override exists but must be explicit, as in current Qualification tab behavior).
- Smarter scoring inputs (more granular criteria).
- Better tie to candidate-facing form (Item 4) when that ships.

## Composite formula or success criteria

**TBD — Brett to fill.** No formula specified in sources. Item 3 is a UX/workflow upgrade, not a new scoring composite, but the smarter scoring inputs Brett mentioned need a written spec.

## Cost envelope

**TBD — Brett to fill.** Internal Lovable work only; no new data vendors expected.

## Acceptance criteria

**TBD — Brett to fill** beyond the one anchor: the Notes & Activity tab is replaced by a form-driven version that reproduces what Brett demos via a Google Form during the architecture phase.

## Out of scope

- Candidate-facing UX. That's Item 4.

---

# Item 4 — Candidate-Facing Form & Page (new login) [1.0]

## Question it answers

How does an external candidate fill in their own info and progress without an internal team member touching the keyboard?

## Primary output

A new candidate-facing page inside the same Lovable app, with **a separate login (different auth surface from the internal team's login)**. Candidate fills a form, that data flows into the internal Candidate Pipeline (Item 3).

## Owner split

Lovable.

## Inputs / scope (from transcript, May 29)

- Same app (`neuron-garage-franchise`) but a candidate-facing surface, not internal.
- Candidate auth is separate from the internal team auth (Skyler / Sam / Kaylie / Brett / Haseeb are internal; candidates are external).
- Brett's path-of-least-resistance prescription: build the form in Google Forms first, then hand the form spec to Lovable to re-implement.

## Composite formula or success criteria

Not applicable — not a scoring feature.

## Cost envelope

**TBD — Brett to fill.** Lovable work only.

## Acceptance criteria

**TBD — Brett to fill.** Anchors from the call:
- New page is candidate-facing.
- Candidate has their own login (separate from internal team).
- Form submission lands in the internal Candidate Pipeline.

## Out of scope

- Public marketing pages. This is post-application, gated by login.

---

# Item 5 — Teacher Search 1.5 [1.5]

## Question it answers

How do we tighten Teacher Search sourcing, dedupe, Fit Score, and the back-end loop into SmartLead?

## Primary output

Upgrade to existing Teacher Search surface and underlying data flows.

## Owner split

Lovable, with Manus contributing if heavy re-extraction or refinement is needed.

## Inputs / scope (from Brett's sketch)

- Tighter sourcing.
- Better dedupe.
- Better Fit Score inputs.
- Deeper SmartLead integration on the back end (paired with Item 6).

## Composite formula or success criteria

**TBD — Brett to fill.** The current Fit Score lives in `src/utils/fitScore.ts` and `src/constants/fitTags.ts`; what Brett wants changed in the inputs needs to land in this section before build can start.

## Cost envelope

**TBD — Brett to fill.**

## Acceptance criteria

**TBD — Brett to fill.**

## Out of scope

- Anything candidate-pipeline-facing (Items 3 and 4 cover that).

---

# Item 6 — SmartLead / Email Outreach 1.5 [1.5]

## Question it answers

How do we make SmartLead's outbound loop closed-loop and observable inside the platform?

## Primary output

Upgrade to existing SmartLead/Email Outreach surface and the integration with Teacher Search.

## Owner split

Lovable.

## Inputs / scope (from Brett's sketch)

- Reply categorization.
- Campaign-level analytics.
- Inbox health.
- Tighter loop back into Teacher Search.

## Composite formula or success criteria

**TBD — Brett to fill.** Reply categorization taxonomy already partially exists in `src/lib/replyCategories.ts`; Brett needs to confirm the v1.5 categories.

## Cost envelope

**TBD — Brett to fill.** SmartLead API costs already in place.

## Acceptance criteria

**TBD — Brett to fill.**

## Out of scope

- Switching away from SmartLead as the underlying ESP.

---

# Item 7 — Mailboxes (sending health) [1.0]

## Question it answers

Are the mailboxes that send Item 6's campaigns warmed up, healthy, and deliverable?

## Primary output

A new Mailboxes operational surface (sending inbox health, warmup state, deliverability signals).

## Owner split

Lovable.

## Inputs / scope (from Brett's sketch)

- Sending inbox health.
- Warmup state.
- Deliverability signals.

## Composite formula or success criteria

**TBD — Brett to fill.** Specific health metrics, warmup states, and pass/fail thresholds need to be specified.

## Cost envelope

**TBD — Brett to fill.** Likely depends on whether a third-party warmup/health vendor (e.g. SmartLead's own warmup, or a separate tool) is wired in.

## Acceptance criteria

**TBD — Brett to fill.**

## Out of scope

- The ESP send pipeline itself (lives inside Item 6).

---

# Item 8 — Video Training / Onboarding Module [1.0]

## Question it answers

How do new Neuron Garage franchisees and staff get trained consistently using the standards manual, curriculum guidebook, and live camp footage?

## Primary output

A training/onboarding module inside the platform that surfaces the standards manual, curriculum, generated outlines/scripts, and (once shot) live camp footage.

## Owner split

- **Sam's team** — produces source material. The 300-page standards manual + curriculum guidebook + old training scripts have already been uploaded into an AI tool that auto-generated outlines and scripts. A videographer is shooting the live camps (Austin x3, Telluride x1, Florida starting later) for footage.
- **Lovable** — builds the in-app module that hosts and surfaces it.

## Inputs / scope (from transcript)

- Standards manual (~300 pages, already uploaded).
- Curriculum guidebook.
- Old training scripts.
- AI-generated outlines + scripts.
- Live camp footage (shot starting Monday after May 29).

## Composite formula or success criteria

Not applicable — content/UX module, not a scoring feature.

## Cost envelope

**TBD — Brett + Sam to fill.** Hosting (likely existing Supabase Storage). Production cost is Sam's side.

## Acceptance criteria

**TBD — Brett + Sam to fill.** Confirm: in-app module vs separate site, who can access it, gating by role (franchisee vs staff vs internal).

## Out of scope

- Producing the video itself. That's Sam's team.

---

# Item 9 — 4th Manus app: Market Saturation / CSI Index upgrade [1.0]

## Question it answers

What's the saturation / Customer Saturation Index for a market — as a stand-alone Manus refinement app feeding the platform?

## Primary output

A fourth Manus app (in addition to City Search, Competitive Landscape, Market Validation). Output feeds the Lovable display layer.

## Owner split

- **Manus** — builds the app (Brett: *"it only takes a couple of hours to build a Manus app"*).
- **Lovable** — consumes the refined CSI output, displays it, exposes Ask-AI on it.

## Relationship to Feature 1A's Market Balance Index

Partially overlapping but **Sam wants this stand-alone**, not folded into Market Balance Index. Brett on the call: *"We have the Manus app for market saturation CSI index, so it's probably an upgrade to the Manus app to the CSI index."*

## Inputs / scope

**TBD — Brett + Sam to fill.** The PDF's Market Balance Index uses Coverage Ratio (affluent dual-income families ÷ premium provider count). The stand-alone CSI app may use a different or richer signal — needs to be specified before build.

## Composite formula or success criteria

**TBD — Brett + Sam to fill.**

## Cost envelope

**TBD — Brett + Sam to fill.** Manus app cost is small per Brett ("a couple of hours to build"), token cost ongoing.

## Acceptance criteria

**TBD — Brett + Sam to fill.**

## Out of scope

- Folding CSI into Feature 1A. Decision on the call: keep it stand-alone.

---

# Cost-control strategy (reaffirmed from PDF)

| Tier | Module | Run on | Cost envelope |
|---|---|---|---|
| Tier 1 | City Search (v1.0) | Hundreds of cities | Inexpensive federal data, pennies per city |
| Tier 2 | Market Validation Engine (1A) | Shortlist of 25–50 cities | $30–80 per city per scrape; $400–750/year for absorption cadence on a 25-city shortlist |
| Tier 3 | Site Analysis Engine (1B) | On-demand per site | Low volume, isochrones and ACS lookups are cheap |

Items 3–9 cost envelopes need to land in this SOW before lock.

---

# Key goal (from PDF)

> The objective is not to predict success. The objective is to provide a practical, evidence-based framework that helps Neuron Garage identify attractive markets and attractive facility locations — while remaining simple, explainable, auditable, and cost-effective to maintain.

---

# What's left to do before this SOW is "locked"

1. Brett fills the `**TBD — Brett to fill**` sections in items 3, 5, 6, 7.
2. Brett + Sam fill the `**TBD — Brett + Sam to fill**` sections in items 8 and 9.
3. Sam confirms his Module 1 spec hasn't moved since the v2 PDF (May 2026).
4. Brett confirms the Item 4 (candidate-facing) auth model (which auth provider/surface).
5. Brett or Haseeb says explicitly: **"SOW is locked, start build."**

Until then, the execution plan (`phase-2-execution-plan.md`) only has real tickets for items 1, 2, and the Item 3 anchor (Notes & Activity tab). Everything else is parked as "blocked: awaiting Brett spec."
