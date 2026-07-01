# Feature 1A Market Validation Spec doc by Lovable

# **Feature 1A — Market Validation Engine**

## **v1.6 Spec (Lovable internal — updated 2026-07-01)**

**Status:** Shipped, evolving. **Source of truth:** This chat + MVS Methodology doc. **Naming:** MVS (Market Validation Score). Do not surface PEES anywhere in the app or PDF.

> **What changed since the original v1.0 spec:** discovery expanded from Sawyer-only to 5 sources; Market Absorption pillar retired; registration-page scraping (Stage 3) retired; per-pillar confidence replaced the global low-confidence badge; Firecrawl cap raised to 50 with per-step sub-caps; freshness rules (0–90 skip / 91–120 prompt / >120 fresh) and soft-fail fallback (`done_stale`) added; cards redesigned to Result → Evidence → Trust; **pricing crawler expanded from 3 steps to 9 steps** (catch-up Google search, marketplace listing reads, relaxed "trusted source" price rule, brand price propagation, directory-first queries, Google AI Overview fallback, manual Verify/Reject/Edit for uncertain prices).

---

## **1. What this feature does**

Takes a city from the shortlist and produces a **single composite score (MVS, 0–100)** that answers: *"Is this a validated premium enrichment market with active, paying demand?"*

Output surfaces:

* MVS number on the city row in the shortlist table.
* 5 sub-score breakdown in the city detail panel (Result / Evidence / Trust layout, with proof popovers).
* Premium provider table (real names, weekly prices, source chips).
* Branded PDF Market Brief.
* Every score traces to a source URL and (where available) a stored listing-page screenshot. Screenshots are of the discovery listing page (Sawyer, Yelp, Google, etc.), shared by all providers found on that page. We do not save per-provider website screenshots or raw HTML.

Not in scope: predicting any individual Neuron Garage location's success. Site-level work lives in Feature 1B.

---

## **2. v1.6 scope (current)**

| Decision | Current behavior | Deferred |
| :---- | :---- | :---- |
| Discovery sources | **Sawyer + ActivityHero + Google Maps + Yelp + Google Search** (5 sources) | More platforms case-by-case |
| Scheduling | **Manual trigger** ("Run Pipeline" button per city) | Inngest/Trigger.dev post-client-meeting |
| Cities in scope | **Any city** can be added; freshness rules apply uniformly | — |
| Scrape cadence | **1 run per click**, gated by freshness rules below | Multi-scrape history once cadence is automated |
| Freshness rules | **0–90 days: auto-skip (use saved). 91–120: prompt user. >120: fresh crawl. "Force fresh" always overrides.** Backend hard-guard enforces this even if UI is bypassed. | — |
| Soft-fail fallback | If a fresh crawl fails but saved data ≤120 days exists → status `done_stale`, score stays visible, amber banner shown | — |
| Market Absorption | **Removed from composite (weight 0)** | Not planned |
| Registration-page scraping (old Stage 3) | **Retired.** `mvs-extract-weeks` is a no-op shell. No week rows are written. | Not planned |
| Normalization | **Fixed reference ranges** (see §5) | Across-shortlist normalization once ≥20 cities have live data |
| QA queue | **Retired** for the absorption flow. Page shows a retired notice. Per-pillar confidence chips replace the old global QA gate. | — |
| Firecrawl cost cap | **50 calls per run total**, sub-caps: discover ≤25, classify ≤15, extract ≤15 | — |

---

## **3. MVS composite — v1.6**

```
MVS = 0.2667 × Pricing Acceptance
    + 0.2667 × Scaled Operator
    + 0.1333 × Enrichment Diversity
    + 0.1333 × Market Depth
    + 0.2000 × Market Balance Index
```

Rounded to one decimal place. All sub-scores 0–100. Weights exposed as preview sliders per card. Market Absorption removed (weight 0); the remaining five pillars were proportionally re-normalized so the weights still sum to 1.0.

**SOW divergence flag (open question for Sam):** SOW v2.2 says Market Balance sits *next to* the composite, not inside it. We keep it inside at 20% because the demo UI renders it that way.

---

## **4. Pipeline — 4 active stages**

