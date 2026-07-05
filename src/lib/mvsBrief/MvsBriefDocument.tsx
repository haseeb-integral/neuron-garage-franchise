// Phase 6 / Turn 6.1 — MVS Brief PDF (internal, dense, numbers-forward).
//
// Rendered with @react-pdf/renderer (same library as SitePackDocument so we
// don't add a new dep). Audience: Brett & Haseeb. Source of truth: every
// number comes from the live useLiveMvs() → computeMvs() bundle the caller
// passes in. We do zero independent math here — the document is a view.

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
  pdf,
} from "@react-pdf/renderer";
import logoUrl from "@/assets/neuron-garage-logo.png";
import {
  DEFAULT_WEIGHTS,
  MVS_NORMALIZATION_VERSION,
  type MvsAcsInput,
  type MvsProviderInput,
  type MvsResult,
  type MvsWeekInput,
} from "@/lib/mvs/computeMvs";

Font.registerHyphenationCallback((word) => [word]);

// ---- Palette (mirrors LiveCityDeepDive) ----
const C = {
  navy: "#07142f",
  blue: "#174be8",
  muted: "#526078",
  soft: "#f7faff",
  line: "#e5eaf2",
  green: "#1d6b32",
  red: "#a3142b",
  white: "#ffffff",
};

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: C.navy,
    paddingTop: 52,
    paddingBottom: 44,
    paddingHorizontal: 36,
  },
  header: {
    position: "absolute",
    top: 18,
    left: 36,
    right: 36,
    paddingBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: C.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLogo: { height: 18, width: 18, marginRight: 6 },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  headerText: { fontSize: 8, color: C.muted },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    fontSize: 7.5,
    color: C.muted,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  coverHero: {
    marginTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  coverEyebrow: { fontSize: 9, color: C.blue, fontWeight: 700, letterSpacing: 1 },
  coverTitle: { fontSize: 24, fontWeight: 700, color: C.navy, marginTop: 6 },
  coverComposite: { fontSize: 56, fontWeight: 700, color: C.navy, marginTop: 16, lineHeight: 1 },
  coverCompositeLabel: { fontSize: 8, color: C.muted, letterSpacing: 1, marginTop: 2 },
  coverMetaRow: { flexDirection: "row", marginTop: 14, gap: 18 },
  coverMetaBlock: { flexDirection: "column" },
  coverMetaLabel: { fontSize: 7.5, color: C.muted, letterSpacing: 0.5 },
  coverMetaValue: { fontSize: 10, color: C.navy, fontWeight: 700, marginTop: 2 },
  sectionBand: {
    backgroundColor: C.soft,
    paddingVertical: 5,
    paddingHorizontal: 7,
    marginTop: 12,
    marginBottom: 6,
    borderLeftWidth: 2,
    borderLeftColor: C.blue,
  },
  sectionTitle: { fontSize: 10.5, fontWeight: 700, color: C.navy },
  sectionSub: { fontSize: 8, color: C.muted, marginTop: 1 },
  kvRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: C.line,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  kvRowAlt: { backgroundColor: C.soft },
  kvLabel: { fontSize: 9, color: C.muted, width: "60%" },
  kvVal: { fontSize: 9, color: C.navy, fontWeight: 700, width: "40%", textAlign: "right", fontFamily: "Courier" },
  tHead: { flexDirection: "row", backgroundColor: C.navy },
  tHeadCell: { fontSize: 8, fontWeight: 700, color: C.white, paddingVertical: 5, paddingHorizontal: 6 },
  tRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.line },
  tRowAlt: { backgroundColor: C.soft },
  tCell: { fontSize: 8.5, paddingVertical: 4, paddingHorizontal: 6, color: C.navy },
  tCellNum: { fontFamily: "Courier", textAlign: "right" },
  pillarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 8,
    minHeight: 28,
  },
  pillarScoreRow: { flexDirection: "row", alignItems: "flex-end" },
  pillarScore: {
    fontSize: 20,
    fontWeight: 700,
    color: C.navy,
    fontFamily: "Courier",
    lineHeight: 1,
  },
  pillarScoreLabel: { fontSize: 8, color: C.muted, marginLeft: 4, paddingBottom: 2 },
  pillarWeight: { fontSize: 8, color: C.muted, textAlign: "right", maxWidth: "55%" },
  pillarEmpty: {
    fontSize: 9,
    color: C.muted,
    fontStyle: "italic",
    paddingVertical: 6,
    paddingHorizontal: 6,
    backgroundColor: C.soft,
    borderRadius: 2,
  },
  pillarFormula: {
    fontSize: 7.5,
    color: C.muted,
    fontFamily: "Courier",
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: C.line,
  },
  pillarBlock: { marginBottom: 10 },
  bullet: { flexDirection: "row", marginBottom: 3 },
  bulletDot: { width: 10, color: C.blue, fontWeight: 700, fontSize: 9 },
  bulletText: { flex: 1, fontSize: 9, lineHeight: 1.4 },
  footnote: { fontSize: 7.5, color: C.muted, marginTop: 8, lineHeight: 1.4 },
});


// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MvsBriefPipelineRun {
  id: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  firecrawl_calls: number;
  error: string | null;
}

export interface MvsBriefWeekDetail {
  provider_id: string;
  provider_name: string;
  week_start: string;        // ISO date "YYYY-MM-DD"
  week_end: string | null;
  status: string;
  confidence: number | null;
  screenshot_url: string | null;
}

export interface MvsBriefArgs {
  cityKey: string;            // "Austin, TX"
  cityDisplay: string;        // "Austin"
  stateDisplay: string;       // "TX"
  result: MvsResult;
  providers: MvsProviderInput[];
  weeks: MvsWeekInput[];
  weeksDetailed?: MvsBriefWeekDetail[];
  acs: MvsAcsInput | null;
  weights: Record<string, number>;
  lowConfidence: boolean;
  latestRun: MvsBriefPipelineRun | null;
  generatedAt?: Date;
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

const fmt = (v: number | null | undefined, digits = 1) => {
  if (v == null || !Number.isFinite(v)) return "—";
  return Number.isInteger(v) && digits === 0 ? String(v) : v.toFixed(digits);
};
const fmtInt = (v: number | null | undefined) =>
  v == null || !Number.isFinite(v) ? "—" : Math.round(v).toLocaleString();
const fmtMoney = (v: number | null | undefined) =>
  v == null || !Number.isFinite(v) ? "—" : `$${Math.round(v).toLocaleString()}`;
const fmtPct = (v: number | null | undefined, digits = 0) =>
  v == null || !Number.isFinite(v) ? "—" : `${v.toFixed(digits)}%`;
const fmtTs = (iso: string | null | undefined) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toISOString().replace("T", " ").slice(0, 16) + " UTC";
  } catch {
    return iso;
  }
};

// ---------------------------------------------------------------------------
// Pillar metadata — mirrors SUB_SCORE_META in LiveCityDeepDive
// ---------------------------------------------------------------------------

const PILLARS: {
  key: keyof typeof DEFAULT_WEIGHTS;
  title: string;
  subtitle: string;
  formula: string;
}[] = [
  {
    key: "pricingAcceptance",
    title: "Pricing Acceptance",
    subtitle: "Are families already paying premium pricing?",
    formula:
      "0.40 * norm(median, 300-700) + 0.40 * norm(p75, 400-800) + 0.20 * norm(% >= $500, 0-100)",
  },
  {
    key: "scaledOperator",
    title: "Scaled Operator",
    subtitle: "Validated vs saturated by national operators?",
    formula:
      "0.65 * norm(Validation, 0-8) + 0.35 * (100 - norm(DirectLoad per 10k, 0-5))",
  },
  {
    key: "enrichmentDiversity",
    title: "Enrichment Diversity",
    subtitle: "Do families invest across multiple categories?",
    formula:
      "norm(clamp(CategoryCount, 2, 10), 2, 10) * 100",
  },
  {
    key: "marketDepth",
    title: "Market Depth",
    subtitle: "How large is the premium ecosystem?",
    formula: "norm(PremiumProviderCount, 4-40)",
  },
  {
    key: "marketBalance",
    title: "Market Balance Index",
    subtitle: "Is there still room in this market?",
    formula:
      "norm(CoverageRatio = affluent_families/premium_count, 50-500). >=350 underserved.",
  },
];

