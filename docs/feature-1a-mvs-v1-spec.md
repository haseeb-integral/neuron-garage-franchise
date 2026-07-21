# Feature 1A Market Validation Spec doc by Lovable

# **Feature 1A — Market Validation Engine**

## **v1.8 Spec (Lovable internal — updated 2026-07-21)**

**Status:** Shipped, evolving. **Source of truth:** This chat + MVS Methodology doc. **Naming:** MVS (Market Validation Score). Do not surface PEES anywhere in the app or PDF.

> **What changed since v1.6 → v1.7 (2026-07-14):**
> - **Market Balance Index (MBI) rebuilt** as a zero-weight review flag. It no longer contributes points to the composite; it emits a two-sided status (saturated / healthy / unproven) driven by `affluent_families_with_children ÷ premium_provider_count`.
> - **Market Depth** normalization tightened from 4–40 to **4–15** (threshold question — saturates fast).
> - **Enrichment Diversity** absorbs MBI's old 0.20 weight → new weight **0.3333**. Composite still sums to 1.0.
> - **Thin-market flag** (`premium_count < 4`) moved into the Enrichment Diversity card as display-only, replacing the old low-confidence badge.
> - `affluent_families_count` on `us_cities_scored` is the single source of truth for MBI's numerator (was a mixed cache).
> - `city_briefs` score columns (`composite_score`, `pillar_demand`, `pillar_tam`, `pillar_opp`) **dropped** — scoring truth lives only in `us_cities_scored` and the shared MVS helper.

> **What changed since v1.7 → v1.8 (2026-07-21):**
> - **Premium tier "two-gate" rule** in production: a provider is Premium only if **`price_min ≥ $300 AND price_max ≥ $400`**. Kills the wide-range trap ($100–$500 drop-in listings that used to sneak in via `pMax ≥ 400`).
> - **Unpriced providers default to Mid**, never Premium (except unpriced national premium brands). "3+ sources = Premium" rule retired.
> - **National-brand override about to be tightened**: brand-name matches with a real price below the two-gate go to Mid, not Premium (fix in flight — see §11 Planned).
> - **Google AI Overview (B3) promoted to PRIMARY pricing source** behind `MVS_B3_PRIMARY_ENABLED=true`. Gemini extracts `price_unit` and normalizes non-weekly amounts (monthly ÷ 4.33, per-day × 5, per-session bundled, etc.). Confidence pills + source receipts are visible in the Provider Evidence table.
> - **Self-chaining pipeline orchestrator.** `mvs-run-pipeline` runs exactly ONE stage per invocation and self-invokes the next, bypassing the 150s edge-function CPU cap. New stage machine: `discover → step0_exclude → classify → b3 → acs → catchup → reclassify → done`. Each stage has a 4-minute sub-timeout; overall watchdog kills runs older than 20 minutes.
> - **DB stale-run sweeper** via `pg_cron`: `mvs_sweep_stale_runs()` marks any `queued`/`running` row older than 25 minutes as `failed` with a clear error. Prevents the UI hanging on dead runs.
> - **Discovery query hygiene:**
>   - Removed `"kids classes ${city} ${state}"` (pulled too many non-camps).
>   - Added `"summer day camps in ${city} ${state}"`.
>   - Word **"tuition"** prohibited in every query (K-12 signal, not camp signal).
>   - Yelp restricted to the `summer_camps_for_kids` category slug with local city/state presence.
>   - Sawyer restricted to the single URL `https://www.hisawyer.com/s/summer-camps-for-kids` with local presence check.
>   - Google Maps `maxCrawledPlacesPerSearch` raised to 100 with sequential loops to stay under edge timeouts.
> - **Price acceptance zones $100–$2500/wk** applied at ingest; anything outside is dropped with a reason.
> - **`mvs_operator_watchlist` is the single source of truth** for national brand identity. Added `aliases text[]` column; hard-coded `NATIONAL_BRANDS` arrays in the crawler are gone. Currently 20 rows (Direct/Adjacent/Distant tagged).
> - **B3 self-chaining**: `mvs-price-b3` now batches (default 8) and fire-and-forwards its own continuation via `waitUntil` so it can't hang the orchestrator.
> - **Trust Surface UI shipped**: per-row `price_confidence` pill, source URL + quote receipt popovers, "Discovery source(s)" column in provider tables, CSV exports include source columns.

---

## **1. What this feature does**

Takes a city from the shortlist and produces a **single composite score (MVS, 0–100)** that answers: *"Is this a validated premium enrichment market with active, paying demand?"*

