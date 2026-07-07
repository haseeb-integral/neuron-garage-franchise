import { BarChart3, Info, Database } from "lucide-react";
import { DocShell, DocCard } from "@/components/DocShell";
import { DownloadMDButton } from "@/components/DownloadMDButton";

function FormulaBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="rounded-md border border-[#cfdcff] bg-[#f4f8ff] px-4 py-3 text-[13px] font-mono text-[#07142f] leading-relaxed whitespace-pre-wrap">
      {children}
    </pre>
  );
}

function SectionTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 mb-3">
      <span className="text-[11px] font-bold uppercase tracking-wider text-[#174be8]">
        Section {n}
      </span>
      <h2 className="text-base font-bold text-[#07142f]">{children}</h2>
    </div>
  );
}

type SubScore = {
  n: number;
  name: string;
  weight: string;
  question: string;
  formula: string;
  detail: string;
  sources: string[];
};

const SUB_SCORES: SubScore[] = [
  {
    n: 1,
    name: "Pricing Acceptance",
    weight: "26.67%",
    question: "Are families already paying Neuron Garage–level prices?",
    formula: `Pricing Acceptance Score =
  0.40 × normalize(median weekly price,    range $300–$700)
+ 0.40 × normalize(75th-percentile price,  range $400–$800)
+ 0.20 × (% of premium providers at ≥ $500/week)`,
    detail:
      "Built from the shape of the local premium price distribution, not from demographic income. The 75th percentile is the Neuron Garage positioning anchor.",
    sources: [
      "Provider websites (weekly camp prices)",
      "Camp registration platforms: Sawyer, ActivityHero, CampBrain, CampMinder",
      "Camp directories and aggregator listings",
      "Discovery via Apify Google Maps actor",
      "Extraction via Firecrawl → Gemini 2.0 Flash (Lovable AI Gateway) into strict JSON",
      "Same data pull as Market Absorption — collected once",
    ],
  },
  {
    n: 2,
    name: "Market Absorption (Removed v1.1)",
    weight: "0%",
    question: "Are existing premium operators actually selling out?",
    formula: `Market Absorption Score =
  0.60 × normalize(Sellout Rate,        range 0%–80%)
+ 0.25 × normalize(Time-to-Sellout,     inverse — earlier = higher)
+ 0.15 × normalize(YoY Velocity,        range −20% to +30%)

Sellout Rate = (sold_out weeks + waitlist weeks) ÷ total weeks scraped`,
    detail:
      "DEPRECATED in v1.1. Removed from the composite (weight set to 0) because sellout-rate scraping was unreliable. The remaining five pillars were proportionally re-normalized. Kept here for historical/audit reference.",
    sources: [
      "Provider registration pages scraped week-by-week (sold_out / waitlist / low_availability / open / unknown)",
      "Apify Google Maps actor (discovery)",
      "Firecrawl (page fetch, JS render wait for Sawyer/CampMinder, listing-page screenshot)",
      "Gemini 2.0 Flash via Lovable AI Gateway (structured extraction with status_evidence + confidence)",
      "Supabase Storage (private archive of listing-page screenshots only — not raw HTML, not per-provider websites)",
      "Supabase Postgres (week-level data store)",
      "Inngest or Trigger.dev (scheduled 5-scrape cadence: mid-Jan / Feb / Mar / Apr / May)",
      "Internal QA review queue for any week with confidence < 0.7",
    ],
  },
  {
    n: 3,
    name: "Scaled Operator",
    weight: "26.67%",
    question: "Have sophisticated enrichment operators already validated this market — without saturating it?",
    formula: `Operator Validation     = count of distinct national operators present (capped 0–8)
Direct Competitor Load  = Σ site counts for operators tagged 'direct'
                          per 10,000 kids ages 5–12

Scaled Operator Score =
  0.65 × normalize(Operator Validation, range 0–8)
+ 0.35 × (100 − normalize(Direct Competitor Load, range 0–5 per 10k))`,
    detail:
      "Two opposing numbers. Validation good, direct competition bad. Each operator is tagged direct / adjacent / distant; tags are editable per city.",
    sources: [
      "National Operator Watchlist (seed, editable in slider UI): Galileo, Steve & Kate's, Camp Invention, Snapology, Code Ninjas, iD Tech, Mad Science, Engineering For Kids, Bricks 4 Kidz, Kids Inventor Lab, Maker Kids, theCoderSchool, Wiz Kidz, Sylvan summer, Mathnasium summer",
      "Apify Google Maps actor (local site counts per operator in the metro)",
      "Per-operator overlap classification (direct / adjacent / distant) — default stored, editable per city",
      "Census ACS — children ages 5–12 denominator for Direct Competitor Load",
    ],
  },
  {
    n: 4,
    name: "Enrichment Diversity",
    weight: "13.33%",
    question: "Do families in this market invest across a variety of enrichment categories?",
    formula: `Category Count   = number of distinct enrichment categories with ≥1 premium provider

Enrichment Diversity Score =
  normalize( clamp(Category Count, 2, 10), 2, 10 ) × 100

Display-only flag: if Premium Provider Count < 4, show "Thin market — low confidence" next to the score.`,
    detail:
      "This score measures enrichment breadth only. Deep-but-narrow markets floor automatically via low category count — we no longer penalise large healthy markets with a category-to-provider ratio. Eligible categories (19 in the live classifier): STEM, Robotics, Coding, Science, Maker, Art, Theater, Music, Academic Enrichment, Debate, Chess, Entrepreneurship, Dance, Language, Sports, Swim, Gymnastics, Cooking, Outdoor.",
    sources: [
      "Same premium-provider universe from Apify + Firecrawl",
      "Category classification by Gemini 2.0 Flash against the eligible category list",
      "No new data source — purely derived from the premium-provider table",
    ],
  },
  {
    n: 5,
    name: "Market Depth",
    weight: "13.33%",
    question: "How large is the premium enrichment ecosystem?",
    formula: `Premium Provider Count = count of distinct premium enrichment providers in market

Market Depth Score = normalize(Premium Provider Count, range 4–40)`,
    detail:
      "Deliberately simple and auditable. A market with 40 premium providers behaves very differently from one with 4. Most of the signal is already captured by the other five scores — hence the modest 10% weight.",
    sources: [
      "Apify + Firecrawl + Gemini extraction (shared with Scores 1, 2, 4)",
      "Premium tier classification applied at ingest (see Premium Provider Definition below)",
    ],
  },
  {
    n: 6,
    name: "Market Balance",
    weight: "20%",
    question: "Is there still room in this market?",
    formula: `Coverage Ratio = Affluent Dual-Income Family Count ÷ Premium Provider Count
                 (families = dual-income, HH income ≥ $150k, kids ages 5–12)

Market Balance Index = normalize(Coverage Ratio, range 50–500)

  ≥ 350    → Underserved
  200–349  → Balanced
  100–199  → Competitive
  < 100    → Saturated`,
    detail:
      "The supply–demand bridge that doesn't require capacity modeling. Pairs the affluent target-family count from Census ACS against the premium-provider count from the same scrape feeding all other scores.",
    sources: [
      "Census ACS (already wired in v1.0): dual-income households, HH income ≥ $150k, children ages 5–12",
      "Premium Provider Count from the shared Apify + Firecrawl scrape",
      "No additional scraping cost",
    ],
  },
];