One manual run per city (subject to freshness rules). Stages write to Supabase; the score is recomputed from those rows via the **shared MVS helper** (`src/lib/mvs/computeMvs.ts`) — table row, panel, compare modal, PDF all read from this helper, never from stored composites.

```
Stage 1 → Multi-source discovery       → providers from Sawyer, ActivityHero, Google Maps, Yelp, Google Search
Stage 2 → Premium tier classification  → filter to Premium (≥$400/wk, eligible category)
Stage 3 → Census ACS pull              → Market Balance + Operator denominators
Stage 4 → Score calculation            → 5 sub-scores → MVS composite
```

### Stage 1 — Discovery (Firecrawl + APIs)

* **Tool:** Firecrawl (JS-render on, screenshots on, rotating proxies on) for Sawyer/ActivityHero/Google Search; direct APIs for Google Maps + Yelp where available.
* **Extract per provider:** name, weekly price (if visible), category (raw), listing URL, site count in metro, platform.
* **Persist:** `mvs_providers` row per provider. Where Firecrawl returns a listing-page screenshot (e.g. the Sawyer search-results page), the file is stored once in the private `mvs-screenshots` bucket and its path is written to `screenshot_url` on every provider discovered on that page. Raw HTML is NOT saved. Per-provider website screenshots are NOT captured.
* **Sub-cap:** ≤25 Firecrawl calls in this stage.

#### Pricing crawler — 9 steps (expanded from the original 3)

For each provider found in Stage 1, the pricing sub-crawler runs up to 9 steps. It stops at the first step that produces a valid price. The old crawler (before 2026-06-26) stopped at step 3 and marked most camps as "missing price."

1. **Google Maps lookup** — get name, website, address.
2. **Read the camp's own website** with Firecrawl.
3. **Catch-up Google search** in plain English (e.g. *"Steve & Kate's Camp Austin summer camp tuition price per week 2026"*). *NEW.*
4. **Read marketplace listings** returned by that search — Sawyer, ActivityHero, Yelp, news pages, camp PDFs. *NEW.*
5. **Relaxed price rule** — a dollar number on any trusted source that ties to this camp by name is accepted. The old strict "$ must be in the camp's own markdown" rule is retired. *NEW.*
6. **Guards** — price must be $50–$5,000 per week, weekly cadence, tied to the camp name. Bad prices are dropped with a reason chip. *NEW.*
7. **Save with proof** — clickable source URL, matched query, confidence score. *NEW.*
8. **Tier classify** — Premium / Mid / Budget / Community. *NEW.*
9. **Google AI Overview fallback (Phase B3)** — last resort, reads the Google AI answer box via Apify. Prices found this way are flagged **"Needs human review"** (amber chip); a person must click Verify before they count in the score. *NEW.*

**Related fallbacks that plug into this flow:**
- **B1 — Brand price propagation:** if 3+ sibling locations of the same brand have prices, the median is proposed for unpriced siblings and flagged for human review.
- **B2 — Directory-first queries:** the catch-up search prefers Sawyer/ActivityHero listing URLs when available.
- **B4 — Manual Verify / Reject / Edit:** all uncertain prices surface in the Provider Evidence Review page with quiet chips for auto-kept crawler prices and loud action buttons only for rows that need human review.


### Stage 2 — Premium tier classification (Gemini 2.0 Flash via Lovable AI Gateway)

* Input: every row from Stage 1.
* Tag each provider: **Premium / Mid / Budget / Community**.
* Only Premium flows into score calc. Other tiers persist for pricing-ladder context.
* **Runs in parallel waves of 5** to avoid timeouts (was sequential in v1.0).
* **19 eligible categories for Premium:** STEM, Robotics, Coding, Science, Maker, Art, Theater, Music, Academic Enrichment, Debate, Chess, Entrepreneurship, Dance, Language, Sports, Swim, Gymnastics, Cooking, Outdoor.
* **Sub-cap:** ≤15 Firecrawl calls in this stage.

### Stage 3 — Census ACS pull

* Pulls dual-income households with HH income ≥$150k and children ages 5–12 → "Affluent Dual-Income Family Count" (Score 6 denominator).
* Children ages 5–12 → denominator for Direct Competitor Load in Score 3.

### Stage 4 — Score calculation