Output surfaces:

* MVS number on the city row in the shortlist table.
* 4 scored pillars + 1 review-flag pillar in the city detail panel (Result / Evidence / Trust layout, with proof popovers).
* Premium provider table (real names, weekly prices, discovery source chips, confidence pill, source receipt).
* Branded PDF Market Brief.
* Every score traces to a source URL and (where available) a stored listing-page screenshot. Screenshots are of the discovery listing page (Sawyer, Yelp, Google, etc.), shared by all providers found on that page. We do not save per-provider website screenshots or raw HTML.

Not in scope: predicting any individual Neuron Garage location's success. Site-level work lives in Feature 1B.

---

## **2. v1.8 scope (current)**

| Decision | Current behavior | Deferred |
| :---- | :---- | :---- |
| Discovery sources | **Sawyer (single URL) + ActivityHero + Google Maps (Apify) + Yelp (category-scoped) + Google Search** (5 sources) | More platforms case-by-case |
| Scheduling | **Manual trigger** ("Run Pipeline" button per city) | Inngest/Trigger.dev post-client-meeting |
| Cities in scope | **Any city** can be added; freshness rules apply uniformly | — |
| Scrape cadence | **1 run per click**, gated by freshness rules below | Multi-scrape history once cadence is automated |
| Freshness rules | **0–90 days: auto-skip. 91–120: prompt user. >120: fresh crawl. Force-fresh always overrides.** Backend hard-guard enforces even if UI bypassed. | — |
| Soft-fail fallback | Fresh crawl fails but saved data ≤120 days exists → status `done_stale`, score stays visible, amber banner shown | — |
| Pipeline runner | **Self-chaining stage machine** (one stage per edge invocation). 4-min sub-timeouts + 20-min overall watchdog + DB sweeper. | — |
| Premium tier rule | **Two-gate: `price_min ≥ 300` AND `price_max ≥ 400`.** Unpriced → Mid (or Premium only for unpriced national brand). | Tighten brand override for below-gate priced brand-name camps (in flight) |
| Primary pricing source | **B3 Google AI Overview via Gemini** (`MVS_B3_PRIMARY_ENABLED=true`), unit-aware, self-chaining batches. | — |
| Market Absorption | **Removed from composite (weight 0)** | Not planned |
| Market Balance Index | **Review flag only (weight 0).** Emits saturated/healthy/unproven. | — |
| Registration-page scraping | **Retired.** `mvs-extract-weeks` is a no-op shell. | Not planned |
| Normalization | **Fixed reference ranges** (see §5) | Across-shortlist normalization once ≥20 cities have live data |
| QA queue | **Retired.** Per-pillar confidence chips + Provider Evidence Verify/Reject/Edit replace it. | — |
| Firecrawl cost cap | **50 calls per run total**, sub-caps: discover ≤25, classify ≤15, extract ≤15 | — |
| National brand identity | **`mvs_operator_watchlist` DB table (with `aliases` array)** is the single source of truth. No hard-coded brand arrays. | — |

---

## **3. MVS composite — v1.8**

```
MVS = 0.2667 × Pricing Acceptance
    + 0.2667 × Scaled Operator
    + 0.3333 × Enrichment Diversity
    + 0.1333 × Market Depth
    + 0.0000 × Market Balance Index      (review flag — not scored)
    + 0.0000 × Market Absorption          (retired)
```

Rounded to one decimal place. All sub-scores 0–100. Weights exposed as preview sliders per card. MBI's former 0.20 was moved into Enrichment Diversity (was 0.1333 → now 0.3333). Sum = 1.0.

MBI stays visible in the UI as a two-sided review flag. It does not add or subtract composite points; a "saturated" or "unproven" status prompts human review before we bless a city.

---

## **4. Pipeline — self-chaining stage machine**

One manual run per city (subject to freshness rules). Every stage writes to Supabase; the score is recomputed from those rows via the **shared MVS helper** (`src/lib/mvs/computeMvs.ts`) — table row, panel, compare modal, PDF all read from this helper, never from stored composites.

```
discover → step0_exclude → classify → b3 → acs → catchup → reclassify → done
```

Each stage runs as a fresh edge invocation. The orchestrator writes `stage` + `stage_started_at` to `mvs_pipeline_runs` and self-invokes the next stage. Fresh CPU/wall budget per hop. Watchdog: any row still `queued`/`running` after 25 minutes is auto-swept to `failed`.

### Stage — Discovery (Firecrawl + APIs)