// ---------------------------------------------------------------------------
// Chrome
// ---------------------------------------------------------------------------

const Chrome: React.FC<{ headerText: string }> = ({ headerText }) => (
  <>
    <View style={s.header} fixed>
      <View style={s.headerLeft}>
        <Image src={logoUrl} style={s.headerLogo} />
        <Text style={s.headerText}>Neuron Garage · MVS Brief</Text>
      </View>
      <Text style={s.headerText}>{headerText}</Text>
    </View>
    <View style={s.footer} fixed>
      <Text>Internal — Brett &amp; Haseeb. Numbers from shared computeMvs helper.</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  </>
);

const SectionTitle: React.FC<{ n: number; label: string; sub?: string }> = ({ n, label, sub }) => (
  <View style={s.sectionBand} wrap={false}>
    <Text style={s.sectionTitle}>{`${n}. ${label}`}</Text>
    {sub ? <Text style={s.sectionSub}>{sub}</Text> : null}
  </View>
);

const Kv: React.FC<{ rows: [string, string][] }> = ({ rows }) => (
  <View>
    {rows.map(([k, v], i) => (
      <View key={k + i} style={[s.kvRow, i % 2 === 1 ? s.kvRowAlt : {}]} wrap={false}>
        <Text style={s.kvLabel}>{k}</Text>
        <Text style={s.kvVal}>{v}</Text>
      </View>
    ))}
  </View>
);

// ---------------------------------------------------------------------------
// Strengths / risks heuristic — rule-based from pillar deltas vs 50
// ---------------------------------------------------------------------------

function pillarHighlights(result: MvsResult): { strengths: string[]; risks: string[] } {
  const entries = PILLARS.map((p) => ({
    title: p.title,
    score: result.scores[p.key],
  })).filter((e) => e.score != null) as { title: string; score: number }[];

  const sorted = [...entries].sort((a, b) => b.score - a.score);
  const strengths = sorted
    .slice(0, 2)
    .map((e) => `${e.title} — ${e.score.toFixed(1)} / 100 (${e.score >= 70 ? "strong" : "above midline"})`);
  const risks = sorted
    .slice(-2)
    .reverse()
    .map((e) => `${e.title} — ${e.score.toFixed(1)} / 100 (${e.score < 40 ? "weak" : "below median"})`);
  return { strengths, risks };
}

// ---------------------------------------------------------------------------
// Page components
// ---------------------------------------------------------------------------

