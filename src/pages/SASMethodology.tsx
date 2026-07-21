import { MapPin, Info, Database } from "lucide-react";
import { DocShell, DocCard } from "@/components/DocShell";
import { SITE_CONFIDENCE_THRESHOLDS, SCHOOL_PROFILE_FACTORS } from "@/lib/sas/config";
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
    name: "School Profile",
    weight: "25%",
    question:
      "Is the host school itself the right kind of partner — type, size, and grade alignment with Neuron Garage's K–6 customer?",
    formula: `School Profile Score =
  0.50 × school_type_factor       (table, 0–100)
+ 0.25 × normalize(Enrollment,  range 150–800)
+ 0.25 × grade_alignment_factor   (table, 0–100)

school_type_factor:
  Private elementary           = 100
  Montessori elementary        = 85
  Charter elementary           = 75
  Public elementary            = 70
  Other K-8                    = 50
  Montessori pre-school        = 30
  Other (incl. daycare)        = 30

grade_alignment_factor:
  K-5 or K-6                   = 100
  Pre-K through 5              = 95
  K-8                          = 80
  Other                        = 20`,
    detail:
      "Type does the heavy lifting (50% of this sub-score). The daycare row at 30 is the calibration anchor that pulled LeafSpring's School Profile below threshold — the math, not a hand-set tier, produces the negative verdict on the known-bad site.",
    sources: [
      "NCES Common Core of Data (public + charter schools, enrollment, grade range)",
      "NCES Private School Universe Survey (PSS) — private + Montessori",
      "GreatSchools API (cross-reference, school-type tagging)",
      "Manual override per school when a state-level data gap is detected (logged in QA queue)",
    ],
  },
  {
    n: 2,
    name: "Neighborhood Affluence",
    weight: "25%",
    question:
      "Can the families inside the host school's commute ring actually pay Neuron Garage tuition?",
    formula: `Neighborhood Affluence Score =
  0.40 × norm(Median HHI,       range $80k–$200k)
+ 0.35 × norm(% HH > $150k,     range 10%–50%)
+ 0.25 × norm(% Dual-Income HH, range 40%–80%)

Each input is computed on a 60/40 isochrone blend:
  60% weight on the 10-minute drive ring (primary catchment)
+ 40% weight on the 15-minute drive ring (secondary catchment)`,
    detail:
      "Pulled from Census ACS, joined to drive-time isochrones around the host school — not the school's ZIP, which routinely misrepresents who actually lives within 10 minutes of the building. LeafSpring's depressed Neighborhood Affluence comes directly from a weak 10-min ring (median HHI $94k, only 16% > $150k) even though Austin overall scores well.",
    sources: [
      "Census ACS 5-year tables: median household income, % HH > $150k, % dual-income",
      "Mapbox Isochrone API (drive-time polygons at 10 and 15 minutes)",
      "HERE Isochrone API (fallback / cross-check)",
      "ACS block-group ↔ isochrone spatial join (PostGIS in Supabase Postgres)",
    ],
  },
  {
    n: 3,
    name: "Family Density",
    weight: "20%",
    question:
      "Are there enough Neuron Garage–age kids inside the commute ring to fill camps week after week?",
    formula: `Family Density Score =
  0.50 × norm(Children 5–12 / 10min,            range 1k–15k)
+ 0.30 × norm(Children 5–12 / 15min,            range 3k–40k)
+ 0.20 × norm(Families w/ kids 5–12 / 10min,    range 500–8k)`,
    detail:
      "Affluence without kids is useless — and kids without parents in the right life-stage is just as bad. Family Density makes the population-of-buyers explicit and weights the 10-min ring most heavily because that's the practical drop-off radius for a working parent.",
    sources: [
      "Census ACS 5-year tables: population by age (5–9, 10–14 disaggregated to 5–12)",
      "Census ACS table B11003 (families with own children under 18, disaggregated to 5–12)",
      "Same Mapbox / HERE isochrones used for Neighborhood Affluence (shared pull)",
    ],
  },
  {
    n: 4,
    name: "School Ecosystem",
    weight: "15%",
    question:
      "Is there a healthy density of nearby schools to seed referrals, sibling enrollment, and cross-school marketing?",
    formula: `School Ecosystem Score =
  0.40 × norm(Elementary school count / 15min,  range 3–25)
+ 0.30 × norm(Private school count / 15min,     range 1–10)
+ 0.30 × norm(Nearby student population / 15min, range 2k–25k)`,
    detail:
      "Captures the surrounding referral network — independent of the host school. A great host school in a school desert under-performs; a merely good host school in a dense ecosystem outperforms.",
    sources: [
      "NCES CCD + PSS (elementary and private school locations)",
      "GreatSchools API (cross-reference)",
      "15-min isochrone from the host school (Mapbox / HERE — shared pull)",
    ],
  },
  {
    n: 5,
    name: "Accessibility",
    weight: "15%",
    question:
      "Can families actually get to this site — quickly, with parking, and from a large enough population?",
    formula: `Accessibility Score =
  0.30 × access_factor(distance to major road)
+ 0.30 × access_factor(distance to highway)
+ 0.40 × norm(Population reachable / 15min, range 50k–500k)

access_factor curves (driving-time based):
  ≤ 3 min  → 100
  ≤ 6 min  → 75
  ≤ 10 min → 50
  > 10 min → 25`,
    detail:
      "Pure logistics — proxies for ease of pickup, drop-off, and total reachable buyer pool. Trinity's 3-min highway connection and ~412k 15-min reach drive its 88; LeafSpring's 11-min I-35 hop and 168k reach drive its 32.",
    sources: [
      "Mapbox Directions API (drive-time to nearest classified road / highway)",
      "HERE Routing API (fallback)",
      "OpenStreetMap road classifications (major road / motorway tags)",
      "Census ACS total population × isochrone spatial join (same pipeline as Affluence + Family Density)",
    ],
  },
];

