// Branded Feature 1B Site Analysis (SAS) PDF — react-pdf/renderer.
// Polished SAS cover (logo + brand strip + SAS badge + scale legend + headline card),
// per-candidate detail pages with pillar mini-bars and colored bullets, and a
// side-by-side comparison page. All numbers come from recomputeSiteScores so
// the PDF mirrors the on-screen SAS page exactly.

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
import type { SasPillarScores } from "@/lib/sasMath";
import type { SiteScoreSignals } from "@/hooks/useSiteScore";
import type { SiteDecisionRow } from "@/hooks/useSiteDecisions";
import {
  VERDICT_LABEL,
  fmtMoney,
  fmtPct,
  fmtCount,
  fmtMi,
  tierColor,
  verdictSentence,
  strengthsBullets,
  risksBullets,
  opportunitiesBullets,
  summaryBullets,
} from "./copy";
import logoPng from "@/assets/neuron-garage-logo.png";

// Use PDF built-in Helvetica so export never depends on remote font fetching.
Font.registerHyphenationCallback((word) => [word]);

// ---- Palette ----
const C = {
  navy: "#07142f",
  blue: "#174be8",
  blueSoft: "#dbe5ff",
  muted: "#526078",
  soft: "#f7faff",
  line: "#e5eaf2",
  green: "#1d6b32",
  greenSoft: "#dff3e3",
  amber: "#7a5800",
  amberSoft: "#fbeec8",
  red: "#a3142b",
  redSoft: "#f7d7dc",
  white: "#ffffff",
  gold: "#c79a2a",
};

