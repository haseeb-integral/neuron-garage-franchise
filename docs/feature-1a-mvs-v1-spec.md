# Feature 1A Market Validation Spec doc by Lovable

# 

# **Feature 1A — Market Validation Engine**

## **v1.0 Spec (Lovable internal)**

**Status:** Spec only. Build plan to follow. **Source of truth:** This chat \+ MVS Methodology doc. **Naming:** MVS (Market Validation Score). Do not surface PEES anywhere in the app or PDF.

---

## **1\. What this feature does**

Takes a city from the shortlist and produces a **single composite score (MVS, 0–100)** that answers: *"Is this a validated premium enrichment market with active, paying demand?"*

Output surfaces:

* MVS number on the city row in the shortlist table.  
* 6 sub-score breakdown in the city detail panel.  
* Premium provider table (real names, prices, weekly sellout status).  
* Branded PDF Market Brief.  
* Every score traces to a source URL and a stored screenshot.

Not in scope: predicting any individual Neuron Garage location's success. Site-level work lives in Feature 1B.

---

## **2\. v1.0 scope guardrails (the "easy route")**

| Decision | v1.0 | Deferred to |
| :---- | :---- | :---- |
| Discovery source | **Sawyer only** | ActivityHero v1.1, Apify v1.1 (next week) |
| Scheduling | **Manual trigger** ("Run Pipeline" button per city) | Inngest/Trigger.dev post-client-meeting |
| Cities in scope | **7 Tier A cities \+ Austin** (calibration) | 14 Tier B cities stay on Sample Data badge |
| Scrape cadence | **1 scrape per city per run** | 5-scrape Jan/Feb/Mar/Apr/May in v2 |
| Market Absorption formula | **Sellout Rate only** (carries full weight) | Time-to-Sellout \+ YoY Velocity in v2 |
| Normalization | **Fixed reference ranges** (see §5) | Across-shortlist normalization once ≥20 cities have live data |
| QA queue | **In-app review UI**, confidence \< 0.7 routes there | — |

**Tier A cities (v1.0 launch set):** New York NY, Houston TX, Chicago IL, Boston MA, San Antonio TX, Philadelphia PA, Los Angeles CA. **Calibration test city (run first):** Austin TX.

---

## **3\. MVS composite — unchanged from methodology**

MVS \= 0.20 × Pricing Acceptance  
    \+ 0.25 × Market Absorption          ← dominant demand signal  
    \+ 0.20 × Scaled Operator  
    \+ 0.10 × Enrichment Diversity  
    \+ 0.10 × Market Depth  
    \+ 0.15 × Market Balance Index

Rounded to one decimal place. All sub-scores 0–100. Weights exposed as sliders with Show Formula drawers per v1.0 doctrine.

**SOW divergence flag (for client meeting, not for v1.0 build):** SOW v2.2 says Market Balance sits *next to* the composite, not inside it. v1.0 follows the methodology (inside, 15%) because the demo UI already renders it that way and "easy route" means no UI rework. We surface this as an open question for Sam.

---

## **4\. Pipeline — 5 stages**

