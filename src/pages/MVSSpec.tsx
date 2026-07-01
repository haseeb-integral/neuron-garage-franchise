import { FileText, ShieldCheck } from "lucide-react";
import { DocShell, DocCard } from "@/components/DocShell";
import { DownloadMDButton } from "@/components/DownloadMDButton";

// Mirror of docs/feature-1a-mvs-v1-spec.md kept here so the page is self-contained
// and downloadable from the app. If the .md file changes, update this constant too.
const SPEC_MD = `# Feature 1A Market Validation Spec doc by Lovable

# **Feature 1A — Market Validation Engine**

## **v1.5 Spec (Lovable internal — updated 2026-07-01)**

**Status:** Shipped, evolving. **Source of truth:** This chat + MVS Methodology doc. **Naming:** MVS (Market Validation Score). Do not surface PEES anywhere in the app or PDF.

> **What changed since the original v1.0 spec:** discovery expanded from Sawyer-only to 5 sources; Market Absorption pillar retired; registration-page scraping (Stage 3) retired; per-pillar confidence replaced the global low-confidence badge; Firecrawl cap raised to 50 with per-step sub-caps; freshness rules (0–90 skip / 91–120 prompt / >120 fresh) and soft-fail fallback (\`done_stale\`) added; cards redesigned to Result → Evidence → Trust; **pricing crawler expanded from 3 steps to 9 steps** (catch-up Google search, marketplace listing reads, relaxed "trusted source" price rule, brand price propagation, directory-first queries, Google AI Overview fallback, manual Verify/Reject/Edit for uncertain prices).

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

## **2. v1.5 scope (current)**

| Decision | Current behavior | Deferred |
| :---- | :---- | :---- |
| Discovery sources | **Sawyer + ActivityHero + Google Maps + Yelp + Google Search** (5 sources) | More platforms case-by-case |
| Scheduling | **Manual trigger** ("Run Pipeline" button per city) | Inngest/Trigger.dev post-client-meeting |
| Cities in scope | **Any city** can be added; freshness rules apply uniformly | — |
| Scrape cadence | **1 run per click**, gated by freshness rules below | Multi-scrape history once cadence is automated |
| Freshness rules | **0–90 days: auto-skip (use saved). 91–120: prompt user. >120: fresh crawl. "Force fresh" always overrides.** Backend hard-guard enforces this even if UI is bypassed. | — |
| Soft-fail fallback | If a fresh crawl fails but saved data ≤120 days exists → status \`done_stale\`, score stays visible, amber banner shown | — |
| Market Absorption | **Removed from composite (weight 0)** | Not planned |
| Registration-page scraping (old Stage 3) | **Retired.** \`mvs-extract-weeks\` is a no-op shell. No week rows are written. | Not planned |
| Normalization | **Fixed reference ranges** (see §5) | Across-shortlist normalization once ≥20 cities have live data |
| QA queue | **Retired** for the absorption flow. Page shows a retired notice. Per-pillar confidence chips replace the old global QA gate. | — |
| Firecrawl cost cap | **50 calls per run total**, sub-caps: discover ≤25, classify ≤15, extract ≤15 | — |

---

## **3. MVS composite — v1.5**

\`\`\`
MVS = 0.2667 × Pricing Acceptance
    + 0.2667 × Scaled Operator
    + 0.1333 × Enrichment Diversity
    + 0.1333 × Market Depth
    + 0.2000 × Market Balance Index
\`\`\`

Rounded to one decimal place. All sub-scores 0–100. Weights exposed as preview sliders per card. Market Absorption removed (weight 0); the remaining five pillars were proportionally re-normalized so the weights still sum to 1.0.

**SOW divergence flag (open question for Sam):** SOW v2.2 says Market Balance sits *next to* the composite, not inside it. We keep it inside at 20% because the demo UI renders it that way.

---

## **4. Pipeline — 4 active stages**

One manual run per city (subject to freshness rules). Stages write to Supabase; the score is recomputed from those rows via the **shared MVS helper** (\`src/lib/mvs/computeMvs.ts\`) — table row, panel, compare modal, PDF all read from this helper, never from stored composites.

\`\`\`
Stage 1 → Multi-source discovery       → providers from Sawyer, ActivityHero, Google Maps, Yelp, Google Search
Stage 2 → Premium tier classification  → filter to Premium (≥$400/wk, eligible category)
Stage 3 → Census ACS pull              → Market Balance + Operator denominators
Stage 4 → Score calculation            → 5 sub-scores → MVS composite
\`\`\`

### Stage 1 — Discovery (Firecrawl + APIs)

* **Tool:** Firecrawl (JS-render on, screenshots on, rotating proxies on) for Sawyer/ActivityHero/Google Search; direct APIs for Google Maps + Yelp where available.
* **Extract per provider:** name, weekly price (if visible), category (raw), listing URL, site count in metro, platform.
* **Persist:** \`mvs_providers\` row per provider. Where Firecrawl returns a listing-page screenshot (e.g. the Sawyer search-results page), the file is stored once in the private \`mvs-screenshots\` bucket and its path is written to \`screenshot_url\` on every provider discovered on that page. Raw HTML is NOT saved. Per-provider website screenshots are NOT captured.
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

* **Old Stage 3 — Registration-page extraction (\`mvs-extract-weeks\`):** retired. No week rows written. No registration-page screenshots produced. Function still exists as a no-op shell for backward-compat URLs.

---

## **5. Sub-score formulas + v1.5 reference ranges**

Normalization is **min-max against fixed reference ranges** (capped 0–100). Ranges below come from the methodology doc.

### Score 1 — Pricing Acceptance (26.67%)

\`\`\`
0.40 × normalize(median weekly price,       range $300–$700)
0.40 × normalize(75th-percentile price,     range $400–$800)
0.20 × (% Premium providers at ≥ $500/week,  0–100)
\`\`\`

### Score 2 — Market Absorption — RETIRED (weight 0)

> **Deprecated in v1.5.** Removed because sellout-rate scraping was unreliable. Formula preserved below for audit only.

\`\`\`
Sellout Rate            = (sold_out weeks + waitlist weeks) ÷ total weeks scraped
Market Absorption Score = normalize(Sellout Rate, range 0%–80%)
\`\`\`

### Score 3 — Scaled Operator (26.67%)

\`\`\`
Operator Validation    = count of distinct watchlist operators present (cap 0–8)
Direct Competitor Load = Σ site counts for operators tagged 'direct'
                         per 10,000 kids ages 5–12

Scaled Operator Score =
  0.65 × normalize(Operator Validation, 0–8)
+ 0.35 × (100 − normalize(Direct Competitor Load, 0–5 per 10k))
\`\`\`

Operator watchlist (seed, editable in UI): Galileo, Steve & Kate's, Camp Invention, Snapology, Code Ninjas, iD Tech, Mad Science, Engineering For Kids, Bricks 4 Kidz, Kids Inventor Lab, Maker Kids, theCoderSchool, Wiz Kidz, Sylvan summer, Mathnasium summer.

### Score 4 — Enrichment Diversity (13.33%)

\`\`\`
Category Count  = distinct eligible categories with ≥1 premium provider (of 19)
Diversity Ratio = Category Count ÷ Premium Provider Count

Score = 0.70 × normalize(Category Count, 2–10)
      + 0.30 × normalize(Diversity Ratio, 0.1–0.6)
\`\`\`

### Score 5 — Market Depth (13.33%)

\`\`\`
Market Depth Score = normalize(Premium Provider Count, 4–40)
\`\`\`

### Score 6 — Market Balance Index (20%)

\`\`\`
Coverage Ratio = Affluent Dual-Income Family Count ÷ Premium Provider Count
Score          = normalize(Coverage Ratio, 50–500)
\`\`\`

Tier labels: ≥350 Underserved · 200–349 Balanced · 100–199 Competitive · <100 Saturated.

---

## **6. Data model (Supabase)**

| Table | Status | Key fields |
| :---- | :---- | :---- |
| mvs_providers | Active | provider_id, provider_name, city, state, weekly_price, category_raw, category_classified, tier, listing_url, site_count, platform, scraped_at, screenshot_url |
| mvs_weeks | Retired | (no new writes; legacy rows retained) |
| mvs_qa_queue | Retired | (page shows retired notice; \`activeQaCount\` filters retired reasons out) |
| mvs_operator_watchlist | Active | operator_name, default_overlap, notes |
| mvs_city_overlap_overrides | Active | city, state, operator_name, overlap |
| mvs_pipeline_runs | Active | run_id, city, state, triggered_by, started_at, finished_at, status, error, provider_count, firecrawl_calls, **fallback_data_date** |

Status values on \`mvs_pipeline_runs\`: \`running\`, \`done\`, \`done_stale\` (soft-fail fallback in use), \`failed_no_data\` (no usable saved data within 60d).

**No mvs_city_scores table.** Composite + sub-scores are always recomputed from \`mvs_providers\` + ACS via the shared helper. Brett's "one calibrated number everywhere" rule.

---

## **7. UI behavior (current)**

* **City row:** MVS number from the shared helper. Status chips: Live, Stale-score amber note (under composite), or red "Failed" pill. "Run" and outlined "Force fresh" buttons per row.
* **Deep-dive cards (5 pillars):** New layout — **Result → Evidence → Trust → Weight preview → Formula/Sources**.
  * Result: plain-English meaning (e.g. "Weak premium pricing") + data-coverage chip.
  * Evidence: key numeric rows, each clickable to open a proof popover with provider-level source data.
  * Trust: per-pillar confidence (e.g. "Medium confidence — 8 of 12 providers had readable prices") with its own reason per card.
  * Weight preview slider: shows "Contributes X.X of 100 to MVS" with live delta, MVS preview only.
  * Collapsibles renamed: "How this score is calculated", "Where the data comes from (N)".
* **Freshness controls:** 0–30 days → auto-skip with toast and persistent amber row badge; 31–60 days → \`AlertDialog\` prompt "use saved or run fresh"; >60 → fresh crawl. Backend hard-guard enforces same rules. \`done_stale\` runs use \`fallback_data_date\` (not \`finished_at\`) so age math reflects the real data.
* **Known limitations panel** on the page (collapsible) explains what data we don't have.
* **PDF Market Brief:** unchanged in structure — 1-page Exec Summary in v1.0, fuller 12-section brief deferred.

---

## **8. Edge functions (server-side)**

| Function | Status | Purpose | Secrets |
| :---- | :---- | :---- | :---- |
| mvs-run-pipeline | Active | Orchestrates Stages 1–3, enforces freshness pre-check + soft-fail fallback, applies 50-call cap + sub-caps, refuses crawl <30d old unless \`forceFresh: true\` | FIRECRAWL_API_KEY, LOVABLE_API_KEY |
| mvs-discover-providers | Active | Stage 1 multi-source discovery | FIRECRAWL_API_KEY |
| mvs-classify-tier | Active | Stage 2 — parallel waves of 5 | LOVABLE_API_KEY |
| mvs-enrich-websites | Active | Optional enrichment | FIRECRAWL_API_KEY |
| mvs-extract-weeks | **Retired (no-op)** | Was Stage 3 reg-page extraction | — |
| mvs-acs-pull | Active | Stage 3 ACS pull | existing |
| mvs-refresh-all | Active | Batch wrapper | inherits |

Client never holds Firecrawl or Lovable AI Gateway keys. Every function checks \`manager\` or \`admin\` via \`user_roles\` + \`has_role()\` before spending a Firecrawl call.

### Phase 3 implementation notes (current)

* **Authorization is enforced in code**, not just \`verify_jwt\`.
* **Hard per-run cap of 50 Firecrawl calls** on the orchestrator, with sub-caps (discover 25, classify 15, extract 15). Sub-caps fail fast with a clear error rather than letting one step burn the whole budget.
* **Classification is parallel** in waves of 5 (was sequential).
* **Freshness pre-check is shared** via \`src/lib/mvs/preCrawlFreshness.ts\` and called from both the shortlist table and the deep-dive Run button. Backend re-checks the same rules so a UI bypass cannot cause a crawl.
* **Soft-fail fallback:** if a fresh crawl fails and saved data ≤60d exists, the run finishes as \`done_stale\` with \`fallback_data_date\` set; the UI shows an amber banner and the score stays visible.
* **Run traceability:** every invocation opens an \`mvs_pipeline_runs\` row, updates \`firecrawl_calls\`, closes with \`done\` / \`done_stale\` / \`failed_no_data\` + \`error\`.

---

## **9. Calibration gates**

1. **Sample city run produces clean output at every active stage** (smoke test).
2. **Boston MA lands in the top quartile** of the live set.
3. **Every live city row** shows: MVS, all 5 active sub-scores with non-null inputs, real provider names from ≥1 source.
4. **PDF Market Brief** generates in <30s; every numeric claim links to a source URL or screenshot where available.
5. **Slider change** updates the composite on all surfaces (row, panel, compare modal, PDF) using the same helper.
6. **Freshness rules behave end-to-end:** 0–30 skip toast + badge, 31–60 prompt, >60 fresh, force-fresh override — verified in both UI and backend hard-guard.

---

## **10. Out of scope for v1.5 (do not drift)**

* Apify Google Maps actor as a separate discovery source.
* Inngest/Trigger.dev scheduling.
* Time-to-Sellout and YoY Velocity (need multi-scrape history).
* Scaled Operator "Years in City" signal.
* Moving Market Balance outside the composite (open question for Sam).
* Across-shortlist normalization (need ≥20 live cities first).
* Reviving Market Absorption / registration-page scraping.
`;