const SAS_NOTES = [
  "SAS is normalized against the candidate set for a given market, not nationally. It is a comparative score for the host-school candidates inside a validated city, not a universal site grade.",
  "Weights are exposed as sliders in the Site Analysis UI with \"Show Formula\" drawers per the v1.0 doctrine — every number on screen is traceable to the formula above.",
  "MVS and SAS are sequential, not redundant. MVS answers \"should we open in this city?\" SAS answers \"given we're opening here, which building?\" A high SAS in a low-MVS city is not a green light, and a low SAS in a high-MVS city is not a reason to doubt the market — only the building.",
  "If isochrone generation fails for a candidate (rare — typically rural or cross-border addresses), the site is flagged in the QA queue and rendered with a low-confidence badge until a manual radius fallback is applied.",
];

const SAS_SHARED_INFRA = [
  ["Census ACS 5-year", "Income, dual-income, age, families w/ children", "Reused from v1.0"],
  ["Mapbox Isochrone API", "10-min + 15-min drive polygons (primary)", "New (Week 3)"],
  ["HERE Isochrone API", "Isochrone fallback / cross-check", "New (Week 3)"],
  ["NCES Common Core of Data", "Public + charter school directory + enrollment", "New (Week 3)"],
  ["NCES Private School Universe Survey", "Private + Montessori directory", "New (Week 3)"],
  ["GreatSchools API", "School-type cross-reference", "Optional"],
  ["OpenStreetMap road tags", "Highway / major-road classification for Accessibility", "Reused"],
  ["Supabase Postgres + PostGIS", "ACS ↔ isochrone spatial join", "Reused from v1.0"],
];

const SAS_CALIBRATION = [
  ["School Profile (25%)", "85", "30"],
  ["Neighborhood Affluence (25%)", "92", "54"],
  ["Family Density (20%)", "78", "48"],
  ["School Ecosystem (15%)", "84", "35"],
  ["Accessibility (15%)", "88", "32"],
  ["SAS (composite)", "86 · Strong", `41 · Low`],
];