// ---- Styles ----
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: C.navy,
    paddingTop: 64,
    paddingBottom: 48,
    paddingHorizontal: 40,
  },
  // Page chrome (top brand strip + footer)
  brandStrip: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 36,
    backgroundColor: C.navy,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    justifyContent: "space-between",
  },
  brandLogo: { width: 22, height: 22 },
  brandLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandWordmark: { fontSize: 9, color: C.white, fontWeight: 700, letterSpacing: 0.6 },
  brandRight: { fontSize: 8, color: C.white, opacity: 0.85 },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 40,
    right: 40,
    fontSize: 8,
    color: C.muted,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: C.line,
    paddingTop: 6,
  },

  // Cover hero
  sasBadge: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  sasBadgeLetters: {
    fontSize: 44,
    fontWeight: 700,
    color: C.blue,
    letterSpacing: 2,
    lineHeight: 1,
  },
  sasBadgeCaption: { fontSize: 9, color: C.muted, marginBottom: 4, letterSpacing: 0.5 },
  coverTitle: { fontSize: 28, color: C.navy, fontWeight: 700, marginTop: 14 },
  coverRule: { height: 2, backgroundColor: C.blue, width: 60, marginTop: 6, marginBottom: 8 },
  coverSub: { fontSize: 10.5, color: C.muted, marginTop: 2 },

  // SAS scale legend
  legendWrap: { marginTop: 14, marginBottom: 6 },
  legendTitle: { fontSize: 8.5, color: C.muted, marginBottom: 4, letterSpacing: 0.4 },
  legendRow: { flexDirection: "row", gap: 6 },
  legendBand: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 3,
    flexDirection: "column",
  },
  legendBandLabel: { fontSize: 9, fontWeight: 700 },
  legendBandRange: { fontSize: 8, marginTop: 1 },

  // Headline card (top candidate)
  headlineCard: {
    marginTop: 14,
    backgroundColor: C.soft,
    borderLeftWidth: 3,
    borderLeftColor: C.blue,
    padding: 12,
    borderRadius: 4,
    flexDirection: "row",
    gap: 14,
  },
  headlineLeft: { width: 110, alignItems: "center", justifyContent: "center" },
  headlineNum: { fontSize: 36, fontWeight: 700, color: C.navy, lineHeight: 1 },
  headlineNumLbl: { fontSize: 7.5, color: C.muted, marginTop: 6, textAlign: "center" },
  headlineRight: { flex: 1 },
  headlineRowTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  headlineSchool: { fontSize: 13, fontWeight: 700, color: C.navy },
  headlineVerdict: { fontSize: 9.5, color: C.navy, lineHeight: 1.4 },

  // Section bands
  sectionBand: {
    backgroundColor: C.soft,
    borderLeftWidth: 3,
    borderLeftColor: C.blue,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginTop: 14,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: C.navy },

  // Pillar mini-bar
  pillarBarTrack: {
    height: 5,
    backgroundColor: C.line,
    borderRadius: 3,
    marginTop: 4,
    marginBottom: 8,
    position: "relative",
  },
  pillarBarFill: {
    position: "absolute",
    top: 0,
    left: 0,
    height: 5,
    backgroundColor: C.blue,
    borderRadius: 3,
  },

  // KV table
  kvRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: C.line,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  kvRowAlt: { backgroundColor: C.soft },
  kvLabel: { fontSize: 9.5, color: C.muted, width: "55%" },
  kvVal: { fontSize: 9.5, color: C.navy, fontWeight: 600, width: "45%" },

  // Bullets
  bullet: { flexDirection: "row", marginBottom: 4, alignItems: "flex-start" },
  bulletDot: { width: 10, fontWeight: 700, lineHeight: 1.4 },
  bulletText: { flex: 1, fontSize: 9.5, lineHeight: 1.4 },

  // Exec card on candidate page
  execCard: {
    backgroundColor: C.soft,
    borderRadius: 4,
    padding: 10,
    marginTop: 4,
    flexDirection: "row",
    gap: 14,
  },
  execScoreBox: { width: 100, alignItems: "center", justifyContent: "center" },
  execScoreNum: { fontSize: 32, fontWeight: 700, color: C.navy, lineHeight: 1 },
  execScoreLbl: { fontSize: 7, color: C.muted, marginTop: 4, textAlign: "center" },
  execRight: { flex: 1, justifyContent: "flex-start" },
  chip: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 8.5,
    fontWeight: 700,
    marginBottom: 4,
  },
  verdict: { fontSize: 9.5, lineHeight: 1.4, color: C.navy },

  // Tables (cover + comparison)
  tHead: { flexDirection: "row", backgroundColor: C.blueSoft },
  tHeadCell: {
    fontSize: 9,
    fontWeight: 700,
    color: C.navy,
    paddingVertical: 7,
    paddingHorizontal: 6,
  },
  tRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: C.line,
  },
  tCell: { fontSize: 9, paddingVertical: 7, paddingHorizontal: 6 },

  mapFrame: {
    marginTop: 8,
    borderWidth: 0.5,
    borderColor: C.line,
    borderRadius: 4,
    padding: 4,
  },
  mapCaption: { fontSize: 8, color: C.muted, fontStyle: "italic", marginTop: 4 },

  // Per-candidate page top bar
  candidateBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 8,
    marginBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: C.line,
  },
  candidateBarLogo: { width: 18, height: 18 },
  candidateBarTitle: { fontSize: 12, fontWeight: 700, color: C.navy, flex: 1 },
  candidateBarTag: {
    fontSize: 8,
    color: C.blue,
    backgroundColor: C.blueSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontWeight: 700,
  },
});

// ---- Public types (matches old buildSitePackPdf API) ----
export interface SitePackCandidate {
  schoolName: string;
  address: string;
  schoolTypeLabel: string;
  gradeBandLabel: string;
  enrollment: string;
  pillars: SasPillarScores;
  composite: number;
  tierLabel: string;
  signals: SiteScoreSignals | null;
  decision: SiteDecisionRow | undefined;
  mapPngDataUrl: string | null;
}

export interface BuildSitePackArgs {
  candidates: SitePackCandidate[];
  generatedAt?: Date;
}

// ---- Helpers ----
function tierBgSoft(tierLabel: string): string {
  const c = tierColor(tierLabel);
  if (c === C.green) return C.greenSoft;
  if (c === C.blue) return C.blueSoft;
  if (c === C.amber) return C.amberSoft;
  if (c === C.red) return C.redSoft;
  return C.soft;
}

// ---- Primitives ----
const BrandStrip: React.FC<{ today: string }> = ({ today }) => (
  <View style={s.brandStrip} fixed>
    <View style={s.brandLeft}>
      <Image src={logoPng} style={s.brandLogo} />
      <Text style={s.brandWordmark}>NEURON GARAGE</Text>
    </View>
    <Text style={s.brandRight}>{`SAS Report · ${today}`}</Text>
  </View>
);