* **Tool:** Firecrawl (JS-render on, screenshots on, rotating proxies on) for Sawyer/ActivityHero/Google Search; Apify Google Maps actor; direct Yelp API.
* **Query hygiene:** no `"tuition"`, no generic `"kids classes"`. Approved queries include `"summer day camps in ${city} ${state}"`, plus brand-scoped queries.
* **Sawyer:** single URL `https://www.hisawyer.com/s/summer-camps-for-kids`, local city/state presence required.
* **Yelp:** `summer_camps_for_kids` category slug only, filters out year-round studios/gyms.
* **Google Maps (Apify):** `maxCrawledPlacesPerSearch = 100`, sequential per-query loop to fit inside edge time budget.
* **Extract per provider:** name, weekly price (if visible), category (raw), listing URL, site count in metro, platform, sources[].
* **Persist:** `mvs_providers` row per provider. Listing-page screenshot is stored once in the private `mvs-screenshots` bucket and its path is written to `screenshot_url` on every provider discovered on that page. Raw HTML is NOT saved. Per-provider website screenshots are NOT captured.
* **Sub-cap:** ≤25 Firecrawl calls in this stage.

### Stage — step0_exclude

Non-camp exclusions (daycare, park, retail workshop, drop-in club, etc.) applied before classification. Excluded rows persist with `category_excluded_reason` for audit but are filtered out of every scoring pillar.

### Stage — Classify (Gemini via Lovable AI Gateway)

* Input: every non-excluded row from Discovery.
* Tag each provider: **Premium / Mid / Budget / Community**.
* **Two-gate rule:** Premium requires `price_min ≥ 300 AND price_max ≥ 400` for any priced row. This is enforced post-Gemini in code, not left to the LLM.
* Unpriced rows → **Mid** by default. Unpriced rows matching a `mvs_operator_watchlist` national premium brand → **Premium**.
* Community brands (YMCA, JCC, parks & rec, churches, scouts, etc.) → **Community** regardless of price.
* Childcare-like unpriced rows → **Community** with `category_classified='childcare-excluded'`.
* Runs in **parallel waves of 5** with a 60s per-call timeout and 130s soft deadline.
* Only Premium flows into score calc. Mid/Budget/Community persist for pricing-ladder context.
* **19 eligible categories:** STEM, Robotics, Coding, Science, Maker, Art, Theater, Music, Academic Enrichment, Debate, Chess, Entrepreneurship, Dance, Language, Sports, Swim, Gymnastics, Cooking, Outdoor.

### Stage — B3 (primary pricing pass)

* `mvs-price-b3` reads Google's AI Overview via Apify, extracts weekly price via Gemini, normalizes units.
* Batches of 8; self-chains its own continuation via `waitUntil` (fire-and-forward inside b3 itself).
* Writes `price_min`, `price_max`, `price_unit_raw`, `price_confidence` (`high|medium|review`), `price_source`, `price_source_url`, `price_source_quote`, `ai_overview_snippet`.
* Confidence `review` sets `price_needs_review=true` — surfaced in Provider Evidence for human Verify/Reject/Edit.
* **Not fire-and-forget at orchestrator level** — orchestrator waits for the completion signal before advancing to acs. (Planned refinement: see §11.)

### Stage — ACS

Pulls dual-income households with HH income ≥$150k and children ages 5–12 → **Affluent Dual-Income Family Count** (MBI numerator, `affluent_families_count` on `us_cities_scored`). Children ages 5–12 → denominator for Direct Competitor Load in Score 3.

### Stage — Catchup

Rescue pass for providers still missing prices after B3. Runs the 9-step pricing crawler (see below). This is *not* the primary source — it fills gaps only.

#### Pricing crawler — 9 steps (rescue only after 2026-07-14)

For each provider still missing a price, up to 9 steps. Stops at the first valid price.

1. Google Maps lookup — get name, website, address.
2. Read the camp's own website with Firecrawl.
3. Catch-up Google search in plain English (no `"tuition"`).
4. Read marketplace listings returned by that search — Sawyer, ActivityHero, Yelp, news pages, camp PDFs.
5. Relaxed price rule — dollar number on any trusted source that ties to camp by name.
6. Guards — price must be **$100–$2500/wk**, weekly cadence, tied to camp name. Bad prices dropped with reason chip.
7. Save with proof — clickable source URL, matched query, confidence score.
8. Tier classify — routed back through the two-gate rule.
9. Google AI Overview fallback — same as B3 but as a last resort; results always flagged `review`.