function generateSASMarkdown(): string {
  const lines: string[] = [];
  lines.push(`# How the SAS (Site Analysis Score) is Calculated`);
  lines.push("");
  lines.push(`Methodology & Data Documentation — Feature 1B · Site Analysis Engine`);
  lines.push("");

  lines.push(`## Section 1: What is the SAS?`);
  lines.push("");
  lines.push(`The **Site Analysis Score (SAS)** is the per-site composite produced by the Feature 1B Site Analysis Engine. It answers a different question than MVS: *"Given a validated market, is this specific candidate building the right place to actually open a Neuron Garage?"*`);
  lines.push("");
  lines.push(`- **Higher SAS** = right host school, right families inside the commute ring, right logistics.`);
  lines.push(`- **Lower SAS** = a site that looks fine on a map but fails on at least one of the five pillars.`);
  lines.push("");
  lines.push(`SAS is computed on **candidate host-school sites inside a validated market** (typically a city promoted by Feature 1A). It is a site-selection tool, not a market grade — MVS already answered the market question.`);
  lines.push("");
  lines.push(`Naming history: this score was previously referred to as SOS (Site Opportunity Score). The canonical name is now **SAS**.`);
  lines.push("");

  lines.push(`## Section 2: The Composite Formula`);
  lines.push("");
  lines.push("```");
  lines.push(`SAS = 0.25 × School Profile Score`);
  lines.push(`    + 0.25 × Neighborhood Affluence Score`);
  lines.push(`    + 0.20 × Family Density Score`);
  lines.push(`    + 0.15 × School Ecosystem Score`);
  lines.push(`    + 0.15 × Accessibility Score`);
  lines.push("```");
  lines.push("");
  lines.push(`Every sub-score is normalized 0–100. School Profile and Neighborhood Affluence are co-dominant because they answer the two questions that, in combination, determine whether a site can work at all: **is the host school the right kind of partner** and **can the families inside its commute ring afford the product**. Family Density (20%) gates the demand pool. School Ecosystem and Accessibility (15% each) tune the edges.`);
  lines.push("");
  lines.push(`| SAS Range | Confidence Band |`);
  lines.push(`| --- | --- |`);
  lines.push(`| ≥ ${SITE_CONFIDENCE_THRESHOLDS.strong} | Strong confidence — well above the calibration floor |`);
  lines.push(`| ${SITE_CONFIDENCE_THRESHOLDS.high}–${SITE_CONFIDENCE_THRESHOLDS.strong - 1} | High confidence — promising; verify open items before advancing |`);
  lines.push(`| ${SITE_CONFIDENCE_THRESHOLDS.medium}–${SITE_CONFIDENCE_THRESHOLDS.high - 1} | Medium confidence — mixed signals; review pillar detail |`);
  lines.push(`| < ${SITE_CONFIDENCE_THRESHOLDS.medium} | Low confidence — significant gaps versus the comparison set |`);
  lines.push("");

  lines.push(`## Section 3: The Five Sub-Scores`);
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

  lines.push(`## Section 4: The 10/15-Minute Isochrone Blend`);
  lines.push("");
  lines.push(`Three of the five sub-scores (Affluence, Family Density, Accessibility) read demographic and population inputs not from the school's ZIP code but from **drive-time polygons** around the candidate building. Every such input is computed as:`);
  lines.push("");
  lines.push("```");
  lines.push(`input_value = 0.60 × value_inside_10_minute_ring`);
  lines.push(`            + 0.40 × value_inside_15_minute_ring`);
  lines.push("```");
  lines.push("");
  lines.push(`The 10-minute ring is the practical drop-off radius for a working parent; the 15-minute ring captures the secondary catchment. ZIP-level inputs would have masked LeafSpring's problem entirely — Austin overall is affluent, but the 10-min ring around the LeafSpring building was not.`);
  lines.push("");

  lines.push(`## Section 5: Shared Data & Tooling Stack`);
  lines.push("");
  lines.push(`SAS reuses the Census ACS pipeline already wired in v1.0 and the same Supabase Postgres + PostGIS spatial-join layer. The new infrastructure is isochrone generation and the NCES school-data pull.`);
  lines.push("");
  lines.push(`| Tool | Role | Status |`);
  lines.push(`| --- | --- | --- |`);
  SAS_SHARED_INFRA.forEach(([tool, role, status]) => lines.push(`| ${tool} | ${role} | ${status} |`));
  lines.push("");
  lines.push(`**Cost envelope:** Isochrones are batched per candidate site (typically 5–20 candidates per validated market). At Mapbox's free-tier pricing one full SAS evaluation is effectively free; HERE fallback adds <$0.01/site. NCES pulls are bulk file downloads, not per-call APIs.`);
  lines.push("");

  lines.push(`## Section 6: Calibration: Trinity vs. LeafSpring`);
  lines.push("");
  lines.push(`SAS is calibrated against two anchors in the demo, both in Austin: **Trinity Episcopal (Westlake)** — a profile of current high-performing Neuron Garage locations — and **LeafSpring**, a former NG site that closed in 2023 after averaging 27 campers/week. The math must independently produce a Strong confidence band on Trinity and a Low confidence band on LeafSpring, with no hand-set tier override.`);
  lines.push("");
  lines.push(`| Pillar | Trinity | LeafSpring |`);
  lines.push(`| --- | --- | --- |`);
  SAS_CALIBRATION.forEach(([pillar, t, l]) => lines.push(`| ${pillar} | ${t} | ${l} |`));
  lines.push("");
  lines.push(`LeafSpring's School Profile of 30 comes directly from \`school_type_factor = ${SCHOOL_PROFILE_FACTORS.schoolType[5].factor}\` (Other / daycare positioning), grade-alignment 50 (Other), and a 220 enrollment that normalizes to ~11. Affluence and Family Density are depressed because the 10-min ring around the building captures the wrong population — the customer base lived further south. Five independent pillars failing in concert is exactly what a calibrated model should look like on a known-bad anchor.`);
  lines.push("");

  lines.push(`## Section 7: Important Notes`);
  lines.push("");
  SAS_NOTES.forEach((note) => lines.push(`- ${note}`));
  lines.push("");

  return lines.join("\n");
}