type DiscoverSource = {
  key: string;
  name: string;
  tool: string;
  query: string;
  retry: string;
  confirmedEmpty: string;
  failureModes: string;
};

const DISCOVER_SOURCES: DiscoverSource[] = [
  {
    key: "google_maps",
    name: "Google Maps",
    tool: "Apify Google Maps actor",
    query: "Two search strings: 'kids summer camp [City] [ST]' and 'kids classes [City] [ST]', scoped to the city metro.",
    retry: "3 tries. If attempt 1 returns 0 providers, wait 15 seconds. If attempt 2 still returns 0, wait 60 seconds and try once more.",
    confirmedEmpty: "0 providers after all 3 attempts. This is a critical source, so it triggers a red pill on the city row.",
    failureModes: "Google rate-limits or blocks the Apify actor; the actor times out; the location query returns no mapped places for this metro.",
  },
  {
    key: "google_search",
    name: "Google Search",
    tool: "Firecrawl /v2/search",
    query: "Plain-English listicle searches like 'best summer camps for kids in [City] [ST] 2026', 'best kids activities classes [City] [ST]', '[City] [ST] after school programs enrichment kids', etc. Social and marketplace sites are filtered out.",
    retry: "3 tries with 15s and 60s waits between attempts when 0 providers are returned.",
    confirmedEmpty: "0 providers after 3 attempts. This is a critical source, so it triggers a red pill.",
    failureModes: "Google blocks or CAPTCHAs the search; Firecrawl rate-limits or times out; all returned pages are filtered-out social sites or directories.",
  },
  {
    key: "yelp",
    name: "Yelp",
    tool: "Firecrawl /v2/scrape",
    query: "Yelp search page for 'Kids Activities' in [City], [ST].",
    retry: "3 tries with 15s and 60s waits.",
    confirmedEmpty: "0 providers after 3 attempts. This is a secondary source, so it contributes to a yellow pill only if 1–2 secondary sources are empty.",
    failureModes: "Yelp anti-bot blocks Firecrawl; the page renders without business listings; Yelp's '$', '$$', '$$$' symbols are ignored as prices.",
  },
  {
    key: "sawyer",
    name: "Sawyer",
    tool: "Firecrawl /v2/scrape with a 3-second JS render wait",
    query: "hisawyer.com marketplace URLs for camps and classes inside a metro bounding box around [City]. We run 3 search variants (camp + STEM categories, general camp, and class).",
    retry: "3 tries with 15s and 60s waits.",
    confirmedEmpty: "0 providers after 3 attempts. Secondary source — contributes to a yellow pill if 1–2 secondary sources are empty.",
    failureModes: "Sawyer is a JS-heavy single-page app; the render wait may miss listings; the metro bounding box may not cover the entire market; individual activity-detail pages may be expired.",
  },
  {
    key: "activityhero",
    name: "ActivityHero",
    tool: "Firecrawl /v2/scrape with a 5-second JS render wait",
    query: "activityhero.com/camps/[city]-[state], activityhero.com/classes/[city]-[state], and a search for 'kids' in [City] [ST].",
    retry: "3 tries with 15s and 60s waits.",
    confirmedEmpty: "0 providers after 3 attempts. Secondary source — contributes to a yellow pill if 1–2 secondary sources are empty.",
    failureModes: "ActivityHero's SPA shell can load blank; anti-bot blocks the scrape; expired or unlisted activities return empty pages; marketplace links are rewritten to a Google search so users land on real sites.",
  },
];