const LOCKED_IN = [
  "MVS (Market Validation Score) — single per-city composite",
  "5 active sub-scores, normalized 0–100 against fixed reference ranges (Market Absorption retired)",
  "Market Balance INSIDE the composite at 20%",
  "5 discovery sources: Sawyer, ActivityHero, Google Maps, Yelp, Google Search",
  "Pricing crawler: 9 steps (was 3) — catch-up Google search, marketplace reads, relaxed trusted-source rule, brand propagation, directory-first queries, Google AI Overview fallback, manual Verify/Reject/Edit",
  "Manual trigger only — manager-only Run Pipeline button, with freshness pre-check",
  "Freshness rules: 0–90 skip, 91–120 prompt, >120 fresh, Force fresh override — enforced in both UI and backend",
  "Soft-fail fallback: failed fresh crawl with ≤120d saved data → status done_stale, score stays visible",
  "Firecrawl cap: 50 calls/run total + sub-caps (discover 25, classify 15, extract 15)",
  "Cards: Result → Evidence → Trust → Weight preview, with proof popovers and per-pillar confidence",
];

const EXCLUDED = [
  "Apify Google Maps actor (separate add)",
  "Inngest / Trigger.dev scheduling",
  "Time-to-Sellout and YoY Velocity as scored inputs",
  "Scaled Operator \"Years in City\" sub-component",
  "Moving Market Balance outside the composite",
  "Across-shortlist normalization changes",
  "Reviving Market Absorption / registration-page scraping",
];