const PageFooter: React.FC<{ today: string }> = ({ today }) => (
  <View style={s.footer} fixed>
    <Text>{`Neuron Garage · SAS Report · ${today}`}</Text>
    <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
  </View>
);

const SectionTitle: React.FC<{ n: string; label: string }> = ({ n, label }) => (
  <View style={s.sectionBand} wrap={false}>
    <Text style={s.sectionTitle}>{`${n}. ${label}`}</Text>
  </View>
);

const PillarBar: React.FC<{ value: number }> = ({ value }) => {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={s.pillarBarTrack}>
      <View style={[s.pillarBarFill, { width: `${pct}%` }]} />
    </View>
  );
};

const KvTable: React.FC<{ rows: [string, string][] }> = ({ rows }) => (
  <View>
    {rows.map(([k, v], i) => (
      <View key={k} style={[s.kvRow, i % 2 === 1 ? s.kvRowAlt : {}]} wrap={false}>
        <Text style={s.kvLabel}>{k}</Text>
        <Text style={s.kvVal}>{v}</Text>
      </View>
    ))}
  </View>
);

const BulletList: React.FC<{ items: string[]; dotColor?: string }> = ({
  items,
  dotColor = C.blue,
}) => (
  <View>
    {items.map((it, i) => (
      <View key={i} style={s.bullet} wrap={false}>
        <Text style={[s.bulletDot, { color: dotColor }]}>•</Text>
        <Text style={s.bulletText}>{it}</Text>
      </View>
    ))}
  </View>
);

const Chip: React.FC<{ label: string; color: string }> = ({ label, color }) => {
  // soft background based on color
  let bg = C.soft;
  if (color === C.green) bg = C.greenSoft;
  else if (color === C.blue) bg = C.blueSoft;
  else if (color === C.amber) bg = C.amberSoft;
  else if (color === C.red) bg = C.redSoft;
  return <Text style={[s.chip, { color, backgroundColor: bg }]}>{label}</Text>;
};