const MVS_NOTES = [
  "Every sub-score is normalized 0–100 across the shortlisted cities, not nationally. The MVS is a comparative score for the cities that survived Feature 1, not a universal market grade.",
  "Market Absorption (Score 2) is permanently retired. The weekly sellout/registration-page scrape (mvs-extract-weeks) and its 5-scrape cadence (Jan / Feb / Mar / Apr / May via Inngest / Trigger.dev) have been turned off. Sellout Rate, Time-to-Sellout, and YoY Velocity are no longer computed. The remaining five pillars were re-normalized so weights still sum to 1.0.",
  "Listing-page screenshots are saved for the discovery sources we crawl (Sawyer, Yelp, Google, etc.), stored privately in Supabase Storage with date and source URL. One screenshot is shared by every provider discovered on that listing page — we do NOT save a screenshot of each provider's own website, and we do NOT save the raw HTML.",
  "Per-pillar confidence. Each card on the city deep-dive shows its own Trust block with a Low / Medium / High level and a plain-English reason that uses only that pillar's inputs (e.g. Pricing: \"8 of 12 providers had readable prices\"; Diversity: \"4 of 19 providers had a category tag\"). The old global low-confidence badge (triggered by >20% of providers missing a registration page) is retired.",
  "Card layout is Result → Evidence → Trust → Weight preview → Formula / Sources. Every Evidence row is click-through: open the popover to see the actual providers, categories, or ACS rows behind the number, each with a freshness pill and source label.",
  "Freshness rules avoid wasted crawls. If saved data is 0–90 days old the Run button uses saved data automatically (zero Firecrawl spend). 91–120 days asks \"use saved or run fresh?\". Over 120 days runs a fresh crawl. \"Force fresh\" always overrides. The backend enforces the same rule so the check can't be bypassed.",
  "Soft-fail fallback keeps a score visible when a fresh crawl fails. If saved provider data ≤ 120 days exists, the run status becomes done_stale, the saved score stays on the page, and an amber banner shows the fallback date. If saved data is > 120 days the status becomes failed_no_data with a red pill and the real error in the tooltip. Freshness age is computed from fallback_data_date for done_stale runs (not finished_at), so a stale fallback never looks \"new\".",
  "Pipeline runs are manager-gated — every edge function enforces a manager/admin role check before spending a Firecrawl call. The total Firecrawl cap per run is 50, with per-step sub-caps (discover ≤ 25, classify ≤ 15, extract ≤ 15) so no single step can run away. Classification runs in parallel waves of 5 to prevent timeouts.",
  "QA queue is for live extraction flags only (e.g. low-confidence pricing parses). The retired \"no registration page found\" reason is filtered out of the queue and the QA count pill so it can't inflate confidence numbers.",
  "v1.6 — Crawler Telemetry card. Each city detail panel shows a small telemetry card counting where its prices came from: Direct (camp's own site), B1 Brand-propagated (median of ≥3 sibling locations), B2 Directory (Sawyer/ActivityHero listing), B3 Google AI Overview (needs human verify). Lets us see, per city, how much of the price data is high-trust vs needs-review.",
  "v1.6 — Regression Guard. After every pipeline run we write a row to mvs_tier_snapshots (per-tier premium/mid/budget counts). If premium count drops ≥ 20% vs the last snapshot, the header notification bell fires a system notification for the user who ran the pipeline. Prevents silent regressions when a source changes shape.",
  "v1.6 — Tier re-classify after Catch-Up. When steps 3–9 of the pricing crawler find a price for a camp that was previously priced-null or mid-tier, the tier classifier re-runs so the camp lands in its correct tier. Fixes the Johns Creek bug where camps stayed \"mid\" after their real premium price was discovered late.",
  "v1.6 — Unpriced Reasons. Camps that end the run with no price now carry a reason chip: Not a camp / Booking wall / No public price / Steps 3–9 exhausted / AI Overview blocked. The city panel shows a per-city breakdown so you know why coverage is what it is instead of a generic \"missing price\".",
  "v1.6 — Stop button + row lock. The active pipeline row shows a red Stop button that cancels the run cleanly. While any row is running, other rows' Run and Force-fresh buttons are locked so two runs can't collide on the Firecrawl budget.",
  "v1.6 — Manual Verify / Reject / Edit with reject-safety. The Provider Evidence Review page uses quiet chips for auto-kept crawler prices and loud action buttons only for rows that need human review (B3 AI Overview and other price_needs_review = true rows). Reject requires a confirmation step so a stray click can't wipe a real price. A collapsible \"How to read this table\" help card explains the chip/button system.",
];


