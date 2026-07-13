import type { RankedMarket } from "@/lib/cityScoringLiveData";
import { buildMarketView, buildPillarView, type PillarKey } from "@/lib/marketView";
import { csiTierTextClass } from "@/lib/csiTierStyle";


export type ColDef = {
  key: string;
  label: string;
  align: "left" | "right";
  group?: string;
  get: (m: RankedMarket, rank: number) => number | string | null;
  render: (m: RankedMarket, rank: number) => React.ReactNode;
};

export type SortDir = "asc" | "desc";

const fmtInt = (v: any) =>
  v == null || v === "" || Number.isNaN(Number(v)) ? "—" : Number(v).toLocaleString();
const fmtMoney = (v: any) =>
  v == null || v === "" || Number.isNaN(Number(v)) ? "—" : `$${Number(v).toLocaleString()}`;
const fmtPct = (v: any) =>
  v == null || v === "" || Number.isNaN(Number(v)) ? "—" : `${Number(v).toFixed(1)}%`;
// Scores are shown as whole integers everywhere (Total Score, pillars) so the
// dashboard list and spreadsheet read identically. Use fmtNum1 only for COL
// Index and similar non-score ratios.
const fmtScore = (v: any) =>
  v == null || v === "" || Number.isNaN(Number(v)) ? "—" : String(Math.round(Number(v)));
const fmtNum1 = (v: any) =>
  v == null || v === "" || Number.isNaN(Number(v)) ? "—" : Number(v).toFixed(1);
const fmtNum2 = (v: any) =>
  v == null || v === "" || Number.isNaN(Number(v)) ? "—" : Number(v).toFixed(2);
const fmtNum3 = (v: any) =>
  v == null || v === "" || Number.isNaN(Number(v)) ? "—" : Number(v).toFixed(3);

const tierBg: Record<string, string> = {
  A: "bg-[#dcfce7] text-[#0a7c3a]",
  B: "bg-[#dbeafe] text-[#174be8]",
  C: "bg-[#fef3c7] text-[#a16207]",
  D: "bg-[#fee2e2] text-[#b91c1c]",
};

const row = (m: RankedMarket): any => (m as any).scoredRow ?? {};
// Mint pillars per market — branded PillarsView guarantees every column here
// is the calibrated (school-grade) value, not raw.
const pillarDisplay = (m: RankedMarket, k: PillarKey): number | null =>
  buildPillarView(m.categoryScores)[k].display;

// Frozen-column geometry. Left edge is built up left-to-right.
export const STICKY_LEFT: Record<string, { left: number; width: number }> = {
  rank: { left: 0, width: 56 },
  state: { left: 56, width: 112 },
  city: { left: 168, width: 160 },
};