See §5. All math lives in one helper. No stored composite scores — always recomputed.

### Retired stage (kept for audit only)

* **Old Stage 3 — Registration-page extraction (`mvs-extract-weeks`):** retired. No week rows written. No registration-page screenshots produced. Function still exists as a no-op shell for backward-compat URLs.

---

## **5. Sub-score formulas + v1.6 reference ranges**

Normalization is **min-max against fixed reference ranges** (capped 0–100). Ranges below come from the methodology doc.

### Score 1 — Pricing Acceptance (26.67%)

```
0.40 × normalize(median weekly price,       range $300–$700)
0.40 × normalize(75th-percentile price,     range $400–$800)
0.20 × (% Premium providers at ≥ $500/week,  0–100)
```

### Score 2 — Market Absorption — RETIRED (weight 0)

> **Deprecated in v1.6.** Removed because sellout-rate scraping was unreliable. Formula preserved below for audit only.

```
Sellout Rate            = (sold_out weeks + waitlist weeks) ÷ total weeks scraped
Market Absorption Score = normalize(Sellout Rate, range 0%–80%)
```

### Score 3 — Scaled Operator (26.67%)

```
Operator Validation    = count of distinct watchlist operators present (cap 0–8)
Direct Competitor Load = Σ site counts for operators tagged 'direct'
                         per 10,000 kids ages 5–12

Scaled Operator Score =
  0.65 × normalize(Operator Validation, 0–8)
+ 0.35 × (100 − normalize(Direct Competitor Load, 0–5 per 10k))
```

Operator watchlist (seed, editable in UI): Galileo, Steve & Kate's, Camp Invention, Snapology, Code Ninjas, iD Tech, Mad Science, Engineering For Kids, Bricks 4 Kidz, Kids Inventor Lab, Maker Kids, theCoderSchool, Wiz Kidz, Sylvan summer, Mathnasium summer.

### Score 4 — Enrichment Diversity (13.33%)

```
Category Count  = distinct eligible categories with ≥1 premium provider (of 19)
Diversity Ratio = Category Count ÷ Premium Provider Count

Score = 0.70 × normalize(Category Count, 2–10)
      + 0.30 × normalize(Diversity Ratio, 0.1–0.6)
```

### Score 5 — Market Depth (13.33%)

```
Market Depth Score = normalize(Premium Provider Count, 4–40)
```

### Score 6 — Market Balance Index (20%)

```
Coverage Ratio = Affluent Dual-Income Family Count ÷ Premium Provider Count
Score          = normalize(Coverage Ratio, 50–500)
```

Tier labels: ≥350 Underserved · 200–349 Balanced · 100–199 Competitive · <100 Saturated.

---

## **6. Data model (Supabase)**

| Table | Status | Key fields |
| :---- | :---- | :---- |
| mvs_providers | Active | provider_id, provider_name, city, state, weekly_price, category_raw, category_classified, tier, listing_url, site_count, platform, scraped_at, screenshot_url |
| mvs_weeks | Retired | (no new writes; legacy rows retained) |
| mvs_qa_queue | Retired | (page shows retired notice; `activeQaCount` filters retired reasons out) |
| mvs_operator_watchlist | Active | operator_name, default_overlap, notes |
| mvs_city_overlap_overrides | Active | city, state, operator_name, overlap |
| mvs_pipeline_runs | Active | run_id, city, state, triggered_by, started_at, finished_at, status, error, provider_count, firecrawl_calls, **fallback_data_date** |

Status values on `mvs_pipeline_runs`: `running`, `done`, `done_stale` (soft-fail fallback in use), `failed_no_data` (no usable saved data within 120d).

**No mvs_city_scores table.** Composite + sub-scores are always recomputed from `mvs_providers` + ACS via the shared helper. Brett's "one calibrated number everywhere" rule.

---

## **7. UI behavior (current)**

