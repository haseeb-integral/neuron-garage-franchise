import { FileText, ShieldCheck } from "lucide-react";
import { DocShell, DocCard } from "@/components/DocShell";
import { DownloadMDButton } from "@/components/DownloadMDButton";

// Mirror of docs/feature-1a-mvs-v1-spec.md kept here so the page is self-contained
// and downloadable from the app. If the .md file changes, update this constant too.
const SPEC_MD = `# Feature 1A — Market Validation Engine v1.0 Spec

> **Source of truth.** Locked v1.0 scope, naming, and design decisions for the Market Validation Engine. The Feature 1A Lovable Build Plan executes against this spec turn-by-turn. The MVS Methodology page holds the math.

---

## 1. Scope (what v1.0 IS)

- One score per shortlisted city: the MVS (Market Validation Score). Replaces earlier names PEE and PCC.
- 6 sub-scores, weight-blended into a single composite. Each normalized 0–100 across the shortlist (comparative, not national).
- Composite formula (locked):

  MVS = 0.20 × Pricing Acceptance
      + 0.25 × Market Absorption        ← dominant, demand-side
      + 0.20 × Scaled Operator
      + 0.10 × Enrichment Diversity
      + 0.10 × Market Depth
      + 0.15 × Market Balance           ← inside the composite

- Sawyer-only data source for v1.0. No ActivityHero, no Apify Google Maps. Adding additional platforms is a v1.1 decision.
- Single mid-March scrape per city in Year 1 — populates Sellout Rate only. Time-to-Sellout and YoY Velocity return null with a year_2_signal flag.
- Manual trigger. A manager-only "Run Pipeline" button per city. No scheduler in v1.0.
- 7 Tier A cities + Austin calibration. Live rollout target: NYC, Houston, Chicago, Boston, San Antonio, Philadelphia, LA. Austin is the calibration city built first end-to-end.
- Tier B cities (14) stay on sample data behind the mvs_data_source per-city flag until v1.1.

## 2. Scope (what v1.0 is NOT)

Explicitly excluded — do not build, do not propose:

- ActivityHero, CampMinder, CampBrain, or any non-Sawyer platform.
- Apify Google Maps actor (deferred to v1.1).
- Inngest / Trigger.dev scheduling. Manual trigger only.
- Time-to-Sellout and YoY Velocity as scored inputs (Year 2).
- Scaled Operator "Years in City" sub-component.
- Moving Market Balance outside the composite.
- Tier B pipeline runs.
- Across-shortlist normalization changes.

## 3. Naming

- Canonical composite name: MVS (Market Validation Score).
- Deprecated names PEE and PCC must not appear in new code, tables, UI, or docs.
- Database namespace: mvs_* tables, mvs-* edge functions, MVS_* env flags.

## 4. Premium Provider Definition

| Tier      | Definition |
| --------- | ---------- |
| Premium   | Price ≥ $400/week AND STEM/maker/robotics/coding/science/art/theater/music/academic enrichment AND not childcare-positioned |
| Mid       | $250–$399/week, enrichment-positioned |
| Budget    | < $250/week OR community/parks-and-rec/YMCA-positioned |
| Community | Faith-based, scholarship-driven, or municipally subsidized |

Only Premium-tier providers flow into the six sub-scores.

## 5. Audit & confidence

- Screenshot capture is non-negotiable. Bucket: mvs-screenshots.
- Confidence < 0.7 on week extraction → mvs_qa_queue.
- City low-confidence badge if >20% of Premium providers have no public registration page.

## 6. Operating doctrine

- One calibrated number everywhere — single helper src/lib/mvs/computeMvs.ts.
- Demo path stays alive — mvs_data_source per-city flag gates live vs sample.
- Kill switch — MVS_PIPELINE_ENABLED env (default false).
- Atomic & reversible turns.
- No edits outside the MVS surface area.

## 7. Calibration gate (Phase 7)

Boston MA must land in the top quartile of the 8-city live set. If not, halt rollout.

## 8. Five open questions — all answered yes in chat

1. Sawyer-only for v1.0, defer ActivityHero / Apify to v1.1? → Yes.
2. Keep the canonical name MVS (drop PEE and PCC)? → Yes.
3. Six sub-scores per methodology, Market Balance inside composite at 15%? → Yes.
4. Manual trigger only in v1.0 (no scheduler)? → Yes.
5. Roll out to 7 Tier A cities after Austin calibration, Tier B remains on sample until v1.1? → Yes.
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
              <p><strong>Kill switch.</strong> <code className="bg-[#f4f8ff] px-1 rounded text-[12px]">MVS_PIPELINE_ENABLED</code> env secret (default false) gates every edge function.</p>
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