Related fallbacks:
- **B1 — Brand price propagation:** 3+ sibling locations with prices → median proposed for unpriced siblings, flagged for human review.
- **B2 — Directory-first queries:** catch-up search prefers Sawyer/ActivityHero listing URLs when available.
- **B4 — Manual Verify / Reject / Edit** in Provider Evidence Review.

### Stage — Reclassify

Re-runs the classifier over all rows now that B3 + catchup have written real prices. This is where the two-gate rule and unit-normalized prices actually settle each row's tier. **Critical:** this stage must observe B3's writes — see §11 for the in-flight fix.

### Stage — done / done_stale / failed

`done` = success. `done_stale` = fresh crawl failed but saved data ≤120d is used (with `fallback_data_date` set). `failed` = swept or errored out.

### Retired stage (kept for audit only)

* **`mvs-extract-weeks`:** retired no-op shell. No week rows written. No registration-page screenshots produced.

---

## **5. Sub-score formulas + v1.8 reference ranges**

Normalization is **min-max against fixed reference ranges** (capped 0–100). Ranges come from the methodology doc.

### Score 1 — Pricing Acceptance (26.67%)

Only rows with `tier = 'premium'` count. Uses `price_min` per provider as the weekly proxy (falls back to `price_max` if `price_min` is null).

```
0.40 × normalize(median price_min,          range $300–$700)
0.40 × normalize(75th-percentile price_min, range $400–$800)
0.20 × normalize(% Premium at ≥ $500/week,  range 0–100)
```

### Score 2 — Market Absorption — RETIRED (weight 0)

Formula preserved for audit only. Registration-page scraping was unreliable.

### Score 3 — Scaled Operator (26.67%)

```
Operator Validation    = count of distinct watchlist operators present (cap 0–8)
Direct Competitor Load = Σ site counts for operators tagged 'direct'
                         per 10,000 kids ages 5–12

Score = 0.65 × normalize(Operator Validation, 0–8)
      + 0.35 × (100 − normalize(Direct Competitor Load, 0–5 per 10k))
```

Operator watchlist read live from `mvs_operator_watchlist` (name + `aliases[]` + `default_overlap`). Currently 20 rows. City-specific overrides live in `mvs_city_overlap_overrides`.

### Score 4 — Enrichment Diversity (33.33%)

```
Category Count = distinct eligible categories with ≥1 premium provider (of 19)
Score          = normalize(clamp(Category Count, 2, 10), 2, 10) × 100
```

Display-only thin-market flag: if premium provider count < 4, the card shows **"Thin market — low confidence"**. Math is unchanged; the flag prompts human review.

### Score 5 — Market Depth (13.33%)

```
Market Depth Score = normalize(Premium Provider Count, 4–15)
```

Tightened 2026-07-14. Depth answers a threshold question ("is the premium ecosystem large enough to prove camp culture?") that saturates fast; density beyond ~15 is context, not additional validation.

Band labels: 4–7 Emerging · 8–14 Moderate · 15–19 Deep · 20+ Very Deep.

### Score 6 — Market Balance Index (weight 0 — review flag)

```
Balance Ratio = Affluent Dual-Income Family Count ÷ Premium Provider Count

status = "saturated"  if Balance Ratio < 200      (dense supply vs. affluent demand)
       = "unproven"   if Balance Ratio > 8000     (near-empty market — validate culture first)
       = "healthy"    otherwise
       = "unproven"   if premium_count = 0
```

Thresholds (200, 8000) are placeholders — will be recalibrated after ≥20 cities have live data. MBI status surfaces as a card badge; it never adds or subtracts composite points.

---

## **6. Data model (Supabase)**

| Table | Status | Key fields |
| :---- | :---- | :---- |
| mvs_providers | Active | id, city, name, platform, url, website_url, source_listing_url, price_min, price_max, price_original_min, price_original_max, price_unit_raw, price_confidence, price_source, price_source_url, price_source_quote, price_needs_review, price_derived_from_brand, price_derivation_meta, ai_overview_snippet, ai_overview_source_url, verification_status, verified_by, verified_at, verification_notes, category_raw, category_classified, category_excluded_reason, tier, screenshot_url, sources[], confidence, source_run_id |
| mvs_operator_watchlist | Active — SINGLE SOURCE OF TRUTH for national brands | operator_name, aliases[], default_overlap, notes |
| mvs_city_overlap_overrides | Active | city, state, operator_name, overlap |
| mvs_pipeline_runs | Active | id, city, state, triggered_by, started_at, finished_at, status, stage, stage_started_at, error, provider_count, firecrawl_calls, fallback_data_date, source_counts (jsonb) |
| mvs_weeks | Retired | No new writes; legacy rows retained |
| mvs_qa_queue | Retired | Page shows retired notice |
| us_cities_scored.affluent_families_count | Active | Single source of truth for MBI numerator |

