> **AI summary of `neuron-garage-module1-enhancements-v2.pdf` (same folder). For exact formulas, numbers, and wording, parse the PDF directly — do not trust this file.**

# Sam's v2 PDF — Plain-English Breakdown

> Source file: `neuron-garage-module1-enhancements-v2.pdf`, v2.0, May 2026.
> Scope: Module 1 enhancements only — Feature 1A and Feature 1B. Does NOT cover Candidate Pipeline 1.5, Teacher Search 1.5, SmartLead 1.5, Video Training, or the 4th Manus CSI app.

## The big architectural call

Sam splits what Brett called "Market Validation layer" into **two distinct features** running on the 25–50 city shortlist from v1.0:

- **Feature 1A — Market Validation Engine** — answers "Is this a validated premium enrichment market with active, paying demand?" (city level)
- **Feature 1B — Site Analysis Engine** — answers "How attractive is this specific school location?" (address level)

Both are built as separate features, asked at different points in the funnel.

## Product philosophy (Sam's stated principles)

1. **Observable signals over theoretical signals** — measure what providers and families actually do, not what demographics suggest they might.
2. **Auditable data** — every score traces to a source URL + screenshot.
3. **Measure supply AND demand** — v1.0 measured eligibility only.
4. **Simplicity over complexity** — anything Haseeb, future devs, and franchisees can't understand doesn't ship.

Explicit non-goal: Feature 1A is **not** trying to predict whether a specific location will succeed. That depends on franchisee quality, execution, marketing, etc. — out of scope for Module 1.

## Feature 1A — Market Validation Engine

### Primary output
A **branded PDF report** shareable internally or with prospective franchisees.

### Composite: Premium Enrichment Ecosystem Score (0–100)

```
0.20 × Pricing Acceptance Score
+ 0.25 × Market Absorption Score   ← NEW, dominant demand-side signal
+ 0.20 × Scaled Operator Score
+ 0.10 × Enrichment Diversity Score
+ 0.10 × Market Depth Score
+ 0.15 × Market Balance Index
```

### The single biggest change from v1 thinking
**Market Absorption** is the dominant weight (25%). Without it, every other score measures supply (providers, prices, categories). A market where premium camps **sell out by March** is not the same market as one with leftover inventory in May — even if every other metric matches. Absorption tells us which is which.

### Sub-score breakdowns
1. **Pricing Acceptance (20%)** — median price, 75th percentile price, % of providers at $500+/week. Distribution shape, not a single threshold.
2. **Market Absorption (25%)** — week-level registration state across premium providers. Signals: explicit sellout language ("SOLD OUT", "Full"), waitlist CTAs, closed-registration. Captured via Firecrawl + Gemini Flash extraction. Confidence < 0.7 routes to a **human QA queue** (page screenshot + 4-button correction UI).
3. **Scaled Operator (20%)** — count + footprint of national premium operators (Galileo, Steve & Kate's, Camp Invention, Snapology, Code Ninjas, iD Tech, Mad Science, Engineering For Kids, etc.).
4. **Enrichment Diversity (10%)** — distinct enrichment categories with ≥1 premium provider.
5. **Market Depth (10%)** — premium provider count vs peer cities.
6. **Market Balance Index (15%)** — Coverage Ratio normalized; banded ≥350 Underserved / 200–349 Balanced / 100–199 Competitive / <100 Saturated.

### Premium provider definition
Two-stage: collect the **full** camp universe per shortlisted city, then classify each as Premium (≥$400/week + enrichment-positioned + not childcare) / Mid ($250–$399) / Below.

### Data collection cadence + cost
- Firecrawl scrape ~5x/year per active city ($3–6 per scrape per city)
- Gemini Flash extraction (~$0.10 per scrape)
- Apify Maps shared with other scores
- **~$15–30/city/year**; for 25 shortlisted cities: **$400–750/year total**
- Human QA: ~1–2 hours per scrape cycle across the shortlist

### PDF report structure (12 sections)
Exec summary → Premium provider universe → Pricing analysis → Market absorption analysis → Scaled operator analysis → Enrichment diversity → Market depth → Market balance → Strengths → Risks → SWOT → Methodology appendix (with evidence URLs, scrape dates, confidence levels).

## Feature 1B — Site Analysis Engine

### Inputs
- **Required:** School Name, School Address
- **Optional:** School Type, Enrollment

### Primary output
**Site Opportunity Score (0–100)** + side-by-side comparison view of up to 4 candidate sites.

### Sub-scores (paraphrased from PDF)
- **Neighborhood Affluence** — median HHI, % HH above $150k, % dual-income, weighted by drive-time isochrones (10-min isochrone weighted 60%, 15-min weighted 40%).
- **Family Density** — children 5–12 within 10-min and 15-min drive time.
- **School Ecosystem** — quality + density of surrounding schools.
- **Accessibility** — drive-time, parking, road network.

### Data sources
Census ACS (already in stack from v1.0) + drive-time isochrones from **Mapbox** or **HERE Maps API** + the standard NCES school data.

### Why isochrones (and not 10-mile radius)
A 10-min isochrone reflects actual commute reality; closer families are materially more likely to enroll. The PDF report includes isochrone maps.

## Tiered cost model (explicitly reaffirmed in the PDF)

| Tier | Module | Runs on | Cost envelope |
|---|---|---|---|
| Tier 1 | City Search (v1.0) | Hundreds of cities | Pennies/city (federal data) |
| Tier 2 | Market Validation (1A) | 25–50 city shortlist | $30–80/city/scrape; $400–750/yr total |
| Tier 3 | Site Analysis (1B) | On-demand per site | Cheap (isochrone + ACS) |

## Validation plan

1. **Internal anchors** — score against known Neuron Garage locations: Trinity (Westlake, Austin), other Austin sites, Telluride, the one historical closure. Model should rank successes higher than the closure.
2. **External proxies (Year 1)** — score 5–10 metros where premium STEM operators (Galileo, Steve & Kate's) have flagship multi-site presence for 5+ years: **Bay Area suburbs, Seattle Eastside, North Dallas, Northern Virginia, Boston metro.** If the model puts these in the top quartile of our shortlist, it's directionally calibrated.

## What's in this PDF vs Brett's sketch — gap analysis

**Adds detail to Brett's "Market Validation 1.0":**
- Splits into two features (1A city + 1B site)
- Specifies Market Absorption as the dominant signal
- Replaces 10-mile radius with drive-time isochrones
- Adds human QA queue
- Adds validation plan

**NOT covered in this PDF (Brett's other items):**
- Candidate Pipeline 1.5
- Teacher Search 1.5
- SmartLead 1.5
- Mailboxes
- Video Training module (added on the call)
- 4th Manus CSI app (Market Balance Index partially overlaps but Sam wants stand-alone)

The Phase 2 SOW merge must cover the gaps above.