* **City row:** MVS number from the shared helper. Status chips: Live, Stale-score amber note (under composite), or red "Failed" pill. "Run" and outlined "Force fresh" buttons per row.
* **Deep-dive cards (5 pillars):** New layout — **Result → Evidence → Trust → Weight preview → Formula/Sources**.
  * Result: plain-English meaning (e.g. "Weak premium pricing") + data-coverage chip.
  * Evidence: key numeric rows, each clickable to open a proof popover with provider-level source data.
  * Trust: per-pillar confidence (e.g. "Medium confidence — 8 of 12 providers had readable prices") with its own reason per card.
  * Weight preview slider: shows "Contributes X.X of 100 to MVS" with live delta, MVS preview only.
  * Collapsibles renamed: "How this score is calculated", "Where the data comes from (N)".
* **Freshness controls:** 0–90 days → auto-skip with toast and persistent amber row badge; 91–120 days → `AlertDialog` prompt "use saved or run fresh"; >120 → fresh crawl. Backend hard-guard enforces same rules. `done_stale` runs use `fallback_data_date` (not `finished_at`) so age math reflects the real data.
* **Known limitations panel** on the page (collapsible) explains what data we don't have.
* **PDF Market Brief:** unchanged in structure — 1-page Exec Summary in v1.0, fuller 12-section brief deferred.

---

## **8. Edge functions (server-side)**

| Function | Status | Purpose | Secrets |
| :---- | :---- | :---- | :---- |
| mvs-run-pipeline | Active | Orchestrates Stages 1–3, enforces freshness pre-check + soft-fail fallback, applies 50-call cap + sub-caps, refuses crawl <90d old unless `forceFresh: true` | FIRECRAWL_API_KEY, LOVABLE_API_KEY |
| mvs-discover-providers | Active | Stage 1 multi-source discovery | FIRECRAWL_API_KEY |
| mvs-classify-tier | Active | Stage 2 — parallel waves of 5 | LOVABLE_API_KEY |
| mvs-enrich-websites | Active | Optional enrichment | FIRECRAWL_API_KEY |
| mvs-extract-weeks | **Retired (no-op)** | Was Stage 3 reg-page extraction | — |
| mvs-acs-pull | Active | Stage 3 ACS pull | existing |
| mvs-refresh-all | Active | Batch wrapper | inherits |

Client never holds Firecrawl or Lovable AI Gateway keys. Every function checks `manager` or `admin` via `user_roles` + `has_role()` before spending a Firecrawl call.

### Phase 3 implementation notes (current)

* **Authorization is enforced in code**, not just `verify_jwt`.
* **Hard per-run cap of 50 Firecrawl calls** on the orchestrator, with sub-caps (discover 25, classify 15, extract 15). Sub-caps fail fast with a clear error rather than letting one step burn the whole budget.
* **Classification is parallel** in waves of 5 (was sequential).
* **Freshness pre-check is shared** via `src/lib/mvs/preCrawlFreshness.ts` and called from both the shortlist table and the deep-dive Run button. Backend re-checks the same rules so a UI bypass cannot cause a crawl.
* **Soft-fail fallback:** if a fresh crawl fails and saved data ≤120d exists, the run finishes as `done_stale` with `fallback_data_date` set; the UI shows an amber banner and the score stays visible.
* **Run traceability:** every invocation opens an `mvs_pipeline_runs` row, updates `firecrawl_calls`, closes with `done` / `done_stale` / `failed_no_data` + `error`.

---

## **9. Calibration gates**

1. **Sample city run produces clean output at every active stage** (smoke test).
2. **Boston MA lands in the top quartile** of the live set.
3. **Every live city row** shows: MVS, all 5 active sub-scores with non-null inputs, real provider names from ≥1 source.
4. **PDF Market Brief** generates in <30s; every numeric claim links to a source URL or screenshot where available.
5. **Slider change** updates the composite on all surfaces (row, panel, compare modal, PDF) using the same helper.
6. **Freshness rules behave end-to-end:** 0–90 skip toast + badge, 91–120 prompt, >120 fresh, force-fresh override — verified in both UI and backend hard-guard.

---

## **10. Out of scope for v1.6 (do not drift)**

* Apify Google Maps actor as a separate discovery source.
* Inngest/Trigger.dev scheduling.
* Time-to-Sellout and YoY Velocity (need multi-scrape history).
* Scaled Operator "Years in City" signal.
* Moving Market Balance outside the composite (open question for Sam).
* Across-shortlist normalization (need ≥20 live cities first).
* Reviving Market Absorption / registration-page scraping.