Status values on `mvs_pipeline_runs`: `queued`, `running`, `done`, `done_stale`, `failed_no_data`, `failed`.
Stage values: `discover`, `step0_exclude`, `classify`, `b3`, `acs`, `catchup`, `reclassify`, `done`.

**No `mvs_city_scores` table.** Composite + sub-scores are always recomputed from `mvs_providers` + ACS via the shared helper. Brett's "one calibrated number everywhere" rule.

`city_briefs` no longer stores scoring columns as of 2026-07-14 — `composite_score`, `pillar_demand`, `pillar_tam`, `pillar_opp` dropped.

---

## **7. UI behavior (current)**

* **City row:** MVS number from the shared helper. Status chips: Live, Stale-score amber note, or red "Failed" pill. "Run" and outlined "Force fresh" buttons per row.
* **Deep-dive cards (4 scored + 1 flag):** Result → Evidence → Trust → Weight preview → Formula/Sources.
  * Result: plain-English meaning + data-coverage chip.
  * Evidence: numeric rows, each clickable to open a proof popover.
  * Trust: per-pillar confidence chip (High / Medium / Review / Low) with its own reason per card.
  * Weight preview slider: "Contributes X.X of 100 to MVS", live delta. Preview only — never persisted.
  * Collapsibles renamed: "How this score is calculated" and "Where the data comes from (N)".
* **MBI card:** Status badge (Saturated / Healthy / Unproven) + ratio + numerator/denominator. No score number.
* **Provider Evidence page:** Verify / Reject / Edit buttons only on `review` rows. High/medium-confidence rows show quiet chips. Discovery source(s) column shows where the name was found; price source is separate and visible in the confidence-pill receipt popover.
* **Crawler telemetry card:** shows the 4-step catch-up rescue order with a hint that B3 already ran first in the main pipeline.
* **Freshness controls:** 0–90 days → auto-skip toast + persistent amber row badge; 91–120 days → `AlertDialog` prompt "use saved or run fresh"; >120 → fresh crawl. Backend hard-guard enforces same rules. `done_stale` runs use `fallback_data_date` for age math.
* **Known limitations panel** on the page (collapsible).
* **PDF Market Brief:** unchanged in structure — 1-page Exec Summary v1.0, fuller 12-section brief deferred. Data Confidence section (renamed from "Recommended Next Move") closes every brief.
* **Import from Manus CSV:** button on Market Validation page. Client-side parse via `papaparse`. Preview dialog with per-row status chips (Will add / Already in shortlist / Unknown city / Below CSI / Invalid). CSI threshold slider. Dedupe on city+state. Two nullable reference-only columns on `mvs_shortlist_cities`: `manus_csi_score`, `manus_imported_at`. **Never triggers the pipeline.**

---

## **8. Edge functions (server-side)**

| Function | Status | Purpose | Secrets |
| :---- | :---- | :---- | :---- |
| mvs-run-pipeline | Active | Self-chaining stage machine. Enforces freshness pre-check + soft-fail fallback + 50-call cap + sub-caps. 4-min sub-timeouts, 20-min watchdog. | FIRECRAWL_API_KEY, LOVABLE_API_KEY, APIFY_API_TOKEN |
| mvs-discover-providers | Active | Multi-source discovery + 9-step catchup pricing crawler | FIRECRAWL_API_KEY, APIFY_API_TOKEN, APIFY_GOOGLE_MAPS_ACTOR_ID |
| mvs-classify-tier | Active | Post-Gemini two-gate enforcement, parallel waves of 5, 60s per-call timeout | LOVABLE_API_KEY |
| mvs-price-b3 | Active — PRIMARY pricing pass | Google AI Overview via Apify + Gemini unit-aware extraction, self-chaining batches of 8 | LOVABLE_API_KEY, APIFY_API_TOKEN |
| mvs-acs-pull | Active | ACS numerator/denominator refresh | CENSUS_API_KEY |
| mvs-enrich-websites | Active | Optional website enrichment | FIRECRAWL_API_KEY |
| mvs-refresh-all | Active | Batch wrapper | inherits |
| mvs-extract-weeks | Retired (no-op) | Was old Stage 3 reg-page extraction | — |