export default function SASMethodology() {
  return (
    <DocShell
      eyebrow="Methodology"
      eyebrowIcon={MapPin}
      title={<>How the SAS (Site Analysis Score) is Calculated</>}
      subtitle="Methodology & Data Documentation — Feature 1B · Site Analysis Engine"
      action={
        <DownloadMDButton
          content={generateSASMarkdown()}
          filename="sas-methodology.md"
          label="Download MD"
        />
      }
    >
      <DocCard>
        <div className="text-[#07142f]">

          {/* Section 1 */}
          <section className="mb-10">
            <SectionTitle n={1}>What is the SAS?</SectionTitle>
            <div className="space-y-3 text-[13.5px] leading-relaxed text-[#1a2540]">
              <p>
                The <strong>Site Analysis Score (SAS)</strong> is the per-site composite produced by
                the Feature 1B Site Analysis Engine. It answers a different question than MVS:{" "}
                <em>"Given a validated market, is this specific candidate building the right place to
                actually open a Neuron Garage?"</em>
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Higher SAS</strong> = right host school, right families inside the commute ring, right logistics.</li>
                <li><strong>Lower SAS</strong> = a site that looks fine on a map but fails on at least one of the five pillars.</li>
              </ul>
              <p>
                SAS is computed on <strong>candidate host-school sites inside a validated market</strong>{" "}
                (typically a city promoted by Feature 1A). It is a site-selection tool, not a market
                grade — MVS already answered the market question.
              </p>
              <p className="text-[12.5px] text-[#526078]">
                Naming history: this score was previously referred to as SOS (Site Opportunity Score).
                The canonical name is now <strong>SAS</strong>.
              </p>
            </div>
          </section>

          {/* Section 2 — Composite */}
          <section className="mb-10">
            <SectionTitle n={2}>The Composite Formula</SectionTitle>
            <FormulaBlock>{`SAS = 0.25 × School Profile Score
    + 0.25 × Neighborhood Affluence Score
    + 0.20 × Family Density Score
    + 0.15 × School Ecosystem Score
    + 0.15 × Accessibility Score`}</FormulaBlock>
            <p className="mt-3 text-[13px] leading-relaxed text-[#1a2540]">
              Every sub-score is normalized 0–100. School Profile and Neighborhood Affluence are
              co-dominant because they answer the two questions that, in combination, determine
              whether a site can work at all: <strong>is the host school the right kind of partner</strong>{" "}
              and <strong>can the families inside its commute ring afford the product</strong>. Family
              Density (20%) gates the demand pool. School Ecosystem and Accessibility (15% each) tune
              the edges.
            </p>
            <div className="mt-4 rounded-md border border-[#eef2f7] bg-white overflow-hidden">
              <table className="w-full text-[13px]">
                <thead className="bg-[#fafbfd] text-[#526078]">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold">SAS Range</th>
                    <th className="text-left px-4 py-2 font-semibold">Confidence Band</th>
                  </tr>
                </thead>
                <tbody className="text-[#1a2540]">
                  <tr className="border-t border-[#eef2f7]">
                    <td className="px-4 py-2 font-semibold text-[#1d6b32]">≥ {SITE_CONFIDENCE_THRESHOLDS.strong}</td>
                    <td className="px-4 py-2">Strong confidence — well above the calibration floor</td>
                  </tr>
                  <tr className="border-t border-[#eef2f7]">
                    <td className="px-4 py-2 font-semibold text-[#155e9b]">
                      {SITE_CONFIDENCE_THRESHOLDS.high}–{SITE_CONFIDENCE_THRESHOLDS.strong - 1}
                    </td>
                    <td className="px-4 py-2">High confidence — promising; verify open items before advancing</td>
                  </tr>
                  <tr className="border-t border-[#eef2f7]">
                    <td className="px-4 py-2 font-semibold text-[#925100]">
                      {SITE_CONFIDENCE_THRESHOLDS.medium}–{SITE_CONFIDENCE_THRESHOLDS.high - 1}
                    </td>
                    <td className="px-4 py-2">Medium confidence — mixed signals; review pillar detail</td>
                  </tr>
                  <tr className="border-t border-[#eef2f7]">
                    <td className="px-4 py-2 font-semibold text-[#a3142b]">&lt; {SITE_CONFIDENCE_THRESHOLDS.medium}</td>
                    <td className="px-4 py-2">Low confidence — significant gaps versus the comparison set</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3 — Sub-scores */}
          <section className="mb-10">
            <SectionTitle n={3}>The Five Sub-Scores</SectionTitle>
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

          {/* Section 4 — Isochrone blend */}
          <section className="mb-10">
            <SectionTitle n={4}>The 10/15-Minute Isochrone Blend</SectionTitle>
            <p className="text-[13px] leading-relaxed text-[#1a2540] mb-3">
              Three of the five sub-scores (Affluence, Family Density, Accessibility) read demographic
              and population inputs not from the school's ZIP code but from{" "}
              <strong>drive-time polygons</strong> around the candidate building. Every such input is
              computed as:
            </p>
            <FormulaBlock>{`input_value = 0.60 × value_inside_10_minute_ring
            + 0.40 × value_inside_15_minute_ring`}</FormulaBlock>
            <p className="mt-3 text-[13px] leading-relaxed text-[#1a2540]">
              The 10-minute ring is the practical drop-off radius for a working parent; the 15-minute
              ring captures the secondary catchment. ZIP-level inputs would have masked LeafSpring's
              problem entirely — Austin overall is affluent, but the 10-min ring around the LeafSpring
              building was not.
            </p>
          </section>

          {/* Section 5 — Shared infra */}
          <section className="mb-10">
            <SectionTitle n={5}>Shared Data & Tooling Stack</SectionTitle>
            <p className="text-[13px] leading-relaxed text-[#1a2540] mb-3">
              SAS reuses the Census ACS pipeline already wired in v1.0 and the same Supabase Postgres
              + PostGIS spatial-join layer. The new infrastructure is isochrone generation and the
              NCES school-data pull.
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
                    ["Census ACS 5-year", "Income, dual-income, age, families w/ children", "Reused from v1.0"],
                    ["Mapbox Isochrone API", "10-min + 15-min drive polygons (primary)", "New (Week 3)"],
                    ["HERE Isochrone API", "Isochrone fallback / cross-check", "New (Week 3)"],
                    ["NCES Common Core of Data", "Public + charter school directory + enrollment", "New (Week 3)"],
                    ["NCES Private School Universe Survey", "Private + Montessori directory", "New (Week 3)"],
                    ["GreatSchools API", "School-type cross-reference", "Optional"],
                    ["OpenStreetMap road tags", "Highway / major-road classification for Accessibility", "Reused"],
                    ["Supabase Postgres + PostGIS", "ACS ↔ isochrone spatial join", "Reused from v1.0"],
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
              <strong>Cost envelope:</strong> Isochrones are batched per candidate site (typically
              5–20 candidates per validated market). At Mapbox's free-tier pricing one full SAS
              evaluation is effectively free; HERE fallback adds &lt;$0.01/site. NCES pulls are bulk
              file downloads, not per-call APIs.
            </p>
          </section>

          {/* Section 6 — Calibration anchors */}
          <section className="mb-10">
            <SectionTitle n={6}>Calibration: Trinity vs. LeafSpring</SectionTitle>
            <p className="text-[13px] leading-relaxed text-[#1a2540] mb-3">
              SAS is calibrated against two anchors in the demo, both in Austin: <strong>Trinity
              Episcopal (Westlake)</strong> — a profile of current high-performing Neuron Garage
              locations — and <strong>LeafSpring</strong>, a former NG site that closed in 2023
              after averaging 27 campers/week. The math must independently produce a Strong confidence
              band on Trinity and a Low confidence band on LeafSpring, with no hand-set tier override.
            </p>
            <div className="rounded-md border border-[#eef2f7] bg-white overflow-hidden">
              <table className="w-full text-[13px]">
                <thead className="bg-[#fafbfd] text-[#526078]">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold">Pillar</th>
                    <th className="text-left px-4 py-2 font-semibold">Trinity</th>
                    <th className="text-left px-4 py-2 font-semibold">LeafSpring</th>
                  </tr>
                </thead>
                <tbody className="text-[#1a2540]">
                  {[
                    ["School Profile (25%)", "85", "30"],
                    ["Neighborhood Affluence (25%)", "92", "54"],
                    ["Family Density (20%)", "78", "48"],
                    ["School Ecosystem (15%)", "84", "35"],
                    ["Accessibility (15%)", "88", "32"],
                    ["SAS (composite)", "86 · Strong", "41 · Low"],
                  ].map(([pillar, t, l], i, arr) => (
                    <tr key={pillar} className={`border-t border-[#eef2f7] ${i === arr.length - 1 ? "bg-[#f8fafe] font-semibold" : ""}`}>
                      <td className="px-4 py-2">{pillar}</td>
                      <td className="px-4 py-2">{t}</td>
                      <td className="px-4 py-2">{l}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-[#1a2540]">
              LeafSpring's School Profile of 30 comes directly from{" "}
              <code className="rounded bg-[#f4f8ff] px-1 py-0.5 text-[12px]">school_type_factor = {SCHOOL_PROFILE_FACTORS.schoolType[5].factor}</code>{" "}
              (Other / daycare positioning), grade-alignment 50 (Other), and a 220 enrollment that
              normalizes to ~11. Affluence and Family Density are depressed because the 10-min ring
              around the building captures the wrong population — the customer base lived further
              south. Five independent pillars failing in concert is exactly what a calibrated model
              should look like on a known-bad anchor.
            </p>
          </section>

          {/* Section 7 — Notes */}
          <section className="mb-2">
            <SectionTitle n={7}>Important Notes</SectionTitle>
            <div className="space-y-3">
              <div className="flex gap-3 rounded-md border border-[#cfdcff] bg-[#f4f8ff] px-4 py-3">
                <Info size={16} className="text-[#174be8] flex-shrink-0 mt-0.5" />
                <p className="text-[13px] leading-relaxed text-[#1a2540]">
                  SAS is normalized <strong>against the candidate set for a given market</strong>,
                  not nationally. It is a comparative score for the host-school candidates inside a
                  validated city, not a universal site grade.
                </p>
              </div>
              <div className="flex gap-3 rounded-md border border-[#cfdcff] bg-[#f4f8ff] px-4 py-3">
                <Info size={16} className="text-[#174be8] flex-shrink-0 mt-0.5" />
                <p className="text-[13px] leading-relaxed text-[#1a2540]">
                  Weights are exposed as sliders in the Site Analysis UI with "Show Formula" drawers
                  per the v1.0 doctrine — every number on screen is traceable to the formula above.
                </p>
              </div>
              <div className="flex gap-3 rounded-md border border-[#cfdcff] bg-[#f4f8ff] px-4 py-3">
                <Info size={16} className="text-[#174be8] flex-shrink-0 mt-0.5" />
                <p className="text-[13px] leading-relaxed text-[#1a2540]">
                  MVS and SAS are sequential, not redundant. MVS answers "should we open in this
                  city?" SAS answers "given we're opening here, which building?" A high SAS in a
                  low-MVS city is not a green light, and a low SAS in a high-MVS city is not a
                  reason to doubt the market — only the building.
                </p>
              </div>
              <div className="flex gap-3 rounded-md border border-[#cfdcff] bg-[#f4f8ff] px-4 py-3">
                <Info size={16} className="text-[#174be8] flex-shrink-0 mt-0.5" />
                <p className="text-[13px] leading-relaxed text-[#1a2540]">
                  If isochrone generation fails for a candidate (rare — typically rural or
                  cross-border addresses), the site is flagged in the QA queue and rendered with a
                  low-confidence badge until a manual radius fallback is applied.
                </p>
              </div>
            </div>
          </section>

          {/* Section 8 — Site Analysis UI workflow */}
          <section className="mb-2">
            <SectionTitle n={8}>Site Analysis UI — Saved Sites, Re-run & Actions</SectionTitle>
            <p className="text-[13px] leading-relaxed text-[#1a2540] mb-3">
              The Site Analysis page wraps the SAS engine in a workflow UI so an analyst can
              collect candidate buildings, re-score them as inputs change, and share the list with
              the team — without ever drifting from the calibrated math described in Sections 2–6.
            </p>

            <div className="space-y-4">
              <div className="rounded-md border border-[#eef2f7] bg-white px-4 py-3.5">
                <h3 className="text-[14px] font-bold text-[#07142f] mb-1.5">Saved Sites Drawer</h3>
                <p className="text-[13px] leading-relaxed text-[#1a2540]">
                  A tabbed drawer with <strong>My Sites</strong> and <strong>Team Sites</strong>.
                  Saved candidate host-school sites persist across sessions. Each card shows the
                  site name, address, SAS composite score, and the five pillar scores.
                </p>
              </div>

              <div className="rounded-md border border-[#eef2f7] bg-white px-4 py-3.5">
                <h3 className="text-[14px] font-bold text-[#07142f] mb-1.5">Site Metadata</h3>
                <p className="text-[13px] leading-relaxed text-[#1a2540]">
                  Every saved site records <strong>who saved it</strong> (full name, or email if
                  the name is missing), the <strong>exact save timestamp</strong> (with a relative
                  "time ago" hint), and the <strong>last re-scored timestamp</strong> — shown only
                  when a re-run happened after the initial save.
                </p>
              </div>

              <div className="rounded-md border border-[#eef2f7] bg-white px-4 py-3.5">
                <h3 className="text-[14px] font-bold text-[#07142f] mb-1.5">Action Buttons</h3>
                <p className="text-[13px] leading-relaxed text-[#1a2540] mb-2">
                  Four actions on every saved site card, aligned in a single horizontal row:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-[13px] leading-relaxed text-[#1a2540]">
                  <li><strong>Save</strong> — toggle bookmark status.</li>
                  <li><strong>Re-run</strong> — re-execute the live SAS engine with the latest inputs and refresh the displayed scores in place.</li>
                  <li><strong>Replace</strong> — swap the candidate site for a new one while keeping the same slot.</li>
                  <li><strong>Remove</strong> — delete the saved site from the drawer.</li>
                </ul>
              </div>

              <div className="rounded-md border border-[#eef2f7] bg-white px-4 py-3.5">
                <h3 className="text-[14px] font-bold text-[#07142f] mb-1.5">Live Engine Re-run</h3>
                <p className="text-[13px] leading-relaxed text-[#1a2540]">
                  Clicking Re-run re-fetches the <code className="rounded bg-[#f4f8ff] px-1 py-0.5 text-[12px]">compute-sas</code>{" "}
                  edge function and recomputes all five pillars + composite through the same{" "}
                  <code className="rounded bg-[#f4f8ff] px-1 py-0.5 text-[12px]">recomputeSiteScores</code>{" "}
                  helper used on first evaluation. This is what guarantees{" "}
                  <strong>"one calibrated number everywhere"</strong>: the saved card, the live
                  engine card, and every export all read from the same recomputed object — never
                  from a stale stored value.
                </p>
              </div>

              <div className="rounded-md border border-[#eef2f7] bg-white px-4 py-3.5">
                <h3 className="text-[14px] font-bold text-[#07142f] mb-1.5">Alignment & UX</h3>
                <p className="text-[13px] leading-relaxed text-[#1a2540]">
                  All four action buttons sit in a single <code className="rounded bg-[#f4f8ff] px-1 py-0.5 text-[12px]">flex-nowrap</code>{" "}
                  row with consistent height, padding, and font size. Remove is visually quieter
                  (muted text) but stays on the same line as the other three — no button drops
                  to a second row at normal card widths.
                </p>
              </div>
            </div>
          </section>

        </div>
      </DocCard>
    </DocShell>
  );
}
