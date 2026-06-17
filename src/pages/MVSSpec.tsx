import { FileText, ShieldCheck } from "lucide-react";
import { DocShell, DocCard } from "@/components/DocShell";
import { DownloadMDButton } from "@/components/DownloadMDButton";

// Mirror of docs/feature-1a-mvs-v1-spec.md kept here so the page is self-contained
// and downloadable from the app. If the .md file changes, update this constant too.
const SPEC_MD = `# Feature 1A Market Validation Spec doc by Lovable

# **Feature 1A — Market Validation Engine**

## **v1.0 Spec (Lovable internal)**

**Status:** Spec only. Build plan to follow. **Source of truth:** This chat + MVS Methodology doc. **Naming:** MVS (Market Validation Score). Do not surface PEES anywhere in the app or PDF.

---

## **1. What this feature does**

Takes a city from the shortlist and produces a **single composite score (MVS, 0–100)** that answers: *"Is this a validated premium enrichment market with active, paying demand?"*

Output surfaces:

* MVS number on the city row in the shortlist table.
* 6 sub-score breakdown in the city detail panel.
* Premium provider table (real names, prices, weekly sellout status).
* Branded PDF Market Brief.
* Every score traces to a source URL and a stored screenshot.

Not in scope: predicting any individual Neuron Garage location's success. Site-level work lives in Feature 1B.

---

## **2. v1.0 scope guardrails (the "easy route")**

| Decision | v1.0 | Deferred to |
| :---- | :---- | :---- |
| Discovery source | **Sawyer only** | ActivityHero v1.1, Apify v1.1 (next week) |
| Scheduling | **Manual trigger** ("Run Pipeline" button per city) | Inngest/Trigger.dev post-client-meeting |
| Cities in scope | **7 Tier A cities + Austin** (calibration) | 14 Tier B cities stay on Sample Data badge |
| Scrape cadence | **1 scrape per city per run** | 5-scrape Jan/Feb/Mar/Apr/May in v2 |
| Market Absorption formula | **Sellout Rate only** (carries full weight) | Time-to-Sellout + YoY Velocity in v2 |
| Normalization | **Fixed reference ranges** (see §5) | Across-shortlist normalization once ≥20 cities have live data |
| QA queue | **In-app review UI**, confidence < 0.7 routes there | — |

**Tier A cities (v1.0 launch set):** New York NY, Houston TX, Chicago IL, Boston MA, San Antonio TX, Philadelphia PA, Los Angeles CA. **Calibration test city (run first):** Austin TX.

---

## **3. MVS composite — unchanged from methodology**

MVS = 0.20 × Pricing Acceptance
    + 0.25 × Market Absorption          ← dominant demand signal
    + 0.20 × Scaled Operator
    + 0.10 × Enrichment Diversity
    + 0.10 × Market Depth
    + 0.15 × Market Balance Index

Rounded to one decimal place. All sub-scores 0–100. Weights exposed as sliders with Show Formula drawers per v1.0 doctrine.

**SOW divergence flag (for client meeting, not for v1.0 build):** SOW v2.2 says Market Balance sits *next to* the composite, not inside it. v1.0 follows the methodology (inside, 15%) because the demo UI already renders it that way and "easy route" means no UI rework. We surface this as an open question for Sam.

---

## **4. Pipeline — 5 stages**

One manual run per city. Stages 1–4 write to Supabase, Stage 5 reads from Supabase and computes scores via the **shared MVS helper** (Brett's "one calibrated number everywhere" rule — table, panel, compare modal, PDF all read from this helper, never from stored scores).

Stage 1 → Sawyer search scrape         → discovery + pricing + listing URLs
Stage 2 → Premium tier classification  → filter to Premium (≥$400/wk, eligible category)
Stage 3 → Registration page extraction → week-level status + screenshots
Stage 4 → Census ACS pull              → Market Balance + Operator denominators
Stage 5 → Score calculation            → 6 sub-scores → MVS composite

### **Stage 1 — Sawyer discovery (Firecrawl)**

* **Tool:** Firecrawl, JS-render wait on, full-page screenshot on, rotating proxies on.
* **URL pattern:** https://www.sawyertools.com/camps?location={city} (confirm exact pattern on Austin run).
* **Extract per provider:** name, weekly price, category (raw), individual Sawyer listing URL, site count in metro, platform = "sawyer".
* **Persist:** providers table + screenshot in Supabase Storage keyed by scrape date + URL.

### **Stage 2 — Premium tier classification (Gemini 2.0 Flash via Lovable AI Gateway)**

* Input: every row from Stage 1.
* Tag each provider: **Premium / Mid / Budget / Community** (4-tier per methodology).
* Only Premium flows into score calc. Other tiers persist for pricing-ladder context.
* Eligible categories for Premium: STEM, Robotics, Coding, Science, Maker, Art, Theater, Music, Academic Enrichment, Debate, Chess, Entrepreneurship.

### **Stage 3 — Registration page extraction (Firecrawl + Gemini)**

* For each Premium provider's Sawyer listing URL, fetch the page (JS-render wait), screenshot it, then Gemini extracts a strict JSON of week records.
* **Week status enum (5 values only):** sold_out | waitlist | low_availability | open | unknown.
* **JSON schema per week:** week_label, theme, price, age_range, status, status_evidence, confidence (0–1).
* **Confidence gate:** ≥0.7 → write to weeks table; <0.7 → write to weeks AND insert into qa_queue.
* **Low-confidence city badge:** if >20% of Premium providers have no public registration page, city gets a "Low Confidence" badge on the row.

### **Stage 4 — Census ACS pull (reused pipeline from v1.0)**

* Pulls: dual-income households with HH income ≥$150k and children ages 5–12 → "Affluent Dual-Income Family Count" (denominator for Score 6).
* Children ages 5–12 → denominator for Direct Competitor Load in Score 3.

### **Stage 5 — Score calculation**

See §5. All math lives in **one helper** (e.g. src/lib/mvs/computeMvs.ts). Every UI surface reads from it. No stored composite scores on the row — always recomputed.

---

## **5. Sub-score formulas + v1.0 reference ranges**

Normalization in v1.0 is **min-max against fixed reference ranges** (capped 0–100), not across the live 7-city set. Ranges below come from the methodology doc.

### **Score 1 — Pricing Acceptance (20%)**

0.40 × normalize(median weekly price,       range $300–$700)
0.40 × normalize(75th-percentile price,     range $400–$800)
0.20 × (% Premium providers at ≥ $500/week,  0–100)

### **Score 2 — Market Absorption (25%) — v1.0 = Sellout Rate only**

Sellout Rate            = (sold_out weeks + waitlist weeks) ÷ total weeks scraped
Market Absorption Score = normalize(Sellout Rate, range 0%–80%)

Time-to-Sellout and YoY Velocity display in the drawer as "Year 2 signal — not yet computed."

### **Score 3 — Scaled Operator (20%)**

Operator Validation    = count of distinct watchlist operators present (cap 0–8)
Direct Competitor Load = Σ site counts for operators tagged 'direct'
                         per 10,000 kids ages 5–12

Scaled Operator Score =
  0.65 × normalize(Operator Validation, 0–8)
+ 0.35 × (100 − normalize(Direct Competitor Load, 0–5 per 10k))

Operator watchlist (seed, editable in UI): Galileo, Steve & Kate's, Camp Invention, Snapology, Code Ninjas, iD Tech, Mad Science, Engineering For Kids, Bricks 4 Kidz, Kids Inventor Lab, Maker Kids, theCoderSchool, Wiz Kidz, Sylvan summer, Mathnasium summer. Each tagged default direct/adjacent/distant, editable per city.

**SOW divergence flag:** SOW v2.2 adds a "Years in City" signal we don't have a source for in v1.0. Deferred to v1.1 with the Apify add.

### **Score 4 — Enrichment Diversity (10%)**

Category Count  = distinct eligible categories with ≥1 premium provider
Diversity Ratio = Category Count ÷ Premium Provider Count

Score = 0.70 × normalize(Category Count, 2–10)
      + 0.30 × normalize(Diversity Ratio, 0.1–0.6)

### **Score 5 — Market Depth (10%)**

Market Depth Score = normalize(Premium Provider Count, 4–40)

### **Score 6 — Market Balance Index (15%)**

Coverage Ratio = Affluent Dual-Income Family Count ÷ Premium Provider Count
Score          = normalize(Coverage Ratio, 50–500)

Tier labels:
  ≥ 350  Underserved
  200–349 Balanced
  100–199 Competitive
  < 100   Saturated

---

## **6. Data model (Supabase)**

| Table | Key fields |
| :---- | :---- |
| mvs_providers | provider_id, provider_name, city, state, weekly_price, category_raw, category_classified, tier, listing_url, site_count, platform, scraped_at, screenshot_url |
| mvs_weeks | week_id, provider_id, city, state, scrape_date, week_label, theme, price, age_range, status, status_evidence, confidence, screenshot_url, flagged_for_qa |
| mvs_qa_queue | week_id, provider_id, screenshot_url, gemini_classification, confidence, corrected_status, reviewed_by, reviewed_at |
| mvs_operator_watchlist | operator_name, default_overlap, notes |
| mvs_city_overlap_overrides | city, state, operator_name, overlap (per-city tag overrides) |
| mvs_pipeline_runs | run_id, city, state, triggered_by, started_at, completed_at, status, error, provider_count, week_count, qa_flagged_count |

Tables are namespaced mvs_* so they don't collide with v1.0 City Search tables. Standard RLS + GRANTs per project conventions. Screenshots in Supabase Storage bucket mvs-screenshots.

**No mvs_city_scores table.** Composite + sub-scores are always recomputed from mvs_providers + mvs_weeks + ACS via the shared helper. This is Brett's "one calibrated number everywhere" rule applied to 1A.

---

## **7. UI behavior (what changes on existing demo surfaces)**

* **City row:** MVS number from the shared helper. Badge: Live (Tier A) or Sample Data (Tier B) or Low Confidence (>20% missing reg pages).
* **City detail panel:** 6 sub-score cards, each with Show Formula drawer. Drawer shows the formula, the inputs, the normalize range used, and the resulting normalized 0–100 value.
* **Premium provider table:** real rows from mvs_providers filtered to tier = Premium for the city, with weekly price and a status pill rolled up from mvs_weeks.
* **"Run Pipeline" button:** manual trigger per city (admin only). Disabled while a run is in flight. Surfaces mvs_pipeline_runs status.
* **QA Queue page:** lists weeks with flagged_for_qa = true, side-by-side screenshot + Gemini classification + correction form.
* **Weight sliders:** persist per user, reset-to-defaults button. Sliders recompute the composite via the same helper, no separate code path.
* **PDF Market Brief:** 12 sections per SOW Addendum A — Exec Summary, MVS Composite, Market Balance Index, Pricing Analysis, Enrichment Diversity, Scaled Operator, Market Depth, Market Strengths, Market Risks, SWOT, Recommendation, Sources & Screenshots appendix. Generates in <30s.

---

## **8. Edge functions (server-side)**

| Function | Purpose | Secrets |
| :---- | :---- | :---- |
| mvs-run-pipeline | Orchestrates Stages 1–4 for a single city | FIRECRAWL_API_KEY, LOVABLE_API_KEY |
| mvs-extract-providers | Stage 1 + Stage 2 | FIRECRAWL_API_KEY, LOVABLE_API_KEY |
| mvs-extract-weeks | Stage 3, city-parametrized: loops Premium Sawyer providers for given city, scrapes + extracts weeks, writes mvs_weeks + mvs_qa_queue, sets low-confidence badge | FIRECRAWL_API_KEY, LOVABLE_API_KEY |
| mvs-acs-pull | Stage 4 (reuse v1.0 ACS pipeline) | existing |
| mvs-generate-brief | Server-side PDF generation | none beyond Supabase |

Client never holds Firecrawl or Lovable AI Gateway keys.

### Phase 3 implementation notes (locked in as we built)

* **Authorization is enforced in code.** See next bullet — every Stage-3 function requires a manager/admin role before doing any work.
* **Authorization is enforced in code.** Both Stage-3 functions require \`manager\` or \`admin\` via \`user_roles\` + \`has_role()\`. The \`verify_jwt\` flag is not relied on.
* **Stage 3 is an inline orchestrator, not N nested HTTP calls.** \`mvs-extract-weeks\` runs the per-provider scrape+extract logic inline, sequentially, in one function (city is a parameter). Chosen over re-invoking a single-provider function N times because nested edge-function hops are slower and make the Firecrawl cost ceiling harder to enforce. Same DB end state, same screenshots, same QA queue behavior.
* **Hard per-run cap of 25 providers** on the orchestrator (\`MAX_PROVIDERS = 25\`). Keeps a single Austin run under the plan's 30-Firecrawl-call ceiling (1 discovery + up to 25 provider scrapes + headroom). Tunable if Austin Premium grows past 25.
* **Sequential, not parallel.** Providers are scraped one at a time to keep Firecrawl spend predictable and avoid hammering Sawyer.
* **"No public registration page" definition** (used for the city low-confidence badge): a provider counts as \`no_reg_page\` if (a) its \`url\` is null/missing, OR (b) Firecrawl returns non-2xx, OR (c) Firecrawl returns markdown shorter than 200 chars. If >20% of Austin Premium providers hit this, \`mvs_city_flags.low_confidence_badge\` is set to true for Austin and \`last_run_id\` is stamped.
* **QA queue threshold** is \`confidence < 0.7\`. Rows land in \`mvs_weeks\` regardless; low-confidence ones also get an \`mvs_qa_queue\` row (\`entity_type='week'\`) with the reason string.
* **Screenshots** stored in private bucket \`mvs-screenshots\` at \`<run_id>/weeks-<provider_id>.png\`. Every \`mvs_weeks\` row stores the path in \`screenshot_url\`.
* **Run traceability.** Each invocation opens an \`mvs_pipeline_runs\` row (\`status='running'\`), updates \`firecrawl_calls\`, closes with \`done\` or \`failed\` + \`error\`. Every \`mvs_weeks\` row carries \`source_run_id\`.

---

## **9. Calibration gates (must pass before client meeting)**

1. **Austin run produces clean output at every stage** (smoke test before opening Tier A).
2. **Boston MA lands in the top quartile** of the live Tier A set (proxy for SOW's full top-quartile list, which we can't fully test until v1.1 expands coverage).
3. **Every Tier A city row** shows: live MVS, all 6 sub-scores with non-null inputs, real provider names, at least one stored screenshot per provider.
4. **PDF Market Brief** generates in <30s and every numeric claim links to a source URL or screenshot.
5. **Slider change** updates the composite on all 5 surfaces (row, panel, compare modal, weight drawer, PDF) using the same helper. Brett's rule.

---

## **10. Out of scope for v1.0 (write down so we don't drift)**

* ActivityHero, CampBrain, CampMinder discovery.
* Apify Google Maps discovery.
* Inngest/Trigger.dev scheduling.
* Time-to-Sellout and YoY Velocity (need multi-scrape history).
* Scaled Operator "Years in City" signal.
* Moving Market Balance outside the composite (open question for Sam).
* Tier B city pipeline runs (stay on Sample Data badge).
* Across-shortlist normalization (need ≥20 live cities first).
`;