Client never holds Firecrawl, Apify, or Lovable AI Gateway keys. Every function checks `manager` or `admin` via `user_roles` + `has_role()` before spending a paid-API call. Internal service-role callers bypass the role check via header sniffing.

### Implementation notes (current)

* **Authorization enforced in code**, not just `verify_jwt`.
* **Hard per-run cap of 50 Firecrawl calls** with sub-caps (discover 25, classify 15, extract 15).
* **B3 primary + self-chaining** so Gemini pricing dominates and can never hang the orchestrator.
* **Stage machine** with `stage` + `stage_started_at` columns on `mvs_pipeline_runs`.
* **DB stale-run sweeper** (`mvs_sweep_stale_runs()` on `pg_cron`) marks stuck runs failed after 25 min.
* **Freshness pre-check** shared via `src/lib/mvs/preCrawlFreshness.ts`. Backend re-checks so UI bypass cannot force a crawl.
* **Soft-fail fallback:** finishes as `done_stale` with `fallback_data_date` set.
* **Run traceability:** `source_counts` jsonb tracks per-stage outcomes (`b3_price_pass.in_progress`, `catchup.ran`, etc.).

---

## **9. Calibration gates**

1. **Sample city run** produces clean output at every active stage (smoke test).
2. **Boston MA** lands in the top quartile of the live set.
3. **Every live city row** shows: MVS, all 4 scored sub-scores + MBI status with non-null inputs, real provider names from ≥1 source.
4. **PDF Market Brief** generates in <30s; every numeric claim links to a source URL or screenshot where available.
5. **Slider change** updates the composite on all surfaces (row, panel, compare modal, PDF) using the same helper.
6. **Freshness rules** behave end-to-end: 0–90 skip toast + badge, 91–120 prompt, >120 fresh, force-fresh override — verified in both UI and backend hard-guard.
7. **Two-gate rule** holds: no Premium row has `price_min < 300` or `price_max < 400` (except unpriced national-brand entries after §11 fix).

---

## **10. Aesthetics (visual-design rules for MVS surfaces)**

Captured here per project preference rather than left as one-off tweaks.

* **Card layout order** is fixed: Result → Evidence → Trust → Weight preview → Formula/Sources.
* **Confidence pills**: High (green), Medium (slate), Review (amber), Low (red). Never blue — blue reserved for primary actions.
* **Auto-kept crawler prices** show quiet chips only. Verify/Reject/Edit buttons appear only on `review` rows to keep the page calm.
* **MBI status badge** colors: Saturated (amber), Healthy (green), Unproven (slate). Never green for anything with `premium_count = 0`.
* **Stale-score note** sits UNDER the composite in the city row, not next to it, so the number stays scannable.
* **Discovery source(s)** column is a comma-separated list, never icons only. Icons + label ok; icons alone hurt readability.
* **Numbers**: MVS composite = 1 decimal; sub-scores = 1 decimal; provider counts = integer; prices = `$999`; ratios = 2 decimals.
* **No emojis in card copy.** They break the "Result → Evidence → Trust" scan.

---

## **11. Planned next (approved / in flight)**

* **Fix: reclassify must observe B3 writes.** Orchestrator currently advances past `b3` while pricing is still running in the background, so `reclassify` can decide tiers on empty prices. Fix in flight: either poll `source_counts.b3_price_pass.in_progress` until false (with 8-min cap) or add a completion-signal row before `reclassify`. This is the root cause of Washington, DC showing 4 Premium / 55 total with Pricing Acceptance = 0 (2026-07-21).
* **Fix: national-brand override respects the two-gate.** A brand-name match with a real price below `min ≥ 300 AND max ≥ 400` should go to Mid, not Premium. Steve & Kate's at $114–134 should not have carried Premium.
* **Backfill:** one-time reclassify for every city already run (Austin, Nashville, Phoenix, Washington DC, etc.).

---

## **12. Out of scope for v1.8 (do not drift)**

* Apify Google Maps as a **separate** discovery source (it already runs — do not double-count).
* Inngest / Trigger.dev scheduling.
* Time-to-Sellout and YoY Velocity (need multi-scrape history).
* Scaled Operator "Years in City" signal.
* Moving MBI back into the scored composite.
* Across-shortlist normalization (need ≥20 live cities first).
* Reviving Market Absorption / registration-page scraping.
* Storing composite scores in the DB (helper-only rule stands).
