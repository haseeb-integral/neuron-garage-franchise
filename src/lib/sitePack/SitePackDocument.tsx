// Branded Feature 1B Site Analysis PDF rendered with @react-pdf/renderer.
// Satisfies Sam's brief v2.2 (p.10) and SOW v2.2 (p.5) section list.
//
// Layout per candidate (A4 portrait, with auto page-break):
//   1. Executive Summary, 2. School Profile, 3. Affluence (+ isochrone map),
//   4. Family Density, 5. Ecosystem, 6. Accessibility, 7. Strengths, 8. Risks,
//   9. Opportunities, 10. Summary & Next Steps.
// Final page: side-by-side comparison of up to 4 candidates.

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
  recommendationsBullets,
} from "./copy";

// Use PDF built-in Helvetica so export never depends on remote font fetching.
// Stop react-pdf from breaking words mid-character.
Font.registerHyphenationCallback((word) => [word]);

// ---- Palette ----
const C = {
  navy: "#07142f",
  blue: "#174be8",
  muted: "#526078",
  soft: "#f7faff",
  line: "#e5eaf2",
  green: "#1d6b32",
  amber: "#7a5800",
  red: "#a3142b",
  white: "#ffffff",
};

// ---- Styles ----
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: C.navy,
    paddingTop: 56,
    paddingBottom: 48,
    paddingHorizontal: 40,
  },
  header: {
    position: "absolute",
    top: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: C.muted,
    borderBottomWidth: 0.5,
    borderBottomColor: C.line,
    paddingBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: C.muted,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  coverTitle: { fontSize: 26, color: C.blue, fontWeight: 700, marginBottom: 12 },
  coverSub: { fontSize: 11, color: C.muted, marginBottom: 4 },
  sectionBand: {
    backgroundColor: C.soft,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginTop: 14,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: C.navy },
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
  bullet: { flexDirection: "row", marginBottom: 4 },
  bulletDot: { width: 10, color: C.blue, fontWeight: 700 },
  bulletText: { flex: 1, fontSize: 9.5, lineHeight: 1.4 },
  // Exec summary
  execRow: { flexDirection: "row", gap: 14, marginTop: 4 },
  scoreBox: {
    width: 110,
    backgroundColor: C.soft,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
  },
  scoreNum: { fontSize: 30, fontWeight: 700, color: C.navy, lineHeight: 1 },
  scoreLbl: { fontSize: 7, color: C.muted, marginTop: 6, textAlign: "center" },
  execRight: { flex: 1, justifyContent: "flex-start" },
  tierLine: { fontSize: 13, fontWeight: 700, marginBottom: 4 },
  verdict: { fontSize: 10, lineHeight: 1.4 },
  // Tables (cover + comparison)
  tHead: {
    flexDirection: "row",
    backgroundColor: C.navy,
    color: C.white,
  },
  tHeadCell: {
    fontSize: 9,
    fontWeight: 700,
    color: C.white,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  tRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: C.line,
  },
  tCell: { fontSize: 9, paddingVertical: 6, paddingHorizontal: 6 },
  mapCaption: { fontSize: 8, color: C.muted, fontStyle: "italic", marginTop: 4 },
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

// ---- Primitives ----
const Chrome: React.FC<{ headerText: string }> = ({ headerText }) => (
  <>
    <View style={s.header} fixed>
      <Text>{headerText}</Text>
      <Text>Neuron Garage · Site Analysis</Text>
    </View>
    <View style={s.footer} fixed>
      <Text>Neuron Garage · Site Analysis Report</Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  </>
);

const SectionTitle: React.FC<{ n: string; label: string }> = ({ n, label }) => (
  <View style={s.sectionBand} wrap={false}>
    <Text style={s.sectionTitle}>{`${n}. ${label}`}</Text>
  </View>
);

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

const BulletList: React.FC<{ items: string[] }> = ({ items }) => (
  <View>
    {items.map((it, i) => (
      <View key={i} style={s.bullet} wrap={false}>
        <Text style={s.bulletDot}>•</Text>
        <Text style={s.bulletText}>{it}</Text>
      </View>
    ))}
  </View>
);

// ---- Cover ----
const CoverPage: React.FC<{ candidates: SitePackCandidate[]; today: string; headerText: string }> = ({
  candidates,
  today,
  headerText,
}) => {
  const colWidths = ["48%", "12%", "20%", "20%"];
  return (
    <Page size="A4" style={s.page}>
      <Chrome headerText={headerText} />
      <Text style={s.coverTitle}>Site Analysis Report</Text>
      <Text style={s.coverSub}>
        {`Generated ${today} · ${candidates.length} candidate site${candidates.length === 1 ? "" : "s"} analyzed`}
      </Text>
      <Text style={s.coverSub}>
        SAS weighting: 25% School Profile · 25% Affluence · 20% Family Density · 15% Ecosystem · 15% Accessibility
      </Text>

      <View style={{ marginTop: 18 }}>
        <View style={s.tHead}>
          {["Candidate", "SAS", "Confidence band", "User confidence"].map((h, i) => (
            <Text key={h} style={[s.tHeadCell, { width: colWidths[i], textAlign: i >= 1 ? "center" : "left" }]}>
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
            <Text style={[s.tCell, { width: colWidths[0], fontWeight: 600 }]}>{c.schoolName}</Text>
            <Text style={[s.tCell, { width: colWidths[1], textAlign: "center", fontWeight: 700 }]}>
              {c.composite}
            </Text>
            <Text
              style={[
                s.tCell,
                { width: colWidths[2], textAlign: "center", fontWeight: 700, color: tierColor(c.tierLabel) },
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
    </Page>
  );
};

// ---- Per-candidate detail ----
const CandidateDetail: React.FC<{ c: SitePackCandidate; today: string }> = ({ c, today }) => {
  const headerText = `${c.schoolName} — ${today}`;
  const acs10 = c.signals?.acs10;
  const acs15 = c.signals?.acs15;
  const eco = c.signals?.ecosystem;
  const acc = c.signals?.accessibility;
  return (
    <Page size="A4" style={s.page}>
      <Chrome headerText={headerText} />

      {/* 1. Executive Summary */}
      <SectionTitle n="1" label="Executive Summary" />
      <Text style={{ fontSize: 13, fontWeight: 700 }}>{c.schoolName}</Text>
      <Text style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>{c.address}</Text>
      <View style={s.execRow} wrap={false}>
        <View style={s.scoreBox}>
          <Text style={s.scoreNum}>{c.composite}</Text>
          <Text style={s.scoreLbl}>SAS (Site Analysis Score)</Text>
        </View>
        <View style={s.execRight}>
          <Text style={[s.tierLine, { color: tierColor(c.tierLabel) }]}>{`Confidence: ${c.tierLabel}`}</Text>
          <Text style={s.verdict}>
            {verdictSentence({ schoolName: c.schoolName, composite: c.composite, tierLabel: c.tierLabel })}
          </Text>
        </View>
      </View>

      {/* 2. School Profile */}
      <SectionTitle n="2" label={`School Profile  ·  sub-score ${c.pillars.schoolProfile}/100`} />
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
      <KvTable
        rows={[
          ["Median HHI · 10-min drive", fmtMoney(acs10?.medianHhi)],
          ["Median HHI · 15-min drive", fmtMoney(acs15?.medianHhi)],
          ["Households > $150K · 10-min", fmtPct(acs10?.pctAbove150k)],
          ["Households > $150K · 15-min", fmtPct(acs15?.pctAbove150k)],
        ]}
      />
      {c.mapPngDataUrl ? (
        <View wrap={false} style={{ marginTop: 8 }}>
          <Image src={c.mapPngDataUrl} style={{ width: "100%", height: 200, objectFit: "cover" }} />
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
      <KvTable
        rows={[
          ["Children 5–12 · 10-min drive", fmtCount(acs10?.children5to12)],
          ["Children 5–12 · 15-min drive", fmtCount(acs15?.children5to12)],
          ["Total population · 15-min", fmtCount(acs15?.totalPop)],
        ]}
      />

      {/* 5. School Ecosystem */}
      <SectionTitle n="5" label={`School Ecosystem  ·  sub-score ${c.pillars.ecosystem}/100`} />
      <KvTable
        rows={[
          ["Elementary schools nearby", fmtCount(eco?.elementaryCount)],
          ["Private schools nearby", fmtCount(eco?.privateCount)],
          ["Total nearby student population", fmtCount(eco?.nearbyStudentPop)],
        ]}
      />

      {/* 6. Accessibility */}
      <SectionTitle n="6" label={`Accessibility  ·  sub-score ${c.pillars.accessibility}/100`} />
      <KvTable
        rows={[
          ["Distance to major road", fmtMi(acc?.roadDistanceMi)],
          ["Distance to highway", fmtMi(acc?.highwayDistanceMi)],
          ["Population reachable · 15-min", fmtCount(acs15?.totalPop)],
        ]}
      />

      {/* 7. Strengths */}
      <SectionTitle n="7" label="Strengths" />
      <BulletList items={strengthsBullets(c.pillars)} />

      {/* 8. Risks */}
      <SectionTitle n="8" label="Risks" />
      <BulletList items={risksBullets(c.pillars)} />

      {/* 9. Opportunities */}
      <SectionTitle n="9" label="Opportunities" />
      <BulletList items={opportunitiesBullets(c.pillars)} />

      {/* 10. Summary & Next Steps */}
      <SectionTitle n="10" label="Summary & Next Steps" />
      <BulletList
        items={recommendationsBullets({
          tierLabel: c.tierLabel,
          verdict: c.decision?.verdict,
          notes: c.decision?.notes,
        })}
      />
    </Page>
  );
};

// ---- 4-up comparison ----
const ComparisonPage: React.FC<{ candidates: SitePackCandidate[]; today: string }> = ({ candidates, today }) => {
  const cols = candidates.slice(0, 4);
  const labelW = "22%";
  const colW = `${(100 - 22) / Math.max(cols.length, 1)}%`;
  const rows: { label: string; values: string[]; colorPerCol?: (string | null)[]; boldPerCol?: boolean[] }[] = [
    { label: "Address", values: cols.map((c) => c.address.split(",")[0] ?? c.address) },
    { label: "SAS Composite", values: cols.map((c) => String(c.composite)), boldPerCol: cols.map(() => true) },
    {
      label: "Confidence band",
      values: cols.map((c) => c.tierLabel),
      colorPerCol: cols.map((c) => tierColor(c.tierLabel)),
      boldPerCol: cols.map(() => true),
    },
    { label: "School Profile (25%)", values: cols.map((c) => String(c.pillars.schoolProfile)) },
    { label: "Affluence (25%)", values: cols.map((c) => String(c.pillars.affluence)) },
    { label: "Family Density (20%)", values: cols.map((c) => String(c.pillars.familyDensity)) },
    { label: "Ecosystem (15%)", values: cols.map((c) => String(c.pillars.ecosystem)) },
    { label: "Accessibility (15%)", values: cols.map((c) => String(c.pillars.accessibility)) },
    { label: "User confidence", values: cols.map((c) => VERDICT_LABEL[c.decision?.verdict ?? "undecided"]) },
  ];
  return (
    <Page size="A4" style={s.page}>
      <Chrome headerText={`Side-by-side comparison — ${today}`} />
      <Text style={{ fontSize: 16, fontWeight: 700, color: C.blue, marginBottom: 4 }}>
        Side-by-Side Comparison
      </Text>
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
          <View key={r.label} style={[s.tRow, ri % 2 === 1 ? { backgroundColor: C.soft } : {}]}>
            <Text style={[s.tCell, { width: labelW, color: C.muted, fontWeight: 600 }]}>{r.label}</Text>
            {r.values.map((v, ci) => (
              <Text
                key={ci}
                style={[
                  s.tCell,
                  {
                    width: colW,
                    textAlign: "center",
                    color: r.colorPerCol?.[ci] ?? C.navy,
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
        the on-screen cards. No stored DB values are displayed.
      </Text>
    </Page>
  );
};

// ---- Top-level document ----
export const SitePackDocument: React.FC<BuildSitePackArgs> = ({ candidates, generatedAt = new Date() }) => {
  const today = generatedAt.toISOString().slice(0, 10);
  const headerText = `Neuron Garage — Site Analysis Report · Generated ${today}`;
  return (
    <Document title="Neuron Garage — Site Analysis Report" author="Neuron Garage">
      <CoverPage candidates={candidates} today={today} headerText={headerText} />
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