// ---- SAS Cover ----
const CoverPage: React.FC<{ candidates: SitePackCandidate[]; today: string }> = ({
  candidates,
  today,
}) => {
  const colWidths = ["46%", "12%", "22%", "20%"];
  const top = candidates.length
    ? [...candidates].sort((a, b) => b.composite - a.composite)[0]
    : null;

  return (
    <Page size="A4" style={s.page}>
      <BrandStrip today={today} />
      <PageFooter today={today} />

      {/* SAS badge */}
      <View style={s.sasBadge}>
        <Text style={s.sasBadgeLetters}>SAS</Text>
        <Text style={s.sasBadgeCaption}>Site Analysis Score</Text>
      </View>

      {/* Title */}
      <Text style={s.coverTitle}>Site Analysis Report</Text>
      <View style={s.coverRule} />
      <Text style={s.coverSub}>
        {`Prepared ${today} · ${candidates.length} candidate site${candidates.length === 1 ? "" : "s"} analyzed`}
      </Text>

      {/* Scale legend */}
      <View style={s.legendWrap}>
        <Text style={s.legendTitle}>SAS CONFIDENCE SCALE</Text>
        <View style={s.legendRow}>
          <View style={[s.legendBand, { backgroundColor: C.greenSoft }]}>
            <Text style={[s.legendBandLabel, { color: C.green }]}>Strong</Text>
            <Text style={[s.legendBandRange, { color: C.green }]}>≥ 75</Text>
          </View>
          <View style={[s.legendBand, { backgroundColor: C.blueSoft }]}>
            <Text style={[s.legendBandLabel, { color: C.blue }]}>High</Text>
            <Text style={[s.legendBandRange, { color: C.blue }]}>60 – 74</Text>
          </View>
          <View style={[s.legendBand, { backgroundColor: C.amberSoft }]}>
            <Text style={[s.legendBandLabel, { color: C.amber }]}>Medium</Text>
            <Text style={[s.legendBandRange, { color: C.amber }]}>45 – 59</Text>
          </View>
          <View style={[s.legendBand, { backgroundColor: C.redSoft }]}>
            <Text style={[s.legendBandLabel, { color: C.red }]}>Low</Text>
            <Text style={[s.legendBandRange, { color: C.red }]}>{"< 45"}</Text>
          </View>
        </View>
      </View>

      {/* Headline card (top candidate) */}
      {top ? (
        <View style={s.headlineCard} wrap={false}>
          <View style={s.headlineLeft}>
            <Text style={s.headlineNum}>{top.composite}</Text>
            <Text style={s.headlineNumLbl}>SAS COMPOSITE</Text>
          </View>
          <View style={s.headlineRight}>
            <View style={s.headlineRowTop}>
              <Text style={s.headlineSchool}>{top.schoolName}</Text>
            </View>
            <Chip label={top.tierLabel} color={tierColor(top.tierLabel)} />
            <Text style={s.headlineVerdict}>
              {verdictSentence({
                schoolName: top.schoolName,
                composite: top.composite,
                tierLabel: top.tierLabel,
              })}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Candidates table */}
      <View style={{ marginTop: 16 }}>
        <View style={s.tHead}>
          {["Candidate", "SAS", "Confidence band", "User confidence"].map((h, i) => (
            <Text
              key={h}
              style={[
                s.tHeadCell,
                { width: colWidths[i], textAlign: i >= 1 ? "center" : "left" },
              ]}
            >
              {h}
            </Text>
          ))}
        </View>
        {candidates.map((c, i) => (
          <View
            key={c.address + i}
            style={[s.tRow, i % 2 === 1 ? { backgroundColor: C.soft } : {}]}
            wrap={false}
          >
            <Text style={[s.tCell, { width: colWidths[0], fontWeight: 600 }]}>
              {c.schoolName}
            </Text>
            <Text
              style={[
                s.tCell,
                { width: colWidths[1], textAlign: "center", fontWeight: 700 },
              ]}
            >
              {c.composite}
            </Text>
            <Text
              style={[
                s.tCell,
                {
                  width: colWidths[2],
                  textAlign: "center",
                  fontWeight: 700,
                  color: tierColor(c.tierLabel),
                  backgroundColor: tierBgSoft(c.tierLabel),
                },
              ]}
            >
              {c.tierLabel}
            </Text>
            <Text style={[s.tCell, { width: colWidths[3], textAlign: "center" }]}>
              {VERDICT_LABEL[c.decision?.verdict ?? "undecided"]}
            </Text>
          </View>
        ))}
      </View>

      <Text
        style={{
          fontSize: 8,
          color: C.muted,
          fontStyle: "italic",
          marginTop: 18,
          textAlign: "center",
        }}
      >
        SAS weighting: 25 / 25 / 20 / 15 / 15 across School Profile · Affluence · Family Density · Ecosystem · Accessibility · v2.2
      </Text>
    </Page>
  );
};

// ---- Per-candidate detail ----
const CandidateDetail: React.FC<{ c: SitePackCandidate; today: string }> = ({ c, today }) => {
  const acs10 = c.signals?.acs10;
  const acs15 = c.signals?.acs15;
  const eco = c.signals?.ecosystem;
  const acc = c.signals?.accessibility;
  return (
    <Page size="A4" style={s.page}>
      <BrandStrip today={today} />
      <PageFooter today={today} />

      {/* Top bar with logo + candidate name */}
      <View style={s.candidateBar} wrap={false}>
        <Image src={logoPng} style={s.candidateBarLogo} />
        <Text style={s.candidateBarTitle}>{c.schoolName}</Text>
        <Text style={s.candidateBarTag}>SAS {c.composite}</Text>
      </View>

      {/* 1. Executive Summary */}
      <SectionTitle n="1" label="Executive Summary" />
      <Text style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>{c.address}</Text>
      <View style={s.execCard} wrap={false}>
        <View style={s.execScoreBox}>
          <Text style={s.execScoreNum}>{c.composite}</Text>
          <Text style={s.execScoreLbl}>SAS COMPOSITE</Text>
        </View>
        <View style={s.execRight}>
          <Chip label={`Confidence: ${c.tierLabel}`} color={tierColor(c.tierLabel)} />
          <Text style={s.verdict}>
            {verdictSentence({
              schoolName: c.schoolName,
              composite: c.composite,
              tierLabel: c.tierLabel,
            })}
          </Text>
        </View>
      </View>

      {/* 2. School Profile */}
      <SectionTitle n="2" label={`School Profile  ·  sub-score ${c.pillars.schoolProfile}/100`} />
      <PillarBar value={c.pillars.schoolProfile} />
      <KvTable
        rows={[
          ["School name", c.schoolName],
          ["Type", c.schoolTypeLabel],
          ["Grade band", c.gradeBandLabel],
          ["Enrollment", c.enrollment || "—"],
        ]}
      />

      {/* 3. Neighborhood Affluence */}
      <SectionTitle n="3" label={`Neighborhood Affluence  ·  sub-score ${c.pillars.affluence}/100`} />
      <PillarBar value={c.pillars.affluence} />
      <KvTable
        rows={[
          ["Median HHI · 10-min drive", fmtMoney(acs10?.medianHhi)],
          ["Median HHI · 15-min drive", fmtMoney(acs15?.medianHhi)],
          ["Households > $150K · 10-min", fmtPct(acs10?.pctAbove150k)],
          ["Households > $150K · 15-min", fmtPct(acs15?.pctAbove150k)],
        ]}
      />
      {c.mapPngDataUrl ? (
        <View wrap={false} style={s.mapFrame}>
          <Image
            src={c.mapPngDataUrl}
            style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 3 }}
          />
          <Text style={s.mapCaption}>
            10-minute (inner) and 15-minute (outer) drive-time isochrones around the candidate address.
          </Text>
        </View>
      ) : (
        <Text style={{ fontSize: 9, color: C.muted, marginTop: 6 }}>
          [Isochrone map unavailable — re-run engine to generate drive-time rings.]
        </Text>
      )}

      {/* 4. Family Density */}
      <SectionTitle n="4" label={`Family Density  ·  sub-score ${c.pillars.familyDensity}/100`} />
      <PillarBar value={c.pillars.familyDensity} />
      <KvTable
        rows={[
          ["Children 5–12 · 10-min drive", fmtCount(acs10?.children5to12)],
          ["Children 5–12 · 15-min drive", fmtCount(acs15?.children5to12)],
          ["Total population · 15-min", fmtCount(acs15?.totalPop)],
        ]}
      />

      {/* 5. School Ecosystem */}
      <SectionTitle n="5" label={`School Ecosystem  ·  sub-score ${c.pillars.ecosystem}/100`} />
      <PillarBar value={c.pillars.ecosystem} />
      <KvTable
        rows={[
          ["Elementary schools nearby", fmtCount(eco?.elementaryCount)],
          ["Private schools nearby", fmtCount(eco?.privateCount)],
          ["Total nearby student population", fmtCount(eco?.nearbyStudentPop)],
        ]}
      />

      {/* 6. Accessibility */}
      <SectionTitle n="6" label={`Accessibility  ·  sub-score ${c.pillars.accessibility}/100`} />
      <PillarBar value={c.pillars.accessibility} />
      <KvTable
        rows={[
          ["Distance to major road", fmtMi(acc?.roadDistanceMi)],
          ["Distance to highway", fmtMi(acc?.highwayDistanceMi)],
          ["Population reachable · 15-min", fmtCount(acs15?.totalPop)],
        ]}
      />

      {/* 7. Strengths */}
      <SectionTitle n="7" label="Strengths" />
      <BulletList items={strengthsBullets(c.pillars)} dotColor={C.green} />

      {/* 8. Risks */}
      <SectionTitle n="8" label="Risks" />
      <BulletList items={risksBullets(c.pillars)} dotColor={C.red} />

      {/* 9. Opportunities */}
      <SectionTitle n="9" label="Opportunities" />
      <BulletList items={opportunitiesBullets(c.pillars)} dotColor={C.amber} />

      {/* 10. Summary & Next Steps */}
      <SectionTitle n="10" label="Summary & Next Steps" />
      <BulletList
        items={summaryBullets({
          tierLabel: c.tierLabel,
          verdict: c.decision?.verdict,
          notes: c.decision?.notes,
        })}
        dotColor={C.blue}
      />
    </Page>
  );
};