const MVS_SHARED_INFRA = [
  ["Discovery: Sawyer, ActivityHero, Google Maps, Yelp, Google Search (Firecrawl + APIs)", "Provider discovery — 5 sources", "Live (v1.6)"],
  ["Firecrawl", "Page fetch + listing-page screenshots (JS render)", "Live — cap 50 per run, sub-caps 25 / 15 / 15"],
  ["Gemini 2.0 Flash (Lovable AI Gateway)", "Structured JSON extraction + tier classification (parallel waves of 5)", "Live"],
  ["Google AI Overview via Apify (B3 fallback)", "Last-resort price lookup — prices flagged 'Needs human review'", "Live (v1.6)"],
  ["Supabase Postgres", "Provider data store, pipeline runs, tier snapshots (mvs_tier_snapshots)", "Live"],
  ["Supabase Storage", "Listing-page screenshot archive (private, audit trail). No raw HTML, no per-provider website screenshots.", "Live"],
  ["Census ACS", "Demographics for Market Balance + Operator denominator", "Live"],
  ["Header notification bell (Regression Guard)", "Fires when premium count drops ≥ 20% vs previous snapshot", "Live (v1.6)"],
  ["Inngest / Trigger.dev (scheduled scrape cadence)", "Was planned for the retired 5-scrape weekly cadence", "Deferred — manual trigger only"],
  ["Internal QA review UI (absorption flow)", "Was the low-confidence week correction queue", "Retired — page shows retired notice"],
];

const MVS_PREMIUM_TIERS = [
  ["Premium", "Price ≥ $400/week AND STEM / maker / robotics / coding / science / art / theater / music / academic enrichment AND not childcare-positioned"],
  ["Mid", "$250–$399/week, enrichment-positioned"],
  ["Budget", "< $250/week OR community / parks-and-rec / YMCA-positioned"],
  ["Community", "Faith-based, scholarship-driven, or municipally subsidized"],
];

function generateMVSMarkdown(): string {
  const lines: string[] = [];
  lines.push(`# How the MVS (Market Validation Score) is Calculated`);
  lines.push("");
  lines.push(`Methodology & Data Documentation — Feature 1A · Market Validation Engine`);
  lines.push("");

  lines.push(`## Section 1: What is the MVS?`);
  lines.push("");
  lines.push(`The **Market Validation Score (MVS)** is the per-city composite produced by the Feature 1A Market Validation Engine. It answers a single question: *"Is this a validated premium enrichment market with active, paying demand?"*`);
  lines.push("");
  lines.push(`- **Higher MVS** = a validated premium enrichment market with strong pricing, scaled-operator presence, and diversity.`);
  lines.push(`- **Lower MVS** = supply exists on paper but doesn't sell out — or supply isn't there at all.`);
  lines.push("");
  lines.push(`MVS is computed on the **curated shortlist of 25–50 cities** promoted out of Feature 1 (City Search v1.0). It is not a national ranking and is not meant to predict the success of any one Neuron Garage location — that depends on franchisee quality, site selection (Feature 1B), and execution.`);
  lines.push("");
  lines.push(`Naming history: this score has previously been referred to as PEE (Premium Enrichment Ecosystem Score) and PCC (Per City Composite). The canonical name is now **MVS**.`);
  lines.push("");

  lines.push(`## Section 2: How We Scrape Each of the 5 Discover Sources`);
  lines.push("");
  lines.push(`Every city run fans out across five independent sources. Each source is scraped in parallel, and each source that returns 0 providers is retried up to two more times before it is marked as confirmed empty. Google Maps and Google Search are treated as critical — if either is confirmed empty, the city shows a red pill. Yelp, Sawyer, and ActivityHero are secondary — one or two of them empty produces a yellow pill.`);
  lines.push("");
  DISCOVER_SOURCES.forEach((s) => {
    lines.push(`### ${s.name} (${s.tool})`);
    lines.push("");
    lines.push(`**What we ask for:** ${s.query}`);
    lines.push("");
    lines.push(`**Retry rule:** ${s.retry}`);
    lines.push("");
    lines.push(`**Confirmed empty:** ${s.confirmedEmpty}`);
    lines.push("");
    lines.push(`**Known failure modes:** ${s.failureModes}`);
    lines.push("");
  });

  lines.push(`## Section 3: The Composite Formula`);
  lines.push("");
  lines.push("```");
  lines.push(`MVS = 0.2667 × Pricing Acceptance Score`);
  lines.push(`    + 0.2667 × Scaled Operator Score`);
  lines.push(`    + 0.1333 × Enrichment Diversity Score`);
  lines.push(`    + 0.1333 × Market Depth Score`);
  lines.push(`    + 0.2000 × Market Balance Index`);
  lines.push("```");
  lines.push("");
  lines.push(`Every sub-score is normalized 0–100 across the shortlisted cities, then weight-blended into the composite. Weights are exposed as sliders in the UI with "Show Formula" drawers per the v1.0 doctrine. **Market Absorption was removed from the composite in v1.1** (weight set to 0) because sellout-rate scraping was unreliable; the remaining five pillars were proportionally re-normalized so the weights still sum to 1.0.`);
  lines.push("");

  lines.push(`## Section 4: The Six Sub-Scores`);
  lines.push("");
  SUB_SCORES.forEach((s) => {
    lines.push(`### Score ${s.n}: ${s.name} (Weight ${s.weight})`);
    lines.push("");
    lines.push(`**Question:** ${s.question}`);
    lines.push("");
    lines.push(`**Formula:**`);
    lines.push("```");
    lines.push(s.formula);
    lines.push("```");
    lines.push("");
    lines.push(`**Detail:** ${s.detail}`);
    lines.push("");
    lines.push(`**Data Sources:**`);
    s.sources.forEach((src) => lines.push(`- ${src}`));
    lines.push("");
  });

  lines.push(`## Section 5: Premium Provider Definition`);
  lines.push("");
  lines.push(`Rather than excluding non-premium camps from data collection, the engine collects the **full** camp universe in each shortlisted city and tier-classifies each provider at ingest. Only providers tagged **Premium** flow into the six sub-scores.`);
  lines.push("");
  lines.push(`| Tier | Definition |`);
  lines.push(`| --- | --- |`);
  MVS_PREMIUM_TIERS.forEach(([tier, def]) => lines.push(`| ${tier} | ${def} |`));
  lines.push("");

  lines.push(`## Section 6: Shared Data & Tooling Stack`);
  lines.push("");
  lines.push(`A single scrape per shortlisted city powers Scores 1, 2, 4, 5 and the provider denominator for Scores 3 and 6. Demographic inputs reuse the Census ACS pipeline already wired in v1.0.`);
  lines.push("");
  lines.push(`| Tool | Role | Status |`);
  lines.push(`| --- | --- | --- |`);
  MVS_SHARED_INFRA.forEach(([tool, role, status]) => lines.push(`| ${tool} | ${role} | ${status} |`));
  lines.push("");
  lines.push(`**Cost envelope:** ~$3–6 per scrape per city. Five scrapes per active city per year ≈ $15–30/city/year. A 25-city shortlist runs ~$400–750/year for the full camp-scraping pipeline, plus 1–2 hours of human QA per scrape cycle across the shortlist.`);
  lines.push("");

  lines.push(`## Section 7: Important Notes`);
  lines.push("");
  MVS_NOTES.forEach((note) => lines.push(`- ${note}`));
  lines.push("");

  return lines.join("\n");
}