export const COLUMNS: ColDef[] = [
  {
    key: "rank", label: "#", align: "right",
    get: (_m, r) => r,
    render: (_m, r) => <span className="text-[#8794ab]">{r}</span>,
  },
  {
    key: "state", label: "State", align: "left",
    get: (m) => m.state ?? "",
    render: (m) => (
      <span className="inline-block rounded bg-[#eef2f7] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#526078]">
        {m.state || "—"}
      </span>
    ),
  },
  {
    key: "city", label: "City", align: "left",
    get: (m) => m.city ?? "",
    render: () => null, // rendered specially (link) by the view
  },
  {
    key: "county", label: "County", align: "left",
    get: (m) => (m as any).county ?? "",
    render: (m) => <span className="text-[#526078]">{(m as any).county ?? "—"}</span>,
  },
  {
    key: "metro", label: "Metro Area", align: "left",
    get: (m) => (m as any).metroArea ?? "",
    render: (m) => <span className="text-[#526078]">{(m as any).metroArea ?? "—"}</span>,
  },
  {
    key: "marketType", label: "Type", align: "left",
    get: (m) => (m as any).marketType ?? "",
    render: (m) => (
      <span className="inline-block rounded-full bg-[#eaf0ff] text-[#174be8] text-[10px] font-medium px-1.5 py-0.5">
        {(m as any).marketType ?? "—"}
      </span>
    ),
  },
  {
    key: "tier", label: "Tier", align: "left",
    get: (m) => m.tier ?? "",
    render: (m) => (
      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${tierBg[m.tier as string] ?? "bg-[#eef2f7] text-[#526078]"}`}>
        {m.tier || "—"}
      </span>
    ),
  },
  {
    key: "composite", label: "Total Score", align: "right", group: "Scores",
    get: (m) => buildMarketView(m).composite,
    render: (m) => {
      const v = buildMarketView(m);
      return (
        <span
          className="font-semibold text-[#07142f]"
          title={`Total Score (calibrated for readability): ${v.compositeFormatted}\nWeighted Composite Index (raw math): ${v.rawCompositeFormatted}`}
        >
          {v.compositeFormatted}
        </span>
      );
    },
  },
  { key: "score_demand", label: "Demand", align: "right", group: "Scores", get: (m) => pillarDisplay(m, "demand"), render: (m) => fmtScore(pillarDisplay(m, "demand")) },
  { key: "score_tam", label: "Operator & Venue Supply", align: "right", group: "Scores", get: (m) => pillarDisplay(m, "franchiseeSupply"), render: (m) => fmtScore(pillarDisplay(m, "franchiseeSupply")) },
  { key: "score_csi_opp", label: "Comp. Opportunity", align: "right", group: "Scores", get: (m) => pillarDisplay(m, "competitiveLandscape"), render: (m) => fmtScore(pillarDisplay(m, "competitiveLandscape")) },

  // Demand inputs
  { key: "population", label: "Population", align: "right", group: "Demand", get: (m) => m.population ?? row(m).population ?? null, render: (m) => fmtInt(m.population ?? row(m).population) },
  { key: "children_5_12", label: "Children 5–12", align: "right", group: "Demand", get: (m) => row(m).children_5_12 ?? null, render: (m) => fmtInt(row(m).children_5_12) },
  { key: "median_income", label: "Median HH Income", align: "right", group: "Demand", get: (m) => row(m).median_household_income ?? null, render: (m) => <span className="font-medium">{fmtMoney(row(m).median_household_income)}</span> },
  { key: "dual_income_pct", label: "Dual-Income %", align: "right", group: "Demand", get: (m) => row(m).dual_working_families_pct ?? null, render: (m) => fmtPct(row(m).dual_working_families_pct) },
  { key: "college_pct", label: "College %", align: "right", group: "Demand", get: (m) => row(m).college_degree_pct ?? null, render: (m) => fmtPct(row(m).college_degree_pct) },
  // Operator & Venue Supply
  { key: "elem_schools", label: "Public Elem. Schools", align: "right", group: "Operator & Venue Supply", get: (m) => row(m).public_elementary_count ?? null, render: (m) => fmtInt(row(m).public_elementary_count) },
  {
    key: "priv_charter", label: "Private+Charter Elem.", align: "right", group: "Operator & Venue Supply",
    get: (m) => {
      const r = row(m);
      const v = (r.private_elementary_count ?? 0) + (r.charter_elementary_count ?? 0);
      return v || null;
    },
    render: (m) => {
      const r = row(m);
      const v = (r.private_elementary_count ?? 0) + (r.charter_elementary_count ?? 0);
      return fmtInt(v || null);
    },
  },
  { key: "elem_teachers", label: "Elem. Teachers (FTE)", align: "right", group: "Operator & Venue Supply", get: (m) => row(m).public_elementary_teacher_count ?? null, render: (m) => fmtInt(row(m).public_elementary_teacher_count) },
  { key: "elem_enrollment", label: "Elem. Enrollment", align: "right", group: "Operator & Venue Supply", get: (m) => row(m).public_elementary_enrollment ?? null, render: (m) => fmtInt(row(m).public_elementary_enrollment) },
  { key: "col_index", label: "COL Index", align: "right", group: "Operator & Venue Supply", get: (m) => row(m).cost_of_living_index ?? null, render: (m) => fmtNum1(row(m).cost_of_living_index) },
  // Competitive Landscape (Manus-owned)
  { key: "csi_brand", label: "Nat'l Brand Supply (wtd)", align: "right", group: "Competitive Landscape", get: (m) => row(m).csi_national_brand_count_weighted ?? null, render: (m) => fmtNum2(row(m).csi_national_brand_count_weighted) },
  { key: "csi_local", label: "Local Provider Est.", align: "right", group: "Competitive Landscape", get: (m) => row(m).csi_local_provider_estimate ?? null, render: (m) => fmtNum2(row(m).csi_local_provider_estimate) },
  // csi_dam (Demand-Adjusted Market) column removed 2026-07-07 — Prompt 1 CSI refactor.
  {
    key: "csi_raw", label: "CSI (raw)", align: "right", group: "Competitive Landscape",
    get: (m) => row(m).csi_score ?? null,
    render: (m) => fmtNum3(row(m).csi_score),
  },
  { key: "csi_sat", label: "Saturation", align: "left", group: "Competitive Landscape", get: (m) => row(m).csi_saturation_category ?? "", render: (m) => {
      const t = row(m).csi_saturation_category;
      return t ? <span className={csiTierTextClass(t)}>{t}</span> : <span className="text-[#8794ab]">—</span>;
    } },
];