// ---- 4-up comparison ----
const ComparisonPage: React.FC<{ candidates: SitePackCandidate[]; today: string }> = ({
  candidates,
  today,
}) => {
  const cols = candidates.slice(0, 4);
  const labelW = "22%";
  const colW = `${(100 - 22) / Math.max(cols.length, 1)}%`;
  const rows: {
    label: string;
    values: string[];
    colorPerCol?: (string | null)[];
    bgPerCol?: (string | null)[];
    boldPerCol?: boolean[];
  }[] = [
    { label: "Address", values: cols.map((c) => c.address.split(",")[0] ?? c.address) },
    {
      label: "SAS Composite",
      values: cols.map((c) => String(c.composite)),
      boldPerCol: cols.map(() => true),
    },
    {
      label: "Confidence band",
      values: cols.map((c) => c.tierLabel),
      colorPerCol: cols.map((c) => tierColor(c.tierLabel)),
      bgPerCol: cols.map((c) => tierBgSoft(c.tierLabel)),
      boldPerCol: cols.map(() => true),
    },
    { label: "School Profile (25%)", values: cols.map((c) => String(c.pillars.schoolProfile)) },
    { label: "Affluence (25%)", values: cols.map((c) => String(c.pillars.affluence)) },
    { label: "Family Density (20%)", values: cols.map((c) => String(c.pillars.familyDensity)) },
    { label: "Ecosystem (15%)", values: cols.map((c) => String(c.pillars.ecosystem)) },
    { label: "Accessibility (15%)", values: cols.map((c) => String(c.pillars.accessibility)) },
    {
      label: "User confidence",
      values: cols.map((c) => VERDICT_LABEL[c.decision?.verdict ?? "undecided"]),
    },
  ];
  return (
    <Page size="A4" style={s.page}>
      <BrandStrip today={today} />
      <PageFooter today={today} />

      <Text style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginTop: 6 }}>
        Side-by-Side Comparison
      </Text>
      <View style={[s.coverRule, { width: 50 }]} />
      <Text style={{ fontSize: 9, color: C.muted, marginBottom: 10 }}>
        Up to 4 candidates · all numbers recomputed from the same calibrated helper.
      </Text>

      <View>
        <View style={s.tHead}>
          <Text style={[s.tHeadCell, { width: labelW }]}>Metric</Text>
          {cols.map((c, i) => (
            <Text key={i} style={[s.tHeadCell, { width: colW, textAlign: "center" }]}>
              {c.schoolName}
            </Text>
          ))}
        </View>
        {rows.map((r, ri) => (
          <View
            key={r.label}
            style={[s.tRow, ri % 2 === 1 ? { backgroundColor: C.soft } : {}]}
          >
            <Text style={[s.tCell, { width: labelW, color: C.muted, fontWeight: 600 }]}>
              {r.label}
            </Text>
            {r.values.map((v, ci) => (
              <Text
                key={ci}
                style={[
                  s.tCell,
                  {
                    width: colW,
                    textAlign: "center",
                    color: r.colorPerCol?.[ci] ?? C.navy,
                    backgroundColor: r.bgPerCol?.[ci] ?? "transparent",
                    fontWeight: r.boldPerCol?.[ci] ? 700 : 400,
                  },
                ]}
              >
                {v}
              </Text>
            ))}
          </View>
        ))}
      </View>

      <Text style={{ fontSize: 8, color: C.muted, fontStyle: "italic", marginTop: 14 }}>
        All pillar and composite scores in this report are read from recomputeSiteScores — the same helper used by
        the on-screen SAS cards. No stored DB values are displayed.
      </Text>
    </Page>
  );
};

// ---- Top-level document ----
export const SitePackDocument: React.FC<BuildSitePackArgs> = ({
  candidates,
  generatedAt = new Date(),
}) => {
  const today = generatedAt.toISOString().slice(0, 10);
  return (
    <Document title="Neuron Garage — SAS Report" author="Neuron Garage">
      <CoverPage candidates={candidates} today={today} />
      {candidates.map((c, i) => (
        <CandidateDetail key={c.address + i} c={c} today={today} />
      ))}
      <ComparisonPage candidates={candidates} today={today} />
    </Document>
  );
};

export async function renderSitePackPdfBlob(args: BuildSitePackArgs): Promise<Blob> {
  return await pdf(<SitePackDocument {...args} />).toBlob();
}