// ----- Rendered content (kept in sync with SPEC_MD above) -----

const SCOPE_ROWS: Array<{ decision: string; current: string; deferred: string }> = [
  { decision: "Discovery sources", current: "Sawyer + ActivityHero + Google Maps + Yelp + Google Search (5 sources)", deferred: "More platforms case-by-case" },
  { decision: "Scheduling", current: 'Manual trigger ("Run Pipeline" button per city)', deferred: "Inngest / Trigger.dev post-client-meeting" },
  { decision: "Cities in scope", current: "Any city can be added; freshness rules apply uniformly", deferred: "—" },
  { decision: "Scrape cadence", current: "1 run per click, gated by freshness rules", deferred: "Multi-scrape history once cadence is automated" },
  { decision: "Freshness rules", current: "0–90 days auto-skip (use saved). 91–120 prompt user. >120 fresh crawl. Force fresh always overrides. Backend hard-guard enforces this even if UI is bypassed.", deferred: "—" },
  { decision: "Soft-fail fallback", current: "If a fresh crawl fails but saved data ≤120 days exists → status done_stale, score stays visible, amber banner shown", deferred: "—" },
  { decision: "Market Absorption", current: "Removed from composite (weight 0)", deferred: "Not planned" },
  { decision: "Registration-page scraping (old Stage 3)", current: "Retired. mvs-extract-weeks is a no-op shell. No week rows written.", deferred: "Not planned" },
  { decision: "Normalization", current: "Fixed reference ranges (see §5)", deferred: "Across-shortlist normalization once ≥20 cities have live data" },
  { decision: "QA queue", current: "Retired for the absorption flow. Page shows a retired notice. Per-pillar confidence chips replace the old global QA gate.", deferred: "—" },
  { decision: "Firecrawl cost cap", current: "50 calls per run total, sub-caps: discover ≤25, classify ≤15, extract ≤15", deferred: "—" },
];

const PRICING_STEPS: Array<{ step: string; detail: string; isNew: boolean }> = [
  { step: "1. Google Maps lookup", detail: "Get name, website, and address for the provider.", isNew: false },
  { step: "2. Read the camp's own website", detail: "Firecrawl fetches and renders the camp's site.", isNew: false },
  { step: "3. Catch-up Google search", detail: 'Plain English query, e.g. "Steve & Kate\'s Camp Austin summer camp tuition price per week 2026".', isNew: true },
  { step: "4. Read marketplace listings", detail: "Sawyer, ActivityHero, Yelp, news pages, camp PDFs returned by that search.", isNew: true },
  { step: "5. Relaxed price rule", detail: "A dollar number on any trusted source that ties to this camp by name is accepted. The old strict '$ must be in the camp's own markdown' rule is retired.", isNew: true },
  { step: "6. Guards", detail: "Price must be $50–$5,000 per week, weekly cadence, tied to the camp name. Bad prices are dropped with a reason chip.", isNew: true },
  { step: "7. Save with proof", detail: "Clickable source URL, matched query, confidence score.", isNew: true },
  { step: "8. Tier classify", detail: "Premium / Mid / Budget / Community.", isNew: true },
  { step: "9. Google AI Overview fallback (Phase B3)", detail: "Last resort. Reads the Google AI answer box via Apify. Prices flagged 'Needs human review' — must be Verified before counting.", isNew: true },
];