export default function MVSMethodology() {
  return (
    <DocShell
      eyebrow="Methodology"
      eyebrowIcon={BarChart3}
      title={<>How the MVS (Market Validation Score) is Calculated</>}
      subtitle="Methodology & Data Documentation — Feature 1A · Market Validation Engine · v1.6 (updated 2026-07-07)"
      action={
        <DownloadMDButton
          content={generateMVSMarkdown()}
          filename="mvs-methodology.md"
          label="Download MD"
        />
      }
    >
      <DocCard>
        <div className="text-[#07142f]">

          {/* Section 1 */}
          <section className="mb-10">
            <SectionTitle n={1}>What is the MVS?</SectionTitle>
            <div className="space-y-3 text-[13.5px] leading-relaxed text-[#1a2540]">
              <p>
                The <strong>Market Validation Score (MVS)</strong> is the per-city composite produced by
                the Feature 1A Market Validation Engine. It answers a single question:{" "}
                <em>"Is this a validated premium enrichment market with active, paying demand?"</em>
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Higher MVS</strong> = a validated premium enrichment market with strong pricing, scaled-operator presence, and diversity.</li>
                <li><strong>Lower MVS</strong> = supply exists on paper but doesn't sell out — or supply isn't there at all.</li>
              </ul>
              <p>
                MVS is computed on the <strong>curated shortlist of 25–50 cities</strong> promoted out of
                Feature 1 (City Search v1.0). It is not a national ranking and is not meant to predict the
                success of any one Neuron Garage location — that depends on franchisee quality, site
                selection (Feature 1B), and execution.
              </p>
              <p className="text-[12.5px] text-[#526078]">
                Naming history: this score has previously been referred to as PEE (Premium Enrichment
                Ecosystem Score) and PCC (Per City Composite). The canonical name is now <strong>MVS</strong>.
              </p>
            </div>
          </section>

          {/* Section 2 — Discover sources */}
          <section className="mb-10">
            <SectionTitle n={2}>How We Scrape Each of the 5 Discover Sources</SectionTitle>
            <p className="text-[13px] leading-relaxed text-[#1a2540] mb-3">
              Every city run fans out across five independent sources. Each source is scraped in parallel,
              and each source that returns 0 providers is retried up to two more times before we mark it
              as confirmed empty. Google Maps and Google Search are treated as critical — if either is
              confirmed empty, the city shows a red pill. Yelp, Sawyer, and ActivityHero are secondary —
              one or two of them empty produces a yellow pill.
            </p>
            <div className="space-y-4">
              {DISCOVER_SOURCES.map((s) => (
                <div key={s.key} className="rounded-md border border-[#eef2f7] bg-white overflow-hidden">
                  <div className="flex items-center justify-between border-b border-[#eef2f7] bg-[#f8fafe] px-4 py-2.5">
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-[14px] font-bold text-[#07142f]">{s.name}</h3>
                      <span className="text-[11px] text-[#526078]">{s.tool}</span>
                    </div>
                  </div>
                  <div className="px-4 py-3.5 grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px] leading-relaxed text-[#1a2540]">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#526078] mb-1">What we ask for</p>
                      <p>{s.query}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#526078] mb-1">Retry rule</p>
                      <p>{s.retry}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#526078] mb-1">Confirmed empty</p>
                      <p>{s.confirmedEmpty}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#526078] mb-1">Known failure modes</p>
                      <p>{s.failureModes}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 3 — Composite */}
          <section className="mb-10">
            <SectionTitle n={4}>The Composite Formula</SectionTitle>
            <FormulaBlock>{`MVS = 0.2667 × Pricing Acceptance Score
    + 0.2667 × Scaled Operator Score
    + 0.1333 × Enrichment Diversity Score
    + 0.1333 × Market Depth Score
    + 0.2000 × Market Balance Index`}</FormulaBlock>
            <p className="mt-3 text-[13px] leading-relaxed text-[#1a2540]">
              Every sub-score is normalized 0–100 across the shortlisted cities, then weight-blended into
              the composite. Weights are exposed as sliders in the UI with "Show Formula" drawers per the
              v1.0 doctrine. <strong>Market Absorption was removed from the composite in v1.1</strong>{" "}
              (weight set to 0) because sellout-rate scraping was unreliable; the remaining five pillars
              were proportionally re-normalized so the weights still sum to 1.0.
            </p>
          </section>

          {/* Section 3 — Sub-scores */}
          <section className="mb-10">
            <SectionTitle n={5}>The Six Sub-Scores</SectionTitle>
            <div className="space-y-6">
              {SUB_SCORES.map((s) => (
                <div key={s.n} className="rounded-md border border-[#eef2f7] bg-white overflow-hidden">
                  <div className="flex items-center justify-between border-b border-[#eef2f7] bg-[#f8fafe] px-4 py-2.5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#174be8]">
                        Score {s.n}
                      </span>
                      <h3 className="text-[14px] font-bold text-[#07142f]">{s.name}</h3>
                    </div>
                    <span className="rounded-full bg-[#eef4ff] px-2.5 py-0.5 text-[11.5px] font-bold text-[#174be8]">
                      Weight {s.weight}
                    </span>
                  </div>
                  <div className="px-4 py-3.5 space-y-3">
                    <p className="text-[13px] italic text-[#526078]">
                      <strong className="not-italic text-[#07142f]">Question:</strong> {s.question}
                    </p>
                    <FormulaBlock>{s.formula}</FormulaBlock>
                    <p className="text-[13px] leading-relaxed text-[#1a2540]">{s.detail}</p>
                    <div className="rounded-md border border-[#eef2f7] bg-[#fafbfd] px-3.5 py-2.5">
                      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#526078]">
                        <Database size={12} /> Data Sources
                      </div>
                      <ul className="list-disc pl-5 space-y-1 text-[12.5px] leading-relaxed text-[#1a2540]">
                        {s.sources.map((src, i) => (
                          <li key={i}>{src}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 4 — Premium definition */}
          <section className="mb-10">
            <SectionTitle n={6}>Premium Provider Definition</SectionTitle>
            <p className="text-[13px] leading-relaxed text-[#1a2540] mb-3">
              Rather than excluding non-premium camps from data collection, the engine collects the{" "}
              <strong>full</strong> camp universe in each shortlisted city and tier-classifies each provider
              at ingest. Only providers tagged <strong>Premium</strong> flow into the six sub-scores.
            </p>
            <div className="rounded-md border border-[#eef2f7] bg-white overflow-hidden">
              <table className="w-full text-[13px]">
                <thead className="bg-[#fafbfd] text-[#526078]">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold">Tier</th>
                    <th className="text-left px-4 py-2 font-semibold">Definition</th>
                  </tr>
                </thead>
                <tbody className="text-[#1a2540]">
                  <tr className="border-t border-[#eef2f7]">
                    <td className="px-4 py-2 font-semibold text-[#07142f]">Premium</td>
                    <td className="px-4 py-2">Price ≥ $400/week <em>AND</em> STEM / maker / robotics / coding / science / art / theater / music / academic enrichment <em>AND</em> not childcare-positioned</td>
                  </tr>
                  <tr className="border-t border-[#eef2f7]">
                    <td className="px-4 py-2 font-semibold text-[#07142f]">Mid</td>
                    <td className="px-4 py-2">$250–$399/week, enrichment-positioned</td>
                  </tr>
                  <tr className="border-t border-[#eef2f7]">
                    <td className="px-4 py-2 font-semibold text-[#07142f]">Budget</td>
                    <td className="px-4 py-2">&lt; $250/week <em>OR</em> community / parks-and-rec / YMCA-positioned</td>
                  </tr>
                  <tr className="border-t border-[#eef2f7]">
                    <td className="px-4 py-2 font-semibold text-[#07142f]">Community</td>
                    <td className="px-4 py-2">Faith-based, scholarship-driven, or municipally subsidized</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 5 — Crawler Evolution */}
          <section className="mb-10">
            <SectionTitle n={7}>Crawler Evolution — Old (3 steps) vs New (9 steps)</SectionTitle>
            <p className="text-[13px] leading-relaxed text-[#1a2540] mb-3">
              Before June 26, 2026 the crawler used a strict 3-step flow. It missed prices whenever the
              camp's own website hid the number behind a login wall or a "Book Now" button. The new
              9-step flow adds a plain-English Google catch-up search, reads marketplace listings
              (Sawyer, ActivityHero, Yelp), and — as the final fallback — reads Google's AI Overview
              answer box for camps still missing a price. Real impact: Columbus jumped from{" "}
              <strong>53 priced camps to 207</strong> (23% → 91% coverage) without any human edits.
            </p>

            <div className="rounded-md border border-[#eef2f7] bg-white overflow-hidden">
              <table className="w-full text-[13px]">
                <thead className="bg-[#fafbfd] text-[#526078]">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold w-1/2">Old crawler — 3 steps (retired)</th>
                    <th className="text-left px-4 py-2 font-semibold w-1/2">New crawler — 9 steps (live)</th>
                  </tr>
                </thead>
                <tbody className="text-[#1a2540] align-top">
                  <tr className="border-t border-[#eef2f7]">
                    <td className="px-4 py-2"><strong>1.</strong> Google Maps lookup — find the camp's name, website, address.</td>
                    <td className="px-4 py-2"><strong>1.</strong> Google Maps lookup. <em>Same as before.</em></td>
                  </tr>
                  <tr className="border-t border-[#eef2f7]">
                    <td className="px-4 py-2"><strong>2.</strong> Scrape the camp's own website with Firecrawl.</td>
                    <td className="px-4 py-2"><strong>2.</strong> Scrape the camp's own website. <em>Same as before.</em></td>
                  </tr>
                  <tr className="border-t border-[#eef2f7]">
                    <td className="px-4 py-2"><strong>3.</strong> Strict rule: the dollar sign and number <em>must</em> appear directly in the markdown of that page. If not → save price = null and stop.</td>
                    <td className="px-4 py-2"><strong>3. NEW —</strong> Catch-up Google search in plain English (e.g. <em>"Steve &amp; Kate's Camp Austin summer camp tuition price per week 2026"</em>).</td>
                  </tr>
                  <tr className="border-t border-[#eef2f7]">
                    <td className="px-4 py-2 text-[#526078] italic">—</td>
                    <td className="px-4 py-2"><strong>4. NEW —</strong> Read marketplace listings the search returned (ActivityHero, Sawyer, Yelp listings, news articles, the camp's own PDF).</td>
                  </tr>
                  <tr className="border-t border-[#eef2f7]">
                    <td className="px-4 py-2 text-[#526078] italic">—</td>
                    <td className="px-4 py-2"><strong>5. NEW —</strong> Relaxed source rule: if a dollar number appears on any trusted source and ties to this camp by name, accept it.</td>
                  </tr>
                  <tr className="border-t border-[#eef2f7]">
                    <td className="px-4 py-2 text-[#526078] italic">—</td>
                    <td className="px-4 py-2"><strong>6. NEW —</strong> Price-rules guard: must be between <strong>$50 and $5,000</strong>, must be weekly tuition (not a deposit, membership, or t-shirt fee).</td>
                  </tr>
                  <tr className="border-t border-[#eef2f7]">
                    <td className="px-4 py-2 text-[#526078] italic">—</td>
                    <td className="px-4 py-2"><strong>7.</strong> Save with full proof: price, platform, clickable <code>source_listing_url</code>, confidence score.</td>
                  </tr>
                  <tr className="border-t border-[#eef2f7]">
                    <td className="px-4 py-2 text-[#526078] italic">—</td>
                    <td className="px-4 py-2"><strong>8.</strong> Tier-classify the provider (Premium / Mid / Budget / Community) using the rules in Section 4.</td>
                  </tr>
                  <tr className="border-t border-[#eef2f7]">
                    <td className="px-4 py-2 text-[#526078] italic">—</td>
                    <td className="px-4 py-2"><strong>9. NEW (Phase B3) —</strong> Last-resort Google <strong>AI Overview</strong> answer box read via Apify. Runs only when steps 3–7 fail. Any price found is saved as <em>"Needs human review"</em> (amber chip) so a person must click Verify before it counts in the score.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-5 rounded-md border border-[#cfdcff] bg-[#f4f8ff] p-4">
              <p className="text-[12px] font-bold uppercase tracking-wider text-[#174be8] mb-2">
                Worked example — Steve &amp; Kate's Camp, Austin TX
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-[13px] leading-relaxed text-[#1a2540]">
                <li><strong>Old crawler result:</strong> price = null. Their site shows pictures and a "Book Now" button but no dollar number — it sits behind a login wall. Old strict rule gave up and marked the camp as "missing price" forever (unless a human fixed it).</li>
                <li><strong>New crawler result:</strong> Step 3 fired the catch-up Google search. Step 4 read the ActivityHero listing for that exact camp. <strong>$2,190/week</strong> was openly shown. Step 6 guard passed ($50–$5,000, weekly). Step 7 saved with the clickable ActivityHero URL and confidence 0.95. Step 8 classified as <strong>Premium</strong> (well above Austin's ~$400/week median).</li>
                <li><strong>Human verification time:</strong> ~5 seconds — click the saved link and see the price on the page.</li>
              </ul>
            </div>
          </section>

          {/* Section 5b — Manus CSV import (v1.6) */}
          <section className="mb-10">
            <SectionTitle n={7.5 as unknown as number}>Shortlist Intake — Manus CSV Import (v1.6)</SectionTitle>
            <p className="text-[13px] leading-relaxed text-[#1a2540] mb-3">
              New in v1.6: an <strong>"Import from Manus CSV"</strong> button on the Market Validation page.
              It lets you bulk-add cities to the MVS shortlist from a Manus CSI export instead of typing
              them in one by one. This is an <strong>intake convenience only</strong> — it does not touch
              the scoring formula, the 9-step pricing crawler, freshness rules, or the Firecrawl cap.
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-[13px] leading-relaxed text-[#1a2540]">
              <li><strong>Required CSV headers:</strong> <code>city</code>, <code>state</code> (2-letter USPS code — full names like "Texas" are auto-converted). Optional: <code>manus_csi_score</code>, <code>rank</code>. Any other columns Manus exports are silently ignored.</li>
              <li><strong>Preview before save:</strong> the dialog parses the file client-side (via <code>papaparse</code>) and shows a per-row status chip — ✅ Will add / ⏭ Already in shortlist / ⚠ Unknown city / Below CSI / Invalid.</li>
              <li><strong>Dedupe:</strong> matched on <em>city + state</em> together against existing <code>mvs_shortlist_cities</code> rows. Never modifies or overwrites existing rows.</li>
              <li><strong>Unknown-city guard:</strong> each row is checked against <code>us_cities_scored</code>. Unrecognized cities are flagged and skipped so misspellings never enter the shortlist.</li>
              <li><strong>CSI threshold slider:</strong> live-filters the preview so you can pre-screen a large Manus file (e.g. 800 rows) down to only the cities above your minimum score.</li>
              <li><strong>Two nullable reference columns</strong> on <code>mvs_shortlist_cities</code>: <code>manus_csi_score</code> (numeric) and <code>manus_imported_at</code> (timestamptz). Stored for audit only — never fed into any MVS calculation.</li>
              <li><strong>Never triggers the pipeline.</strong> Imported cities land with the same "Not yet run" state as manual adds. You still click Run Pipeline per city, exactly as before.</li>
            </ul>
          </section>

          {/* Section 6 — Shared infra */}
          <section className="mb-10">
            <SectionTitle n={8}>Shared Data & Tooling Stack</SectionTitle>

            <p className="text-[13px] leading-relaxed text-[#1a2540] mb-3">
              A single scrape per shortlisted city powers Scores 1, 2, 4, 5 and the provider denominator
              for Scores 3 and 6. Demographic inputs reuse the Census ACS pipeline already wired in v1.0.
            </p>
            <div className="rounded-md border border-[#eef2f7] bg-white overflow-hidden">
              <table className="w-full text-[13px]">
                <thead className="bg-[#fafbfd] text-[#526078]">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold">Tool</th>
                    <th className="text-left px-4 py-2 font-semibold">Role</th>
                    <th className="text-left px-4 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="text-[#1a2540]">
                  {MVS_SHARED_INFRA.map(([tool, role, status]) => (
                    <tr key={tool} className="border-t border-[#eef2f7]">
                      <td className="px-4 py-2 font-semibold text-[#07142f]">{tool}</td>
                      <td className="px-4 py-2">{role}</td>
                      <td className="px-4 py-2 text-[12.5px] text-[#526078]">{status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[12.5px] text-[#526078] leading-relaxed">
              <strong>Cost envelope:</strong> ~$3–6 per scrape per city. Five scrapes per active city per
              year ≈ $15–30/city/year. A 25-city shortlist runs ~$400–750/year for the full camp-scraping
              pipeline, plus 1–2 hours of human QA per scrape cycle across the shortlist.
            </p>
          </section>

          {/* Section 7 — Notes */}
          <section className="mb-2">
            <SectionTitle n={9}>Important Notes</SectionTitle>

            <div className="space-y-3">
              {MVS_NOTES.map((note, i) => (
                <div
                  key={i}
                  className="flex gap-3 rounded-md border border-[#cfdcff] bg-[#f4f8ff] px-4 py-3"
                >
                  <Info size={16} className="text-[#174be8] flex-shrink-0 mt-0.5" />
                  <p className="text-[13px] leading-relaxed text-[#1a2540]">{note}</p>
                </div>
              ))}
            </div>
          </section>

        </div>
      </DocCard>
    </DocShell>
  );
}