const LOCKED_IN = [
  "MVS (Market Validation Score) — single per-city composite",
  "6 sub-scores, normalized 0–100 across the shortlist",
  "Market Balance INSIDE the composite at 15%",
  "Sawyer-only data source (no ActivityHero, no Apify until v1.1)",
  "Manual trigger only — manager-only Run Pipeline button",
  "7 Tier A cities (NYC, Houston, Chicago, Boston, San Antonio, Philadelphia, LA) + Austin calibration",
  "Tier B cities stay on sample data until v1.1",
  "Year 1: single mid-March scrape. Sellout Rate only.",
];

const EXCLUDED = [
  "ActivityHero, CampMinder, CampBrain, any non-Sawyer platform",
  "Apify Google Maps actor",
  "Inngest / Trigger.dev scheduling",
  "Time-to-Sellout and YoY Velocity as scored inputs",
  "Scaled Operator \"Years in City\" sub-component",
  "Moving Market Balance outside the composite",
  "Tier B pipeline runs",
  "Across-shortlist normalization changes",
];

export default function MVSSpec() {
  return (
    <DocShell
      eyebrow="Feature 1A · v1.0 Spec"
      eyebrowIcon={ShieldCheck}
      title="Market Validation Engine — v1.0 Spec"
      subtitle="Locked scope, naming, and design decisions. The Build Plan executes against this spec turn-by-turn. Re-read before starting any new turn."
      action={<DownloadMDButton content={SPEC_MD} filename="feature-1a-mvs-v1-spec.md" />}
    >
      <DocCard>
        <div className="space-y-10">

          <section>
            <h2 className="text-base font-bold text-[#07142f] mb-3">Composite formula (locked)</h2>
            <pre className="rounded-md border border-[#cfdcff] bg-[#f4f8ff] px-4 py-3 text-[13px] font-mono text-[#07142f] leading-relaxed whitespace-pre-wrap">
{`MVS = 0.20 × Pricing Acceptance
    + 0.25 × Market Absorption        ← dominant, demand-side
    + 0.20 × Scaled Operator
    + 0.10 × Enrichment Diversity
    + 0.10 × Market Depth
    + 0.15 × Market Balance           ← inside the composite`}
            </pre>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#07142f] mb-3">What v1.0 IS</h2>
            <ul className="space-y-2">
              {LOCKED_IN.map((item) => (
                <li key={item} className="flex gap-2 text-[14px] text-[#1a2540] leading-relaxed">
                  <span className="text-[#174be8] font-bold flex-shrink-0">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#07142f] mb-3">What v1.0 is NOT (do not build)</h2>
            <ul className="space-y-2">
              {EXCLUDED.map((item) => (
                <li key={item} className="flex gap-2 text-[14px] text-[#1a2540] leading-relaxed">
                  <span className="text-[#b91c1c] font-bold flex-shrink-0">✗</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#07142f] mb-3">Premium Provider Definition</h2>
            <div className="overflow-hidden rounded-md border border-[#cfdcff]">
              <table className="w-full text-[13px]">
                <thead className="bg-[#f4f8ff] text-[#174be8]">
                  <tr>
                    <th className="text-left px-4 py-2 font-bold">Tier</th>
                    <th className="text-left px-4 py-2 font-bold">Definition</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  <tr className="border-t border-[#eef2f7]">
                    <td className="px-4 py-3 font-bold text-[#07142f]">Premium</td>
                    <td className="px-4 py-3 text-[#1a2540]">Price ≥ $400/week AND STEM/maker/robotics/coding/science/art/theater/music/academic enrichment AND not childcare-positioned</td>
                  </tr>
                  <tr className="border-t border-[#eef2f7]">
                    <td className="px-4 py-3 font-bold text-[#07142f]">Mid</td>
                    <td className="px-4 py-3 text-[#1a2540]">$250–$399/week, enrichment-positioned</td>
                  </tr>
                  <tr className="border-t border-[#eef2f7]">
                    <td className="px-4 py-3 font-bold text-[#07142f]">Budget</td>
                    <td className="px-4 py-3 text-[#1a2540]">&lt; $250/week OR community/parks-and-rec/YMCA-positioned</td>
                  </tr>
                  <tr className="border-t border-[#eef2f7]">
                    <td className="px-4 py-3 font-bold text-[#07142f]">Community</td>
                    <td className="px-4 py-3 text-[#1a2540]">Faith-based, scholarship-driven, or municipally subsidized</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[13px] text-[#1a2540] leading-relaxed">
              Only <strong>Premium</strong>-tier providers flow into the six sub-scores. Mid / Budget / Community are retained for audit.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#07142f] mb-3">Operating doctrine</h2>
            <div className="space-y-2 text-[14px] text-[#1a2540] leading-relaxed">
              <p><strong>One calibrated number everywhere.</strong> Single helper <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">src/lib/mvs/computeMvs.ts</code>. No DB-stored composites.</p>
              <p><strong>Demo path stays alive.</strong> Per-city <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">mvs_data_source</code> flag gates live vs sample. Cutover is per-city, reversible in one SQL statement.</p>
              <p><strong>Manager-gated runs.</strong> Every pipeline edge function checks <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">user_roles</code> for manager/admin before spending a single Firecrawl call.</p>
              <p><strong>Atomic &amp; reversible turns.</strong> Each turn ships one concern with an explicit unwind. No invented turns, no scope creep.</p>
              <p><strong>Surface area:</strong> <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">mvs_*</code> tables, <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">mvs-*</code> functions, <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">src/lib/mvs/*</code>, <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">src/pages/MarketValidation*</code>, <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">src/components/phase2-demo/*</code>. No edits elsewhere.</p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#07142f] mb-3">Five open questions — all answered yes</h2>
            <ol className="space-y-2 text-[14px] text-[#1a2540] leading-relaxed list-decimal pl-5">
              <li>Sawyer-only for v1.0, defer ActivityHero / Apify to v1.1? <strong>Yes.</strong></li>
              <li>Keep canonical name MVS (drop PEE and PCC)? <strong>Yes.</strong></li>
              <li>Six sub-scores per methodology, Market Balance inside composite at 15%? <strong>Yes.</strong></li>
              <li>Manual trigger only in v1.0 (no scheduler)? <strong>Yes.</strong></li>
              <li>Roll out to 7 Tier A cities after Austin calibration, Tier B stays on sample until v1.1? <strong>Yes.</strong></li>
            </ol>
            <p className="mt-3 text-[12px] text-[#5a6a85] italic">
              Reconstructed from the locked decisions. If the exact original wording matters, paste it in chat and I'll replace this section verbatim.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#07142f] mb-3">Related</h2>
            <ul className="space-y-2 text-[14px] text-[#174be8]">
              <li className="flex items-center gap-2"><FileText size={14} /><a href="/mvs-methodology" className="hover:underline">MVS Methodology — the 6 sub-score math</a></li>
              <li className="flex items-center gap-2"><FileText size={14} /><span className="text-[#1a2540]">Build Plan: <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">docs/feature-1a-build-plan.md</code> (in repo)</span></li>
            </ul>
          </section>

        </div>
      </DocCard>
    </DocShell>
  );
}