const FALLBACKS: Array<{ label: string; detail: string }> = [
  { label: "B1 — Brand price propagation", detail: "If 3+ sibling locations of the same brand have prices, the median is proposed for unpriced siblings and flagged for human review." },
  { label: "B2 — Directory-first queries", detail: "Catch-up search prefers Sawyer / ActivityHero listing URLs when available." },
  { label: "B4 — Manual Verify / Reject / Edit", detail: "Uncertain prices surface on the Provider Evidence Review page. Quiet chips for auto-kept crawler prices; loud action buttons only for rows that need human review." },
];

const FORMULAS: Array<{ title: string; weight: string; body: string; note?: string }> = [
  {
    title: "Score 1 — Pricing Acceptance",
    weight: "26.67%",
    body: `0.40 × normalize(median weekly price,     range $300–$700)
0.40 × normalize(75th-percentile price,   range $400–$800)
0.20 × (% Premium providers at ≥ $500/week, 0–100)`,
  },
  {
    title: "Score 2 — Market Absorption",
    weight: "RETIRED (weight 0)",
    body: `Sellout Rate            = (sold_out weeks + waitlist weeks) ÷ total weeks scraped
Market Absorption Score = normalize(Sellout Rate, range 0%–80%)`,
    note: "Deprecated in v1.5. Removed because sellout-rate scraping was unreliable. Formula preserved for audit only.",
  },
  {
    title: "Score 3 — Scaled Operator",
    weight: "26.67%",
    body: `Operator Validation    = count of distinct watchlist operators present (cap 0–8)
Direct Competitor Load = Σ site counts for operators tagged 'direct'
                         per 10,000 kids ages 5–12

Scaled Operator Score =
  0.65 × normalize(Operator Validation, 0–8)
+ 0.35 × (100 − normalize(Direct Competitor Load, 0–5 per 10k))`,
    note: "Operator watchlist (seed, editable in UI): Galileo, Steve & Kate's, Camp Invention, Snapology, Code Ninjas, iD Tech, Mad Science, Engineering For Kids, Bricks 4 Kidz, Kids Inventor Lab, Maker Kids, theCoderSchool, Wiz Kidz, Sylvan summer, Mathnasium summer.",
  },
  {
    title: "Score 4 — Enrichment Diversity",
    weight: "13.33%",
    body: `Category Count  = distinct eligible categories with ≥1 premium provider (of 19)
Diversity Ratio = Category Count ÷ Premium Provider Count

Score = 0.70 × normalize(Category Count, 2–10)
      + 0.30 × normalize(Diversity Ratio, 0.1–0.6)`,
  },
  {
    title: "Score 5 — Market Depth",
    weight: "13.33%",
    body: `Market Depth Score = normalize(Premium Provider Count, 4–40)`,
  },
  {
    title: "Score 6 — Market Balance Index",
    weight: "20%",
    body: `Coverage Ratio = Affluent Dual-Income Family Count ÷ Premium Provider Count
Score          = normalize(Coverage Ratio, 50–500)`,
    note: "Tier labels: ≥350 Underserved · 200–349 Balanced · 100–199 Competitive · <100 Saturated.",
  },
];

const TABLES = [
  { name: "mvs_providers", status: "Active", fields: "provider_id, provider_name, city, state, weekly_price, category_raw, category_classified, tier, listing_url, site_count, platform, scraped_at, screenshot_url, price_derived_from_brand, price_needs_review, ai_overview_snippet, ai_overview_source_url, matched_query, verified_at, verified_by" },
  { name: "mvs_weeks", status: "Retired", fields: "no new writes; legacy rows retained" },
  { name: "mvs_qa_queue", status: "Retired", fields: "page shows retired notice; activeQaCount filters retired reasons out" },
  { name: "mvs_operator_watchlist", status: "Active", fields: "operator_name, default_overlap, notes" },
  { name: "mvs_city_overlap_overrides", status: "Active", fields: "city, state, operator_name, overlap" },
  { name: "mvs_pipeline_runs", status: "Active", fields: "run_id, city, state, triggered_by, started_at, finished_at, status, error, provider_count, firecrawl_calls, fallback_data_date, fallback_reason, source_counts" },
  { name: "mvs_tier_snapshots", status: "Active", fields: "city, premium_count, mid_count, budget_count, trigger, created_at (used by regression guard)" },
  { name: "notifications", status: "Active", fields: "user_id, kind, title, message, link, read_at, created_at (header bell)" },
];

const EDGE_FUNCTIONS = [
  { fn: "mvs-run-pipeline", status: "Active", purpose: "Orchestrates Stages 1–4, runs freshness pre-check + soft-fail fallback, applies 50-call cap + sub-caps, chains catch-up + reclassify. Runs stages in background via EdgeRuntime.waitUntil so HTTP returns fast." },
  { fn: "mvs-discover-providers", status: "Active", purpose: "Stage 1 multi-source discovery + the 9-step pricing crawler + catch-up missing prices loop." },
  { fn: "mvs-classify-tier", status: "Active", purpose: "Stage 2 — parallel waves of 5. Runs twice per pipeline (once after discover, once after catch-up)." },
  { fn: "mvs-enrich-websites", status: "Active", purpose: "Optional enrichment for provider websites." },
  { fn: "mvs-acs-pull", status: "Active", purpose: "Stage 3 Census ACS pull — dual-income households ≥$150k with kids 5–12, plus total kids 5–12." },
  { fn: "mvs-extract-weeks", status: "Retired (no-op)", purpose: "Was Stage 3 registration-page extraction. Kept as shell for backward-compat URLs." },
  { fn: "mvs-refresh-all", status: "Active", purpose: "Batch wrapper — chained per-city runs (respects freshness)." },
];