const CoverAndExec: React.FC<{ args: MvsBriefArgs; today: string; headerText: string }> = ({
  args,
  today,
  headerText,
}) => {
  const { cityDisplay, stateDisplay, result, providers, weeks, lowConfidence } = args;
  const premiumCount = providers.filter((p) => p.tier === "premium").length;
  const { strengths, risks } = pillarHighlights(result);

  return (
    <Page size="LETTER" style={s.page}>
      <Chrome headerText={headerText} />

      {/* 1. COVER */}
      <View style={s.coverHero}>
        <Text style={s.coverEyebrow}>MARKET VALIDATION SCORE — INTERNAL BRIEF</Text>
        <Text style={s.coverTitle}>
          {cityDisplay}, {stateDisplay}
        </Text>
        <Text style={s.coverComposite}>
          {result.mvs != null ? result.mvs.toFixed(1) : "—"}
        </Text>
        <Text style={s.coverCompositeLabel}>COMPOSITE MVS · 0–100</Text>
        <View style={s.coverMetaRow}>
          <View style={s.coverMetaBlock}>
            <Text style={s.coverMetaLabel}>GENERATED</Text>
            <Text style={s.coverMetaValue}>{today}</Text>
          </View>
          <View style={s.coverMetaBlock}>
            <Text style={s.coverMetaLabel}>DATA SOURCE</Text>
            <Text style={s.coverMetaValue}>Live · {result.normalizationVersion}</Text>
          </View>
          <View style={s.coverMetaBlock}>
            <Text style={s.coverMetaLabel}>PROVIDERS / WEEKS</Text>
            <Text style={s.coverMetaValue}>
              {providers.length} / {weeks.length}
            </Text>
          </View>
          <View style={s.coverMetaBlock}>
            <Text style={s.coverMetaLabel}>PREMIUM TIER</Text>
            <Text style={s.coverMetaValue}>{premiumCount}</Text>
          </View>
          <View style={s.coverMetaBlock}>
            <Text style={s.coverMetaLabel}>CONFIDENCE</Text>
            <Text style={[s.coverMetaValue, { color: lowConfidence ? C.red : C.green }]}>
              {lowConfidence ? "LOW" : "OK"}
            </Text>
          </View>
        </View>
      </View>

      {/* 2. EXEC SUMMARY */}
      <SectionTitle n={2} label="Executive Summary" sub="Pillar scores + top strengths / risks" />
      <Kv
        rows={PILLARS.map((p) => [
          `${p.title}  (weight ${(args.weights[p.key] * 100).toFixed(0)}%)`,
          fmt(result.scores[p.key]),
        ])}
      />
      <View style={{ flexDirection: "row", marginTop: 10, gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={[s.sectionTitle, { fontSize: 9.5, color: C.green, marginBottom: 4 }]}>
            Strengths
          </Text>
          {strengths.length === 0 ? (
            <Text style={s.bulletText}>—</Text>
          ) : (
            strengths.map((t, i) => (
              <View key={i} style={s.bullet}>
                <Text style={[s.bulletDot, { color: C.green }]}>+</Text>
                <Text style={s.bulletText}>{t}</Text>
              </View>
            ))
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.sectionTitle, { fontSize: 9.5, color: C.red, marginBottom: 4 }]}>
            Risks
          </Text>
          {risks.length === 0 ? (
            <Text style={s.bulletText}>—</Text>
          ) : (
            risks.map((t, i) => (
              <View key={i} style={s.bullet}>
                <Text style={[s.bulletDot, { color: C.red }]}>−</Text>
                <Text style={s.bulletText}>{t}</Text>
              </View>
            ))
          )}
        </View>
      </View>
    </Page>
  );
};

const PillarPages: React.FC<{ args: MvsBriefArgs; headerText: string }> = ({ args, headerText }) => {
  const { result } = args;
  return (
    <Page size="LETTER" style={s.page}>
      <Chrome headerText={headerText} />
      {PILLARS.map((p, idx) => {
        const score = result.scores[p.key];
        const inputs = (result.inputs as any)[p.key] as Record<string, unknown>;
        const rows: [string, string][] = Object.entries(inputs || {})
          .filter(([k, v]) => v != null && k !== "year2Signal")
          .map(([k, v]) => {
            let val: string;
            if (typeof v === "number") {
              if (k.toLowerCase().includes("price")) val = fmtMoney(v);
              else if (k.toLowerCase().includes("rate") || k.toLowerCase().includes("pct"))
                val = fmtPct(v as number, 1);
              else if (k.toLowerCase().includes("ratio"))
                val = (v as number).toFixed(3);
              else if (Number.isInteger(v)) val = fmtInt(v as number);
              else val = (v as number).toFixed(2);
            } else {
              val = String(v);
            }
            return [k, val];
          });
        return (
          <View key={p.key} style={s.pillarBlock} wrap={false}>
            <SectionTitle n={3 + idx} label={p.title} sub={p.subtitle} />
            <View style={s.pillarHeader}>
              <View style={s.pillarScoreRow}>
                <Text style={s.pillarScore}>{fmt(score)}</Text>
                <Text style={s.pillarScoreLabel}>/ 100</Text>
              </View>
              <Text style={s.pillarWeight}>
                Weight {(args.weights[p.key] * 100).toFixed(0)}% · contributes{" "}
                {score != null
                  ? (score * args.weights[p.key]).toFixed(1)
                  : "—"}{" "}
                pts to composite
              </Text>
            </View>
            {rows.length > 0 ? (
              <Kv rows={rows} />
            ) : (
              <Text style={s.pillarEmpty}>No input data available for this pillar.</Text>
            )}
            <Text style={s.pillarFormula}>formula: {p.formula}</Text>
          </View>
        );
      })}

    </Page>
  );
};

const RosterAndLineage: React.FC<{ args: MvsBriefArgs; headerText: string }> = ({
  args,
  headerText,
}) => {
  const { providers, weeks, acs, weights, latestRun, lowConfidence } = args;
  const premium = providers.filter((p) => p.tier === "premium");
  const weeksByProv = new Map<string, MvsWeekInput[]>();
  for (const w of weeks) {
    const arr = weeksByProv.get(w.provider_id) ?? [];
    arr.push(w);
    weeksByProv.set(w.provider_id, arr);
  }

  return (
    <Page size="LETTER" style={s.page}>
      <Chrome headerText={headerText} />

      {/* 9. Pillar weights */}
      <SectionTitle n={9} label="Pillar Weights" sub="Current blend used for the composite above" />
      <Kv
        rows={[
          ...PILLARS.map((p): [string, string] => [
            p.title,
            `${(weights[p.key] * 100).toFixed(0)}%`,
          ]),
          ["Sum", `${Math.round(Object.values(weights).reduce((a, b) => a + b, 0) * 100)}%`],
        ]}
      />

      {/* 10. Premium provider roster */}
      <SectionTitle
        n={10}
        label="Premium Provider Roster"
        sub={`${premium.length} of ${providers.length} providers tagged premium`}
      />
      <View style={s.tHead}>
        <Text style={[s.tHeadCell, { width: "40%" }]}>Provider</Text>
        <Text style={[s.tHeadCell, { width: "16%", textAlign: "right" }]}>$ min/wk</Text>
        <Text style={[s.tHeadCell, { width: "16%", textAlign: "right" }]}>$ max/wk</Text>
        <Text style={[s.tHeadCell, { width: "18%" }]}>Category</Text>
        <Text style={[s.tHeadCell, { width: "10%", textAlign: "right" }]}>Weeks</Text>
      </View>
      {premium.length === 0 ? (
        <View style={s.tRow}>
          <Text style={[s.tCell, { width: "100%", color: C.muted, textAlign: "center" }]}>
            No premium providers in the live set.
          </Text>
        </View>
      ) : (
        premium.map((p, i) => (
          <View key={p.id} style={[s.tRow, i % 2 === 1 ? s.tRowAlt : {}]} wrap={false}>
            <Text style={[s.tCell, { width: "40%", fontWeight: 700 }]}>{p.name}</Text>
            <Text style={[s.tCell, s.tCellNum, { width: "16%" }]}>{fmtMoney(p.price_min)}</Text>
            <Text style={[s.tCell, s.tCellNum, { width: "16%" }]}>{fmtMoney(p.price_max)}</Text>
            <Text style={[s.tCell, { width: "18%" }]}>{p.category_classified ?? "—"}</Text>
            <Text style={[s.tCell, s.tCellNum, { width: "10%" }]}>
              {weeksByProv.get(p.id)?.length ?? 0}
            </Text>
          </View>
        ))
      )}

      {/* 11. Data lineage */}
      <SectionTitle
        n={11}
        label="Data Lineage"
        sub="Latest pipeline run that fed this brief (mvs_pipeline_runs)"
      />
      {latestRun ? (
        <Kv
          rows={[
            ["Run ID", latestRun.id],
            ["Status", latestRun.status],
            ["Started", fmtTs(latestRun.started_at)],
            ["Finished", fmtTs(latestRun.finished_at)],
            ["Firecrawl calls", String(latestRun.firecrawl_calls)],
            ["Provider rows (mvs_providers)", String(providers.length)],
            ["Week rows (mvs_weeks)", String(weeks.length)],
            ["ACS children 5-12", acs ? fmtInt(acs.children_5_12_count) : "—"],
            [
              "ACS affluent dual-income families",
              acs ? fmtInt(acs.affluent_dual_income_family_count) : "—",
            ],
            ["Error", latestRun.error ?? "none"],
          ]}
        />
      ) : (
        <Text style={[s.bulletText, { color: C.muted }]}>
          No pipeline run recorded for this city yet.
        </Text>
      )}

      {/* 12. Methodology */}
      <SectionTitle n={12} label="Methodology &amp; Footnotes" />
      <View>
        <View style={s.bullet}>
          <Text style={s.bulletDot}>•</Text>
          <Text style={s.bulletText}>
            Composite = sum(weight_i × pillar_score_i). All pillar scores clamped 0–100. If
            any pillar is null (incomplete data), composite is null and reported as “—”.
          </Text>
        </View>
        <View style={s.bullet}>
          <Text style={s.bulletDot}>•</Text>
          <Text style={s.bulletText}>
            Normalization version: <Text style={{ fontFamily: "Courier" }}>{MVS_NORMALIZATION_VERSION}</Text>.
            Shared helper: <Text style={{ fontFamily: "Courier" }}>src/lib/mvs/computeMvs.ts</Text>.
          </Text>
        </View>
        <View style={s.bullet}>
          <Text style={s.bulletDot}>•</Text>
          <Text style={s.bulletText}>
            Confidence flag: {lowConfidence ? "LOW — review before sharing externally." : "OK."}
          </Text>
        </View>
        <View style={s.bullet}>
          <Text style={s.bulletDot}>•</Text>
          <Text style={s.bulletText}>
            Full methodology lives at <Text style={{ color: C.blue }}>/mvs-methodology</Text> in
            the app.
          </Text>
        </View>
      </View>
      <Text style={s.footnote}>
        Brett&apos;s rule: every number on this page is recomputed from the same helper the
        on-screen MVS table, deep-dive panel, and compare modal use. No stored composites.
      </Text>
    </Page>
  );
};

// ---------------------------------------------------------------------------
// Appendix — per-week table for premium providers
// ---------------------------------------------------------------------------

const STATUS_COLOR: Record<string, string> = {
  sold_out: C.green,
  waitlist: C.green,
  low_availability: C.blue,
  limited: C.blue,
  open: C.muted,
  unknown: C.muted,
};

const AppendixPage: React.FC<{ args: MvsBriefArgs; headerText: string }> = ({
  args,
  headerText,
}) => {
  const { providers, weeksDetailed = [] } = args;
  const premiumIds = new Set(providers.filter((p) => p.tier === "premium").map((p) => p.id));
  const rows = [...weeksDetailed]
    .filter((w) => premiumIds.has(w.provider_id))
    .sort(
      (a, b) =>
        a.provider_name.localeCompare(b.provider_name) ||
        a.week_start.localeCompare(b.week_start),
    );

  const screenshots = rows.filter((r) => !!r.screenshot_url).slice(0, 12);

  return (
    <Page size="LETTER" style={s.page}>
      <Chrome headerText={headerText} />
      <SectionTitle
        n={13}
        label="Appendix — Per-Week Premium Bookings"
        sub={`${rows.length} provider × week row${rows.length === 1 ? "" : "s"} from mvs_weeks (premium tier only)`}
      />

      <View style={s.tHead} fixed>
        <Text style={[s.tHeadCell, { width: "34%" }]}>Provider</Text>
        <Text style={[s.tHeadCell, { width: "16%" }]}>Week start</Text>
        <Text style={[s.tHeadCell, { width: "16%" }]}>Week end</Text>
        <Text style={[s.tHeadCell, { width: "20%" }]}>Status</Text>
        <Text style={[s.tHeadCell, { width: "14%", textAlign: "right" }]}>Confidence</Text>
      </View>
      {rows.length === 0 ? (
        <View style={s.tRow}>
          <Text style={[s.tCell, { width: "100%", color: C.muted, textAlign: "center" }]}>
            No per-week rows recorded for premium providers.
          </Text>
        </View>
      ) : (
        rows.map((r, i) => (
          <View key={`${r.provider_id}-${r.week_start}`} style={[s.tRow, i % 2 === 1 ? s.tRowAlt : {}]} wrap={false}>
            <Text style={[s.tCell, { width: "34%", fontWeight: 700 }]}>{r.provider_name}</Text>
            <Text style={[s.tCell, s.tCellNum, { width: "16%", textAlign: "left" }]}>
              {r.week_start}
            </Text>
            <Text style={[s.tCell, s.tCellNum, { width: "16%", textAlign: "left" }]}>
              {r.week_end ?? "—"}
            </Text>
            <Text
              style={[
                s.tCell,
                { width: "20%", color: STATUS_COLOR[r.status] ?? C.navy, fontWeight: 600 },
              ]}
            >
              {r.status}
            </Text>
            <Text style={[s.tCell, s.tCellNum, { width: "14%" }]}>
              {r.confidence != null ? r.confidence.toFixed(2) : "—"}
            </Text>
          </View>
        ))
      )}

      {/* Screenshot evidence (URL list, internal-only). React-PDF Image of
          remote URLs is unreliable (CORS, oversized payloads). For an internal
          brief, listing the URL is more useful — Brett can click through. */}
      {screenshots.length > 0 && (
        <>
          <SectionTitle
            n={14}
            label="Evidence Links"
            sub={`Up to 12 screenshot URLs captured by the scraper (mvs_weeks.screenshot_url)`}
          />
          <View>
            {screenshots.map((r, i) => (
              <View key={`shot-${i}`} style={s.bullet} wrap={false}>
                <Text style={s.bulletDot}>•</Text>
                <Text style={[s.bulletText, { fontSize: 8.5 }]}>
                  <Text style={{ fontWeight: 700 }}>{r.provider_name}</Text>
                  {" — "}
                  <Text style={{ fontFamily: "Courier" }}>{r.week_start}</Text>
                  {" · "}
                  <Text style={{ color: C.blue, fontFamily: "Courier" }}>{r.screenshot_url}</Text>
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      <Text style={s.footnote}>
        Appendix data fetched at PDF-generation time directly from{" "}
        <Text style={{ fontFamily: "Courier" }}>mvs_weeks</Text>. Shown for transparency only —
        Market Absorption was removed from the composite in v1.1.
      </Text>
    </Page>
  );
};

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

export const MvsBriefDocument: React.FC<MvsBriefArgs> = (args) => {
  const today = (args.generatedAt ?? new Date()).toISOString().slice(0, 10);
  const headerText = `${args.cityDisplay}, ${args.stateDisplay} · ${today}`;
  return (
    <Document
      title={`MVS Brief — ${args.cityDisplay}, ${args.stateDisplay}`}
      author="Neuron Garage"
      subject="Market Validation Score — Internal Brief"
    >
      <CoverAndExec args={args} today={today} headerText={headerText} />
      <PillarPages args={args} headerText={headerText} />
      <RosterAndLineage args={args} headerText={headerText} />
      <AppendixPage args={args} headerText={headerText} />
    </Document>
  );
};


export async function renderMvsBriefPdfBlob(args: MvsBriefArgs): Promise<Blob> {
  return await pdf(<MvsBriefDocument {...args} />).toBlob();
}
