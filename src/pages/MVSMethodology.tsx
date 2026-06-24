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
    weight: "20%",
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
      "Firecrawl (page fetch, JS render wait for Sawyer/CampMinder, full-page screenshot)",
      "Gemini 2.0 Flash via Lovable AI Gateway (structured extraction with status_evidence + confidence)",
      "Supabase Storage (raw HTML + screenshot archive — audit trail)",
      "Supabase Postgres (week-level data store)",
      "Inngest or Trigger.dev (scheduled 5-scrape cadence: mid-Jan / Feb / Mar / Apr / May)",
      "Internal QA review queue for any week with confidence < 0.7",
    ],
  },
  {
    n: 3,
    name: "Scaled Operator",
    weight: "20%",
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
    weight: "10%",
    question: "Do families in this market invest across a variety of enrichment categories?",
    formula: `Category Count   = number of distinct enrichment categories with ≥1 premium provider
Diversity Ratio  = Category Count ÷ Premium Provider Count

Enrichment Diversity Score =
  0.70 × normalize(Category Count,   range 2–10)
+ 0.30 × normalize(Diversity Ratio,  range 0.1–0.6)`,
    detail:
      "Category Count rewards breadth. Diversity Ratio penalizes deep-but-narrow markets (e.g. 10 robotics camps and nothing else). Eligible categories: STEM, Robotics, Coding, Science, Maker, Art, Theater, Music, Academic Enrichment, Debate, Chess, Entrepreneurship.",
    sources: [
      "Same premium-provider universe from Apify + Firecrawl",
      "Category classification by Gemini 2.0 Flash against the eligible category list",
      "No new data source — purely derived from the premium-provider table",
    ],
  },
  {
    n: 5,
    name: "Market Depth",
    weight: "10%",
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
    weight: "15%",
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

const MVS_NOTES = [
  "Every sub-score is normalized 0–100 across the shortlisted cities, not nationally. The MVS is a comparative score for the cities that survived Feature 1, not a universal market grade.",
  "Screenshot capture is non-negotiable. Every registration-page scrape archives a full-page screenshot with date + URL in Supabase Storage. This is the visual ground truth for any contested classification and the audit defense for any Market Brief claim.",
  "Year 1 runs a single mid-March scrape per shortlisted city — enough to populate Sellout Rate. The full 5-scrape cadence (Jan / Feb / Mar / Apr / May) comes online in Year 2 for any city under active evaluation, unlocking Time-to-Sellout and YoY Velocity.",
  "If more than 20% of premium providers in a market have no public registration page (i.e. email/phone signup only), the city's MVS gets a low-confidence badge and the QA queue flags it for review. A provider counts as \"no public registration page\" when its URL is missing, the page fetch returns a non-2xx status, or the rendered page returns less than 200 characters of meaningful content.",
  "QA queue threshold is confidence < 0.7. Below that, a week row is still recorded against the provider but is also flagged for human review with the reason and confidence preserved — we never silently drop a row.",
  "Pipeline runs are manager-gated — every edge function enforces a manager/admin role check in code before spending a single Firecrawl call. Each Austin run is sequential and capped at 25 providers to keep Firecrawl cost predictable and within the per-run budget.",
];


const MVS_SHARED_INFRA = [
  ["Apify Google Maps actor", "Provider discovery", "Reused from v1.0"],
  ["Firecrawl", "Page fetch + full-page screenshots (JS render)", "Reused from v1.0"],
  ["Gemini 2.0 Flash (Lovable AI Gateway)", "Structured JSON extraction", "Reused from v1.0"],
  ["Supabase Postgres", "Week-level + provider data store", "Reused from v1.0"],
  ["Supabase Storage", "Raw HTML + screenshot archive (audit trail)", "Reused from v1.0"],
  ["Census ACS", "Demographics for Market Balance + Operator denominator", "Reused from v1.0"],
  ["Inngest or Trigger.dev", "Scheduled scrape cadence", "New (~$20–50/mo)"],
  ["Internal QA review UI", "Low-confidence week correction queue", "New (~3–5 dev-days)"],
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

  lines.push(`## Section 2: The Composite Formula`);
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

  lines.push(`## Section 3: The Six Sub-Scores`);
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

  lines.push(`## Section 4: Premium Provider Definition`);
  lines.push("");
  lines.push(`Rather than excluding non-premium camps from data collection, the engine collects the **full** camp universe in each shortlisted city and tier-classifies each provider at ingest. Only providers tagged **Premium** flow into the six sub-scores.`);
  lines.push("");
  lines.push(`| Tier | Definition |`);
  lines.push(`| --- | --- |`);
  MVS_PREMIUM_TIERS.forEach(([tier, def]) => lines.push(`| ${tier} | ${def} |`));
  lines.push("");

  lines.push(`## Section 5: Shared Data & Tooling Stack`);
  lines.push("");
  lines.push(`A single scrape per shortlisted city powers Scores 1, 2, 4, 5 and the provider denominator for Scores 3 and 6. Demographic inputs reuse the Census ACS pipeline already wired in v1.0.`);
  lines.push("");
  lines.push(`| Tool | Role | Status |`);
  lines.push(`| --- | --- | --- |`);
  MVS_SHARED_INFRA.forEach(([tool, role, status]) => lines.push(`| ${tool} | ${role} | ${status} |`));
  lines.push("");
  lines.push(`**Cost envelope:** ~$3–6 per scrape per city. Five scrapes per active city per year ≈ $15–30/city/year. A 25-city shortlist runs ~$400–750/year for the full camp-scraping pipeline, plus 1–2 hours of human QA per scrape cycle across the shortlist.`);
  lines.push("");

  lines.push(`## Section 6: Important Notes`);
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
      subtitle="Methodology & Data Documentation — Feature 1A · Market Validation Engine"
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

          {/* Section 2 — Composite */}
          <section className="mb-10">
            <SectionTitle n={2}>The Composite Formula</SectionTitle>
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
            <SectionTitle n={3}>The Six Sub-Scores</SectionTitle>
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
            <SectionTitle n={4}>Premium Provider Definition</SectionTitle>
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

          {/* Section 5 — Shared infra */}
          <section className="mb-10">
            <SectionTitle n={5}>Shared Data & Tooling Stack</SectionTitle>
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
                  {[
                    ["Apify Google Maps actor", "Provider discovery", "Reused from v1.0"],
                    ["Firecrawl", "Page fetch + full-page screenshots (JS render)", "Reused from v1.0"],
                    ["Gemini 2.0 Flash (Lovable AI Gateway)", "Structured JSON extraction", "Reused from v1.0"],
                    ["Supabase Postgres", "Week-level + provider data store", "Reused from v1.0"],
                    ["Supabase Storage", "Raw HTML + screenshot archive (audit trail)", "Reused from v1.0"],
                    ["Census ACS", "Demographics for Market Balance + Operator denominator", "Reused from v1.0"],
                    ["Inngest or Trigger.dev", "Scheduled scrape cadence", "New (~$20–50/mo)"],
                    ["Internal QA review UI", "Low-confidence week correction queue", "New (~3–5 dev-days)"],
                  ].map(([tool, role, status]) => (
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

          {/* Section 6 — Notes */}
          <section className="mb-2">
            <SectionTitle n={6}>Important Notes</SectionTitle>
            <div className="space-y-3">
              <div className="flex gap-3 rounded-md border border-[#cfdcff] bg-[#f4f8ff] px-4 py-3">
                <Info size={16} className="text-[#174be8] flex-shrink-0 mt-0.5" />
                <p className="text-[13px] leading-relaxed text-[#1a2540]">
                  Every sub-score is normalized 0–100 <strong>across the shortlisted cities</strong>, not
                  nationally. The MVS is a comparative score for the cities that survived Feature 1, not a
                  universal market grade.
                </p>
              </div>
              <div className="flex gap-3 rounded-md border border-[#cfdcff] bg-[#f4f8ff] px-4 py-3">
                <Info size={16} className="text-[#174be8] flex-shrink-0 mt-0.5" />
                <p className="text-[13px] leading-relaxed text-[#1a2540]">
                  <strong>Screenshot capture is non-negotiable.</strong> Every registration-page scrape
                  archives a full-page screenshot with date + URL in Supabase Storage. This is the visual
                  ground truth for any contested classification and the audit defense for any Market Brief
                  claim.
                </p>
              </div>
              <div className="flex gap-3 rounded-md border border-[#cfdcff] bg-[#f4f8ff] px-4 py-3">
                <Info size={16} className="text-[#174be8] flex-shrink-0 mt-0.5" />
                <p className="text-[13px] leading-relaxed text-[#1a2540]">
                  Year 1 runs a single mid-March scrape per shortlisted city — enough to populate Sellout
                  Rate. The full 5-scrape cadence (Jan / Feb / Mar / Apr / May) comes online in Year 2 for
                  any city under active evaluation, unlocking Time-to-Sellout and YoY Velocity.
                </p>
              </div>
              <div className="flex gap-3 rounded-md border border-[#cfdcff] bg-[#f4f8ff] px-4 py-3">
                <Info size={16} className="text-[#174be8] flex-shrink-0 mt-0.5" />
                <p className="text-[13px] leading-relaxed text-[#1a2540]">
                  If more than 20% of premium providers in a market have no public registration page (i.e.
                  email/phone signup only), the city's MVS gets a <strong>low-confidence badge</strong> and
                  the QA queue flags it for review.
                </p>
              </div>
            </div>
          </section>

        </div>
      </DocCard>
    </DocShell>
  );
}