const CALIBRATION_GATES = [
  "Sample city run produces clean output at every active stage (smoke test).",
  "Boston MA lands in the top quartile of the live set.",
  "Every live city row shows: MVS, all 5 active sub-scores with non-null inputs, real provider names from ≥1 source.",
  "PDF Market Brief generates in <30s; every numeric claim links to a source URL or screenshot where available.",
  "Slider change updates the composite on all surfaces (row, panel, compare modal, PDF) using the same helper.",
  "Freshness rules behave end-to-end: 0–90 skip toast + badge, 91–120 prompt, >120 fresh, force-fresh override — verified in both UI and backend hard-guard.",
];

const UI_BEHAVIOR = [
  { label: "City row", detail: "MVS number from the shared helper. Status chips: Live, Stale-score amber note (under composite), or red 'Failed' pill. 'Run' and outlined 'Force fresh' buttons per row. Red 'Stop' button while a row is running; other rows' Run/Force-fresh buttons disable during that time." },
  { label: "Deep-dive cards (5 pillars)", detail: "Layout: Result → Evidence → Trust → Weight preview → Formula / Sources. Result: plain-English meaning + data-coverage chip. Evidence: numeric rows, each clickable to open a proof popover. Trust: per-pillar confidence with its own reason. Weight preview slider shows 'Contributes X.X of 100 to MVS' as live delta (preview only)." },
  { label: "Crawler telemetry card", detail: "Shows how each price was found — Direct (Steps 1–3), B1 Brand propagation, B2 Directory-first, B3 Google AI Overview. Derived live from provider rows." },
  { label: "Unpriced reasons block", detail: "Short muted 'Why: [Reason]' chip per unpriced row (Not a camp, Booking wall, No public price, etc.) with a per-city breakdown." },
  { label: "Freshness controls", detail: "0–90 days → auto-skip with toast + persistent amber row badge. 91–120 → AlertDialog prompt 'use saved or run fresh'. >120 → fresh crawl. Backend hard-guard enforces same rules. done_stale runs use fallback_data_date (not finished_at) for age math." },
  { label: "Provider Evidence Review page", detail: "Read-only audit table. Quiet green 'In score — crawler' chip for kept prices. Loud Verify / Reject / Edit buttons only for 'Needs human review' rows. Reject asks for confirmation before clearing. Guard-dropped prices show as amber pills with the reason. Collapsible 'How to read this table' help card at the top." },
  { label: "Regression guard", detail: "After every catch-up + reclassify, snapshot premium/mid/budget counts. If premium drops ≥20% vs the previous snapshot, fire a header-bell notification." },
  { label: "Header bell (notifications)", detail: "Fires on city_scoring_finished (success) and system (failure). 20 most recent per user, 60s polling, RLS per user, capped '9+' badge." },
  { label: "Catch-Up Missing Prices button", detail: "Above the deep-dive card. Processes unpriced providers in chunks of 5 via the browser using the new 9-step crawler, then re-runs classify so newly priced camps get their correct tier." },
  { label: "Known limitations panel", detail: "Collapsible on the page. Explains what data we don't have and why." },
  { label: "PDF Market Brief", detail: "1-page Exec Summary in v1.0. Fuller 12-section brief deferred." },
];