One manual run per city. Stages 1–4 write to Supabase, Stage 5 reads from Supabase and computes scores via the **shared MVS helper** (Brett's "one calibrated number everywhere" rule — table, panel, compare modal, PDF all read from this helper, never from stored scores).

Stage 1 → Sawyer search scrape         → discovery \+ pricing \+ listing URLs  
Stage 2 → Premium tier classification  → filter to Premium (≥$400/wk, eligible category)  
Stage 3 → Registration page extraction → week-level status \+ screenshots  
Stage 4 → Census ACS pull              → Market Balance \+ Operator denominators  
Stage 5 → Score calculation            → 6 sub-scores → MVS composite

### **Stage 1 — Sawyer discovery (Firecrawl)**

* **Tool:** Firecrawl, JS-render wait on, full-page screenshot on, rotating proxies on.  
* **URL pattern:** https://www.sawyertools.com/camps?location={city} (confirm exact pattern on Austin run).  
* **Extract per provider:** name, weekly price, category (raw), individual Sawyer listing URL, site count in metro, platform \= "sawyer".  
* **Persist:** providers table \+ screenshot in Supabase Storage keyed by scrape date \+ URL.

### **Stage 2 — Premium tier classification (Gemini 2.0 Flash via Lovable AI Gateway)**

* Input: every row from Stage 1\.  
* Tag each provider: **Premium / Mid / Budget / Community** (4-tier per methodology).  
* Only Premium flows into score calc. Other tiers persist for pricing-ladder context.  
* Eligible categories for Premium: STEM, Robotics, Coding, Science, Maker, Art, Theater, Music, Academic Enrichment, Debate, Chess, Entrepreneurship.

### **Stage 3 — Registration page extraction (Firecrawl \+ Gemini)**

* For each Premium provider's Sawyer listing URL, fetch the page (JS-render wait), screenshot it, then Gemini extracts a strict JSON of week records.  
* **Week status enum (5 values only):** sold\_out | waitlist | low\_availability | open | unknown.  
* **JSON schema per week:** week\_label, theme, price, age\_range, status, status\_evidence, confidence (0–1).  
* **Confidence gate:** ≥0.7 → write to weeks table; \<0.7 → write to weeks AND insert into qa\_queue.  
* **Low-confidence city badge:** if \>20% of Premium providers have no public registration page, city gets a "Low Confidence" badge on the row.

### **Stage 4 — Census ACS pull (reused pipeline from v1.0)**

* Pulls: dual-income households with HH income ≥$150k and children ages 5–12 → "Affluent Dual-Income Family Count" (denominator for Score 6).  
* Children ages 5–12 → denominator for Direct Competitor Load in Score 3\.

### **Stage 5 — Score calculation**

See §5. All math lives in **one helper** (e.g. src/lib/mvs/computeMvs.ts). Every UI surface reads from it. No stored composite scores on the row — always recomputed.

---

## **5\. Sub-score formulas \+ v1.0 reference ranges**

Normalization in v1.0 is **min-max against fixed reference ranges** (capped 0–100), not across the live 7-city set. Ranges below come from the methodology doc.

### **Score 1 — Pricing Acceptance (20%)**

0.40 × normalize(median weekly price,       range $300–$700)  
0.40 × normalize(75th-percentile price,     range $400–$800)  
0.20 × (% Premium providers at ≥ $500/week,  0–100)

### **Score 2 — Market Absorption (25%) — v1.0 \= Sellout Rate only**

Sellout Rate            \= (sold\_out weeks \+ waitlist weeks) ÷ total weeks scraped  
Market Absorption Score \= normalize(Sellout Rate, range 0%–80%)

Time-to-Sellout and YoY Velocity display in the drawer as "Year 2 signal — not yet computed."

### **Score 3 — Scaled Operator (20%)**

Operator Validation    \= count of distinct watchlist operators present (cap 0–8)  
Direct Competitor Load \= Σ site counts for operators tagged 'direct'  
                         per 10,000 kids ages 5–12

Scaled Operator Score \=  
  0.65 × normalize(Operator Validation, 0–8)  
\+ 0.35 × (100 − normalize(Direct Competitor Load, 0–5 per 10k))

Operator watchlist (seed, editable in UI): Galileo, Steve & Kate's, Camp Invention, Snapology, Code Ninjas, iD Tech, Mad Science, Engineering For Kids, Bricks 4 Kidz, Kids Inventor Lab, Maker Kids, theCoderSchool, Wiz Kidz, Sylvan summer, Mathnasium summer. Each tagged default direct/adjacent/distant, editable per city.

**SOW divergence flag:** SOW v2.2 adds a "Years in City" signal we don't have a source for in v1.0. Deferred to v1.1 with the Apify add.

### **Score 4 — Enrichment Diversity (10%)**

Category Count  \= distinct eligible categories with ≥1 premium provider  
Diversity Ratio \= Category Count ÷ Premium Provider Count

Score \= 0.70 × normalize(Category Count, 2–10)  
      \+ 0.30 × normalize(Diversity Ratio, 0.1–0.6)

### **Score 5 — Market Depth (10%)**

Market Depth Score \= normalize(Premium Provider Count, 4–40)

### **Score 6 — Market Balance Index (15%)**

Coverage Ratio \= Affluent Dual-Income Family Count ÷ Premium Provider Count  
Score          \= normalize(Coverage Ratio, 50–500)

Tier labels:  
  ≥ 350  Underserved  
  200–349 Balanced  
  100–199 Competitive  
  \< 100   Saturated

---

## **6\. Data model (Supabase)**

| Table | Key fields |
| :---- | :---- |
| mvs\_providers | provider\_id, provider\_name, city, state, weekly\_price, category\_raw, category\_classified, tier, listing\_url, site\_count, platform, scraped\_at, screenshot\_url |
| mvs\_weeks | week\_id, provider\_id, city, state, scrape\_date, week\_label, theme, price, age\_range, status, status\_evidence, confidence, screenshot\_url, flagged\_for\_qa |
| mvs\_qa\_queue | week\_id, provider\_id, screenshot\_url, gemini\_classification, confidence, corrected\_status, reviewed\_by, reviewed\_at |
| mvs\_operator\_watchlist | operator\_name, default\_overlap, notes |
| mvs\_city\_overlap\_overrides | city, state, operator\_name, overlap (per-city tag overrides) |
| mvs\_pipeline\_runs | run\_id, city, state, triggered\_by, started\_at, completed\_at, status, error, provider\_count, week\_count, qa\_flagged\_count |

Tables are namespaced mvs\_\* so they don't collide with v1.0 City Search tables. Standard RLS \+ GRANTs per project conventions. Screenshots in Supabase Storage bucket mvs-screenshots.

**No mvs\_city\_scores table.** Composite \+ sub-scores are always recomputed from mvs\_providers \+ mvs\_weeks \+ ACS via the shared helper. This is Brett's "one calibrated number everywhere" rule applied to 1A.

---

## **7\. UI behavior (what changes on existing demo surfaces)**

* **City row:** MVS number from the shared helper. Badge: Live (Tier A) or Sample Data (Tier B) or Low Confidence (\>20% missing reg pages).  
* **City detail panel:** 6 sub-score cards, each with Show Formula drawer. Drawer shows the formula, the inputs, the normalize range used, and the resulting normalized 0–100 value.  
* **Premium provider table:** real rows from mvs\_providers filtered to tier \= Premium for the city, with weekly price and a status pill rolled up from mvs\_weeks.  
* **"Run Pipeline" button:** manual trigger per city (admin only). Disabled while a run is in flight. Surfaces mvs\_pipeline\_runs status.  
* **QA Queue page:** lists weeks with flagged\_for\_qa \= true, side-by-side screenshot \+ Gemini classification \+ correction form.  
* **Weight sliders:** persist per user, reset-to-defaults button. Sliders recompute the composite via the same helper, no separate code path.  
* **PDF Market Brief:** 12 sections per SOW Addendum A — Exec Summary, MVS Composite, Market Balance Index, Pricing Analysis, Enrichment Diversity, Scaled Operator, Market Depth, Market Strengths, Market Risks, SWOT, Recommendation, Sources & Screenshots appendix. Generates in \<30s.

---

## **8\. Edge functions (server-side)**

| Function | Purpose | Secrets |
| :---- | :---- | :---- |
| mvs-run-pipeline | Orchestrates Stages 1–4 for a single city | FIRECRAWL\_API\_KEY, LOVABLE\_API\_KEY |
| mvs-extract-providers | Stage 1 \+ Stage 2 | FIRECRAWL\_API\_KEY, LOVABLE\_API\_KEY |
| mvs-extract-weeks | Stage 3 (Firecrawl \+ Gemini) | FIRECRAWL\_API\_KEY, LOVABLE\_API\_KEY |
| mvs-acs-pull | Stage 4 (reuse v1.0 ACS pipeline) | existing |
| mvs-generate-brief | Server-side PDF generation | none beyond Supabase |

Client never holds Firecrawl or Lovable AI Gateway keys.

---

## **9\. Calibration gates (must pass before client meeting)**

1. **Austin run produces clean output at every stage** (smoke test before opening Tier A).  
2. **Boston MA lands in the top quartile** of the live Tier A set (proxy for SOW's full top-quartile list, which we can't fully test until v1.1 expands coverage).  
3. **Every Tier A city row** shows: live MVS, all 6 sub-scores with non-null inputs, real provider names, at least one stored screenshot per provider.  
4. **PDF Market Brief** generates in \<30s and every numeric claim links to a source URL or screenshot.  
5. **Slider change** updates the composite on all 5 surfaces (row, panel, compare modal, weight drawer, PDF) using the same helper. Brett's rule.

---

## **10\. Out of scope for v1.0 (write down so we don't drift)**

* ActivityHero, CampBrain, CampMinder discovery.  
* Apify Google Maps discovery.  
* Inngest/Trigger.dev scheduling.  
* Time-to-Sellout and YoY Velocity (need multi-scrape history).  
* Scaled Operator "Years in City" signal.  
* Moving Market Balance outside the composite (open question for Sam).  
* Tier B city pipeline runs (stay on Sample Data badge).  
* Across-shortlist normalization (need ≥20 live cities first).

 