export default function MVSSpec() {
  return (
    <DocShell
      eyebrow="Feature 1A · v1.5 Spec"
      eyebrowIcon={ShieldCheck}
      title="Market Validation Engine — v1.5 Full Spec"
      subtitle="Every detail of how MVS works and what is shipped. Source of truth: this page + MVS Methodology + this chat. Re-read before starting any new turn."
      action={<DownloadMDButton content={SPEC_MD} filename="feature-1a-mvs-v1-spec.md" />}
    >
      <DocCard>
        <div className="space-y-12 text-[14px] leading-relaxed text-[#1a2540]">

          {/* Status header */}
          <section className="rounded-md border border-[#cfdcff] bg-[#f4f8ff] p-4">
            <div className="text-[12px] font-bold uppercase tracking-wide text-[#174be8] mb-1">Status</div>
            <p className="text-[#07142f]">
              <strong>Shipped, evolving.</strong> Naming: <strong>MVS</strong> (Market Validation Score). Do not surface "PEES" anywhere in the app or PDF.
            </p>
            <p className="mt-2 text-[13px]">
              <strong>What changed since original v1.0:</strong> discovery expanded from Sawyer-only to 5 sources; Market Absorption pillar retired; registration-page scraping retired; per-pillar confidence replaced the global low-confidence badge; Firecrawl cap raised to 50 with per-step sub-caps; freshness rules (0–90 skip / 91–120 prompt / &gt;120 fresh) and soft-fail fallback (<code className="bg-white px-1 rounded text-[12px]">done_stale</code>) added; cards redesigned to Result → Evidence → Trust; <strong>pricing crawler expanded from 3 steps to 9 steps</strong>.
            </p>
          </section>

          {/* 1. What it does */}
          <section>
            <h2 className="text-lg font-bold text-[#07142f] mb-3">1. What this feature does</h2>
            <p className="mb-3">
              Takes a city from the shortlist and produces a <strong>single composite score (MVS, 0–100)</strong> that answers: <em>"Is this a validated premium enrichment market with active, paying demand?"</em>
            </p>
            <p className="mb-2 font-semibold text-[#07142f]">Output surfaces:</p>
            <ul className="list-disc pl-6 space-y-1 mb-3">
              <li>MVS number on the city row in the shortlist table.</li>
              <li>5 sub-score breakdown in the city detail panel (Result / Evidence / Trust layout, with proof popovers).</li>
              <li>Premium provider table (real names, weekly prices, source chips).</li>
              <li>Branded PDF Market Brief.</li>
              <li>Every score traces to a source URL and (where available) a stored listing-page screenshot. Screenshots are of the discovery listing page (Sawyer, Yelp, Google, etc.), shared by all providers on that page. We do <strong>not</strong> save per-provider website screenshots or raw HTML.</li>
            </ul>
            <p className="text-[13px] text-[#526078]">
              <strong>Not in scope:</strong> predicting any individual Neuron Garage location's success. Site-level work lives in Feature 1B.
            </p>
          </section>

          {/* 2. Scope table */}
          <section>
            <h2 className="text-lg font-bold text-[#07142f] mb-3">2. v1.5 scope (current)</h2>
            <div className="overflow-hidden rounded-md border border-[#cfdcff]">
              <table className="w-full text-[13px]">
                <thead className="bg-[#f4f8ff] text-[#174be8]">
                  <tr>
                    <th className="text-left px-4 py-2 font-bold w-1/5">Decision</th>
                    <th className="text-left px-4 py-2 font-bold w-3/5">Current behavior</th>
                    <th className="text-left px-4 py-2 font-bold w-1/5">Deferred</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {SCOPE_ROWS.map((r) => (
                    <tr key={r.decision} className="border-t border-[#eef2f7] align-top">
                      <td className="px-4 py-3 font-semibold text-[#07142f]">{r.decision}</td>
                      <td className="px-4 py-3">{r.current}</td>
                      <td className="px-4 py-3 text-[#526078]">{r.deferred}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 3. Composite */}
          <section>
            <h2 className="text-lg font-bold text-[#07142f] mb-3">3. MVS composite formula</h2>
            <pre className="rounded-md border border-[#cfdcff] bg-[#f4f8ff] px-4 py-3 text-[13px] font-mono text-[#07142f] whitespace-pre-wrap">
{`MVS = 0.2667 × Pricing Acceptance
    + 0.2667 × Scaled Operator
    + 0.1333 × Enrichment Diversity
    + 0.1333 × Market Depth
    + 0.2000 × Market Balance Index

(Market Absorption retired, weight 0.)`}
            </pre>
            <p className="mt-3 text-[13px]">
              Rounded to one decimal. All sub-scores 0–100. Weights exposed as preview sliders per card. Market Absorption removed (weight 0); the remaining five pillars were proportionally re-normalized so weights still sum to 1.0.
            </p>
            <p className="mt-2 text-[13px] text-[#b45309]">
              <strong>SOW divergence flag (open question for Sam):</strong> SOW v2.2 says Market Balance sits <em>next to</em> the composite, not inside it. We keep it inside at 20% because the demo UI renders it that way.
            </p>
          </section>

          {/* Premium tier definition */}
          <section>
            <h2 className="text-lg font-bold text-[#07142f] mb-3">Premium Provider Definition</h2>
            <div className="overflow-hidden rounded-md border border-[#cfdcff]">
              <table className="w-full text-[13px]">
                <thead className="bg-[#f4f8ff] text-[#174be8]">
                  <tr>
                    <th className="text-left px-4 py-2 font-bold">Tier</th>
                    <th className="text-left px-4 py-2 font-bold">Definition</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  <tr className="border-t border-[#eef2f7]"><td className="px-4 py-3 font-bold text-[#07142f]">Premium</td><td className="px-4 py-3">Price ≥ $400/week AND one of 19 eligible enrichment categories AND not childcare-positioned</td></tr>
                  <tr className="border-t border-[#eef2f7]"><td className="px-4 py-3 font-bold text-[#07142f]">Mid</td><td className="px-4 py-3">$250–$399/week, enrichment-positioned</td></tr>
                  <tr className="border-t border-[#eef2f7]"><td className="px-4 py-3 font-bold text-[#07142f]">Budget</td><td className="px-4 py-3">&lt; $250/week OR community/parks-and-rec/YMCA-positioned</td></tr>
                  <tr className="border-t border-[#eef2f7]"><td className="px-4 py-3 font-bold text-[#07142f]">Community</td><td className="px-4 py-3">Faith-based, scholarship-driven, or municipally subsidized</td></tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[13px]">Only <strong>Premium</strong>-tier providers flow into the five active sub-scores. Mid / Budget / Community are retained for audit and pricing-ladder context.</p>
          </section>

          {/* 4. Pipeline */}
          <section>
            <h2 className="text-lg font-bold text-[#07142f] mb-3">4. Pipeline — 4 active stages</h2>
            <p className="mb-3">
              One manual run per city (subject to freshness rules). Stages write to the backend; the score is recomputed from those rows via the <strong>shared MVS helper</strong> (<code className="bg-[#f4f8ff] px-1 rounded text-[12px]">src/lib/mvs/computeMvs.ts</code>) — table row, panel, compare modal, PDF all read from this helper, never from stored composites.
            </p>
            <pre className="rounded-md border border-[#cfdcff] bg-[#f4f8ff] px-4 py-3 text-[13px] font-mono text-[#07142f] whitespace-pre-wrap mb-4">
{`Stage 1 → Multi-source discovery       → providers from Sawyer, ActivityHero, Google Maps, Yelp, Google Search
Stage 2 → Premium tier classification  → filter to Premium (≥$400/wk, eligible category)
Stage 3 → Census ACS pull              → Market Balance + Operator denominators
Stage 4 → Score calculation            → 5 sub-scores → MVS composite`}
            </pre>

            <h3 className="text-[15px] font-bold text-[#07142f] mt-4 mb-2">Stage 1 — Discovery (Firecrawl + APIs)</h3>
            <ul className="list-disc pl-6 space-y-1 mb-3">
              <li><strong>Tool:</strong> Firecrawl (JS-render on, screenshots on, rotating proxies on) for Sawyer / ActivityHero / Google Search; direct APIs for Google Maps + Yelp where available.</li>
              <li><strong>Extract per provider:</strong> name, weekly price (if visible), category (raw), listing URL, site count in metro, platform.</li>
              <li><strong>Persist:</strong> <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">mvs_providers</code> row per provider. Listing-page screenshots stored once in the private <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">mvs-screenshots</code> bucket; path is written to <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">screenshot_url</code> on every provider discovered on that page. Raw HTML NOT saved. Per-provider website screenshots NOT captured.</li>
              <li><strong>Sub-cap:</strong> ≤25 Firecrawl calls in this stage.</li>
            </ul>

            <h3 className="text-[15px] font-bold text-[#07142f] mt-6 mb-2">Pricing crawler — 9 steps (expanded from the original 3)</h3>
            <p className="mb-3">
              For each provider found in Stage 1, the pricing sub-crawler runs up to 9 steps. It stops at the first step that produces a valid price. The old crawler (before 2026-06-26) stopped at step 3 and marked most camps as "missing price."
            </p>
            <ol className="space-y-2 mb-4">
              {PRICING_STEPS.map((s) => (
                <li key={s.step} className="rounded-md border border-[#eef2f7] px-3 py-2 bg-white">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#07142f]">{s.step}</span>
                    {s.isNew && <span className="text-[10px] font-bold uppercase text-[#174be8] bg-[#eef2f7] px-2 py-0.5 rounded">NEW</span>}
                  </div>
                  <div className="text-[13px] text-[#1a2540] mt-1">{s.detail}</div>
                </li>
              ))}
            </ol>

            <h4 className="font-bold text-[#07142f] mb-2">Related fallbacks that plug into this flow</h4>
            <ul className="list-disc pl-6 space-y-1 mb-4">
              {FALLBACKS.map((f) => (
                <li key={f.label}><strong>{f.label}:</strong> {f.detail}</li>
              ))}
            </ul>

            <h3 className="text-[15px] font-bold text-[#07142f] mt-6 mb-2">Stage 2 — Premium tier classification (Gemini 2.0 Flash via Lovable AI Gateway)</h3>
            <ul className="list-disc pl-6 space-y-1 mb-3">
              <li>Input: every row from Stage 1.</li>
              <li>Tag each provider: <strong>Premium / Mid / Budget / Community</strong>.</li>
              <li>Only Premium flows into score calc. Other tiers persist for pricing-ladder context.</li>
              <li><strong>Runs in parallel waves of 5</strong> to avoid timeouts (was sequential in v1.0).</li>
              <li>Runs <strong>twice per pipeline</strong> — once after discover, once after the catch-up loop — so newly priced camps get the correct tier.</li>
              <li><strong>19 eligible categories for Premium:</strong> STEM, Robotics, Coding, Science, Maker, Art, Theater, Music, Academic Enrichment, Debate, Chess, Entrepreneurship, Dance, Language, Sports, Swim, Gymnastics, Cooking, Outdoor.</li>
              <li><strong>Sub-cap:</strong> ≤15 Firecrawl calls in this stage.</li>
            </ul>

            <h3 className="text-[15px] font-bold text-[#07142f] mt-6 mb-2">Stage 3 — Census ACS pull</h3>
            <ul className="list-disc pl-6 space-y-1 mb-3">
              <li>Pulls dual-income households with HH income ≥$150k and children ages 5–12 → "Affluent Dual-Income Family Count" (Score 6 denominator).</li>
              <li>Children ages 5–12 → denominator for Direct Competitor Load in Score 3.</li>
            </ul>

            <h3 className="text-[15px] font-bold text-[#07142f] mt-6 mb-2">Stage 4 — Score calculation</h3>
            <p className="mb-3">See §5 for the formulas. All math lives in one helper. No stored composite scores — always recomputed.</p>

            <h3 className="text-[15px] font-bold text-[#526078] mt-6 mb-2">Retired stage (kept for audit only)</h3>
            <p className="text-[13px] text-[#526078]">
              <strong>Old Stage 3 — Registration-page extraction (<code className="bg-[#f4f8ff] px-1 rounded text-[12px]">mvs-extract-weeks</code>):</strong> retired. No week rows written. No registration-page screenshots produced. Function still exists as a no-op shell for backward-compat URLs.
            </p>
          </section>

          {/* 5. Sub-score formulas */}
          <section>
            <h2 className="text-lg font-bold text-[#07142f] mb-3">5. Sub-score formulas + v1.5 reference ranges</h2>
            <p className="mb-3">Normalization is <strong>min-max against fixed reference ranges</strong> (capped 0–100). Ranges below come from the methodology doc.</p>
            <div className="space-y-4">
              {FORMULAS.map((f) => (
                <div key={f.title} className="rounded-md border border-[#cfdcff] p-4 bg-white">
                  <div className="flex items-baseline justify-between mb-2">
                    <div className="font-bold text-[#07142f]">{f.title}</div>
                    <div className="text-[12px] font-semibold text-[#174be8]">{f.weight}</div>
                  </div>
                  {f.note && f.weight.includes("RETIRED") && (
                    <p className="text-[12px] text-[#b45309] mb-2 italic">{f.note}</p>
                  )}
                  <pre className="rounded bg-[#f4f8ff] px-3 py-2 text-[12px] font-mono text-[#07142f] whitespace-pre-wrap">{f.body}</pre>
                  {f.note && !f.weight.includes("RETIRED") && (
                    <p className="text-[12px] text-[#526078] mt-2">{f.note}</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* 6. Data model */}
          <section>
            <h2 className="text-lg font-bold text-[#07142f] mb-3">6. Data model (backend tables)</h2>
            <div className="overflow-hidden rounded-md border border-[#cfdcff]">
              <table className="w-full text-[13px]">
                <thead className="bg-[#f4f8ff] text-[#174be8]">
                  <tr>
                    <th className="text-left px-4 py-2 font-bold">Table</th>
                    <th className="text-left px-4 py-2 font-bold">Status</th>
                    <th className="text-left px-4 py-2 font-bold">Key fields</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {TABLES.map((t) => (
                    <tr key={t.name} className="border-t border-[#eef2f7] align-top">
                      <td className="px-4 py-3 font-mono text-[12px] text-[#07142f]">{t.name}</td>
                      <td className="px-4 py-3 font-semibold">{t.status}</td>
                      <td className="px-4 py-3 text-[12px]">{t.fields}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[13px]">
              Status values on <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">mvs_pipeline_runs</code>: <code>queued</code>, <code>running</code>, <code>done</code>, <code>done_stale</code> (soft-fail fallback in use), <code>failed</code>, <code>failed_no_data</code> (no usable saved data within 120d).
            </p>
            <p className="mt-2 text-[13px]">
              <strong>No <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">mvs_city_scores</code> table.</strong> Composite + sub-scores are always recomputed from <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">mvs_providers</code> + ACS via the shared helper. Brett's "one calibrated number everywhere" rule.
            </p>
          </section>

          {/* 7. UI behavior */}
          <section>
            <h2 className="text-lg font-bold text-[#07142f] mb-3">7. UI behavior (current)</h2>
            <ul className="space-y-3">
              {UI_BEHAVIOR.map((b) => (
                <li key={b.label} className="rounded-md border border-[#eef2f7] p-3 bg-white">
                  <div className="font-semibold text-[#07142f] mb-1">{b.label}</div>
                  <div className="text-[13px]">{b.detail}</div>
                </li>
              ))}
            </ul>
          </section>

          {/* 8. Edge functions */}
          <section>
            <h2 className="text-lg font-bold text-[#07142f] mb-3">8. Edge functions (server-side)</h2>
            <div className="overflow-hidden rounded-md border border-[#cfdcff] mb-3">
              <table className="w-full text-[13px]">
                <thead className="bg-[#f4f8ff] text-[#174be8]">
                  <tr>
                    <th className="text-left px-4 py-2 font-bold">Function</th>
                    <th className="text-left px-4 py-2 font-bold">Status</th>
                    <th className="text-left px-4 py-2 font-bold">Purpose</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {EDGE_FUNCTIONS.map((e) => (
                    <tr key={e.fn} className="border-t border-[#eef2f7] align-top">
                      <td className="px-4 py-3 font-mono text-[12px] text-[#07142f]">{e.fn}</td>
                      <td className="px-4 py-3 font-semibold">{e.status}</td>
                      <td className="px-4 py-3 text-[13px]">{e.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[13px]">
              Client never holds Firecrawl or Lovable AI Gateway keys. Every function checks <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">manager</code> or <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">admin</code> via <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">user_roles</code> + <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">has_role()</code> before spending a Firecrawl call.
            </p>

            <h3 className="text-[15px] font-bold text-[#07142f] mt-5 mb-2">Implementation notes</h3>
            <ul className="list-disc pl-6 space-y-1 text-[13px]">
              <li><strong>Authorization is enforced in code</strong>, not just <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">verify_jwt</code>.</li>
              <li><strong>Hard per-run cap of 50 Firecrawl calls</strong> with sub-caps (discover 25, classify 15, extract 15). Sub-caps fail fast with a clear error.</li>
              <li><strong>Background execution:</strong> orchestrator returns HTTP 202 within ~1 second and runs stages under <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">EdgeRuntime.waitUntil</code>. UI polls <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">mvs_pipeline_runs</code> every 5s.</li>
              <li><strong>Classification is parallel</strong> in waves of 5 (was sequential).</li>
              <li><strong>Freshness pre-check is shared</strong> via <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">src/lib/mvs/preCrawlFreshness.ts</code>. Backend re-checks the same rules — a UI bypass cannot cause a crawl.</li>
              <li><strong>Soft-fail fallback:</strong> failed crawl with saved data ≤120d → status <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">done_stale</code>, <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">fallback_data_date</code> set, amber banner shown.</li>
              <li><strong>Stale run auto-clear:</strong> runs stuck &gt;3 minutes are auto-marked failed so a crashed run cannot lock a city.</li>
              <li><strong>Run traceability:</strong> every invocation opens an <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">mvs_pipeline_runs</code> row, tracks <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">firecrawl_calls</code> and <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">source_counts</code>, closes with final status + error.</li>
              <li><strong>Notifications:</strong> success and failure both post to the header bell for the triggering user.</li>
            </ul>
          </section>

          {/* 9. Calibration gates */}
          <section>
            <h2 className="text-lg font-bold text-[#07142f] mb-3">9. Calibration gates</h2>
            <ol className="list-decimal pl-6 space-y-1">
              {CALIBRATION_GATES.map((g) => <li key={g}>{g}</li>)}
            </ol>
          </section>

          {/* 10. Out of scope */}
          <section>
            <h2 className="text-lg font-bold text-[#07142f] mb-3">10. Out of scope for v1.5 (do not drift)</h2>
            <ul className="space-y-2">
              {EXCLUDED.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-[#b91c1c] font-bold flex-shrink-0">✗</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Locked-in quick reference */}
          <section>
            <h2 className="text-lg font-bold text-[#07142f] mb-3">Locked-in quick reference</h2>
            <ul className="space-y-2">
              {LOCKED_IN.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-[#174be8] font-bold flex-shrink-0">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Operating doctrine */}
          <section>
            <h2 className="text-lg font-bold text-[#07142f] mb-3">Operating doctrine</h2>
            <div className="space-y-2">
              <p><strong>One calibrated number everywhere.</strong> Single helper <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">src/lib/mvs/computeMvs.ts</code>. No DB-stored composites.</p>
              <p><strong>Freshness is shared.</strong> Single helper <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">src/lib/mvs/preCrawlFreshness.ts</code> used by every Run button; backend re-checks the same rules.</p>
              <p><strong>Manager-gated runs.</strong> Every pipeline edge function checks <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">user_roles</code> for manager/admin before spending a Firecrawl call.</p>
              <p><strong>Cost ceilings are hard.</strong> 50 calls/run total with per-step sub-caps that fail fast.</p>
              <p><strong>Atomic &amp; reversible turns.</strong> Each turn ships one concern with an explicit unwind. No invented turns, no scope creep.</p>
              <p><strong>Surface area:</strong> <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">mvs_*</code> tables, <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">mvs-*</code> functions, <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">src/lib/mvs/*</code>, <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">src/pages/MarketValidation*</code>, <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">src/components/phase2-demo/*</code>. No edits elsewhere.</p>
            </div>
          </section>

          {/* Related */}
          <section>
            <h2 className="text-lg font-bold text-[#07142f] mb-3">Related</h2>
            <ul className="space-y-2 text-[#174be8]">
              <li className="flex items-center gap-2"><FileText size={14} /><a href="/mvs-methodology" className="hover:underline">MVS Methodology — the sub-score math & crawler evolution</a></li>
              <li className="flex items-center gap-2"><FileText size={14} /><span className="text-[#1a2540]">Build Plan: <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">docs/feature-1a-build-plan.md</code> (in repo)</span></li>
            </ul>
          </section>

        </div>
      </DocCard>
    </DocShell>
  );
}

