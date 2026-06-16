// Branded Feature 1B Site Analysis PDF — satisfies Sam's brief v2.2 (p.10) and
// SOW v2.2 (p.5) section list. One source of truth for pillar + composite
// numbers: callers MUST pass pillars from `recomputeSiteScores` so the PDF
// never disagrees with the on-screen cards.
//
// All glyphs are ASCII (jsPDF helvetica is WinAnsi — unicode renders as boxes).
// Layout uses jspdf-autotable for all tabular sections (no overlap, no clipping).

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { SasPillarScores } from "@/lib/sasMath";
import type { SiteScoreSignals } from "@/hooks/useSiteScore";
import type { SiteDecisionRow, SiteVerdict } from "@/hooks/useSiteDecisions";

const VERDICT_LABEL: Record<SiteVerdict, string> = {
  recommend: "Recommend",
  worth_a_look: "Worth a look",
  dont_recommend: "Don't recommend",
  undecided: "Undecided",
};

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

// Colors as RGB tuples (autoTable wants tuples, jsPDF setters want numbers)
const NAVY: [number, number, number] = [7, 20, 47];
const BLUE: [number, number, number] = [23, 75, 232];
const MUTED: [number, number, number] = [82, 96, 120];
const SOFT: [number, number, number] = [247, 250, 255];
const LINE: [number, number, number] = [229, 234, 242];
const GREEN: [number, number, number] = [29, 107, 50];
const AMBER: [number, number, number] = [122, 88, 0];
const RED: [number, number, number] = [163, 20, 43];
const WHITE: [number, number, number] = [255, 255, 255];

const PILLAR_ORDER: { key: keyof SasPillarScores; label: string; weight: string }[] = [
  { key: "schoolProfile", label: "School Profile", weight: "25%" },
  { key: "affluence", label: "Neighborhood Affluence", weight: "25%" },
  { key: "familyDensity", label: "Family Density", weight: "20%" },
  { key: "ecosystem", label: "School Ecosystem", weight: "15%" },
  { key: "accessibility", label: "Accessibility", weight: "15%" },
];

function fmtMoney(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "-";
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${Math.round(v)}`;
}
function fmtPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "-";
  const pct = v > 1 ? v : v * 100;
  return `${Math.round(pct)}%`;
}
function fmtCount(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "-";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000).toLocaleString()}k`;
  return Math.round(v).toLocaleString();
}
function fmtMi(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "-";
  return `${v.toFixed(1)} mi`;
}

function tierColor(tier: string): [number, number, number] {
  if (tier === "Recommend") return GREEN;
  if (tier === "Worth a look") return AMBER;
  return RED;
}

function verdictSentence(c: SitePackCandidate): string {
  if (c.tierLabel === "Recommend") {
    return `${c.schoolName} clears the Recommend threshold (SAS ${c.composite}) on Sam's 25/25/20/15/15 weighting -- proceed to LOI diligence.`;
  }
  if (c.tierLabel === "Worth a look") {
    return `${c.schoolName} lands in the Worth-a-Look band (SAS ${c.composite}). Validate weakest pillar before committing.`;
  }
  return `${c.schoolName} scores SAS ${c.composite}, below the Recommend threshold on Sam's 25/25/20/15/15 weighting. Do not pursue.`;
}

function strengthsBullets(c: SitePackCandidate): string[] {
  const out: string[] = [];
  for (const p of PILLAR_ORDER) {
    const v = c.pillars[p.key];
    if (v >= 70) out.push(`${p.label} is strong (${v}/100, weight ${p.weight}).`);
  }
  if (!out.length) out.push("No pillar scored above 70 -- this site has no standout strength under Sam's weighting.");
  return out;
}

function risksBullets(c: SitePackCandidate): string[] {
  const out: string[] = [];
  for (const p of PILLAR_ORDER) {
    const v = c.pillars[p.key];
    if (v < 50) out.push(`${p.label} is weak (${v}/100, weight ${p.weight}). Drags ${(parseFloat(p.weight) * v / 100).toFixed(1)} pt off composite.`);
  }
  if (!out.length) out.push("No pillar below 50 -- no headline risks under the calibrated bands.");
  return out;
}

function opportunitiesBullets(c: SitePackCandidate): string[] {
  const out: string[] = [];
  for (const p of PILLAR_ORDER) {
    const v = c.pillars[p.key];
    if (v >= 50 && v < 70) out.push(`${p.label} is mid-band (${v}/100) -- a +10 lift here would move composite by ${(parseFloat(p.weight) * 0.1).toFixed(1)} pt.`);
  }
  if (!out.length) out.push("No mid-band pillars to optimize -- site reads either strongly positive or strongly negative.");
  return out;
}

function recommendationsBullets(c: SitePackCandidate): string[] {
  const out: string[] = [];
  if (c.tierLabel === "Recommend") {
    out.push("Advance to LOI. Confirm enrollment and lease terms with school admin.");
    out.push("Lock site in pipeline; begin teacher-search for this geography.");
  } else if (c.tierLabel === "Worth a look") {
    out.push("Run a second-anchor stress test before committing capital.");
    out.push("Investigate weakest pillar in-person before issuing LOI.");
  } else {
    out.push("Do not pursue. Composite is below the Recommend bar on Sam's weighting.");
    out.push("Re-direct search to addresses scoring >= 60 in the same MSA.");
  }
  const d = c.decision;
  if (d?.verdict && d.verdict !== "undecided") {
    out.push(`User decision recorded: ${VERDICT_LABEL[d.verdict]}.`);
  }
  if (d?.notes) out.push(`Decision notes: ${d.notes}`);
  if (d?.is_winner) out.push("* Marked as winner -- this site ships in the recommendation pack.");
  return out;
}

export function buildSitePackPdf(args: BuildSitePackArgs): jsPDF {
  const { candidates, generatedAt = new Date() } = args;
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const marginX = 40;
  const marginTop = 56;
  const marginBottom = 48;
  const contentW = pageW - marginX * 2;
  const today = generatedAt.toISOString().slice(0, 10);
  let pageNum = 0;
  let y = marginTop;
  let currentHeader = `Neuron Garage -- Site Analysis Report | Generated ${today}`;

  const setText = (rgb: [number, number, number]) => pdf.setTextColor(rgb[0], rgb[1], rgb[2]);
  const setFill = (rgb: [number, number, number]) => pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
  const setDraw = (rgb: [number, number, number]) => pdf.setDrawColor(rgb[0], rgb[1], rgb[2]);

  const drawChrome = (headerText: string) => {
    pageNum++;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    setText(MUTED);
    pdf.text(headerText, marginX, 28);
    setDraw(LINE);
    pdf.setLineWidth(0.5);
    pdf.line(marginX, 36, pageW - marginX, 36);
    pdf.text(`Page ${pageNum}`, pageW - marginX, pageH - 24, { align: "right" });
    setText(MUTED);
    pdf.text("Neuron Garage | Site Analysis | Phase 2 Feature 1B", marginX, pageH - 24);
  };

  const newPage = (headerText: string) => {
    pdf.addPage();
    y = marginTop;
    drawChrome(headerText);
  };

  const ensureSpace = (need: number, headerText: string) => {
    if (y + need > pageH - marginBottom) newPage(headerText);
  };

  const sectionTitle = (n: string, label: string) => {
    ensureSpace(32, currentHeader);
    setFill(SOFT);
    pdf.rect(marginX, y - 2, contentW, 22, "F");
    setText(NAVY);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(`${n}. ${label}`, marginX + 8, y + 13);
    y += 28;
  };

  const body = (text: string, opts: { bold?: boolean; size?: number; color?: [number, number, number] } = {}) => {
    pdf.setFont("helvetica", opts.bold ? "bold" : "normal");
    pdf.setFontSize(opts.size ?? 10);
    setText(opts.color ?? NAVY);
    const lines = pdf.splitTextToSize(text, contentW);
    for (const line of lines) {
      ensureSpace(14, currentHeader);
      pdf.text(line, marginX, y);
      y += 13;
    }
  };

  const bullets = (items: string[]) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    setText(NAVY);
    for (const item of items) {
      const lines = pdf.splitTextToSize(`- ${item}`, contentW - 10);
      for (let i = 0; i < lines.length; i++) {
        ensureSpace(13, currentHeader);
        pdf.text(lines[i], marginX + (i === 0 ? 0 : 10), y);
        y += 13;
      }
      y += 3;
    }
  };

  const kvTable = (rows: [string, string][]) => {
    autoTable(pdf, {
      startY: y,
      margin: { left: marginX, right: marginX },
      tableWidth: contentW,
      body: rows,
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: 5,
        textColor: NAVY,
        lineColor: LINE,
        lineWidth: 0.5,
      },
      columnStyles: {
        0: { cellWidth: 220, textColor: MUTED },
        1: { fontStyle: "bold" },
      },
      alternateRowStyles: { fillColor: SOFT },
    });
    // @ts-expect-error - autoTable attaches lastAutoTable to the doc
    y = pdf.lastAutoTable.finalY + 10;
  };

  // ---------- Cover page ----------
  drawChrome(currentHeader);
  setText(BLUE);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(24);
  pdf.text("Site Analysis Report", marginX, y + 20);
  y += 40;
  setText(MUTED);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text(`Generated ${today} | ${candidates.length} candidate site${candidates.length === 1 ? "" : "s"} analyzed`, marginX, y);
  y += 18;
  pdf.text("SAS weighting: 25% School Profile | 25% Affluence | 20% Family Density | 15% Ecosystem | 15% Accessibility", marginX, y);
  y += 24;

  // Cover summary table
  autoTable(pdf, {
    startY: y,
    margin: { left: marginX, right: marginX },
    tableWidth: contentW,
    head: [["Candidate", "SAS", "Tier", "Decision", "Winner"]],
    body: candidates.map((c) => [
      c.schoolName,
      String(c.composite),
      c.tierLabel,
      VERDICT_LABEL[c.decision?.verdict ?? "undecided"],
      c.decision?.is_winner ? "*" : "",
    ]),
    theme: "striped",
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold", fontSize: 10 },
    styles: { font: "helvetica", fontSize: 10, cellPadding: 6, textColor: NAVY, lineColor: LINE },
    alternateRowStyles: { fillColor: SOFT },
    columnStyles: {
      1: { halign: "center", cellWidth: 50, fontStyle: "bold" },
      2: { cellWidth: 90, fontStyle: "bold" },
      3: { cellWidth: 90 },
      4: { halign: "center", cellWidth: 50, fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 2) {
        data.cell.styles.textColor = tierColor(String(data.cell.raw));
      }
      if (data.section === "body" && data.column.index === 4 && data.cell.raw === "*") {
        data.cell.styles.textColor = GREEN;
      }
    },
  });
  // @ts-expect-error - autoTable attaches lastAutoTable to the doc
  y = pdf.lastAutoTable.finalY + 16;

  // ---------- Per-candidate detail pages ----------
  for (const c of candidates) {
    currentHeader = `${c.schoolName} -- ${today}`;
    newPage(currentHeader);

    // 1. Executive Summary
    sectionTitle("1", "Executive Summary");
    body(c.schoolName, { bold: true, size: 13 });
    body(c.address, { color: MUTED });
    y += 6;

    // SAS score box + tier chip + verdict sentence (hand-drawn)
    const boxTop = y;
    setFill(SOFT);
    pdf.rect(marginX, boxTop, 110, 70, "F");
    setText(NAVY);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(30);
    pdf.text(String(c.composite), marginX + 55, boxTop + 40, { align: "center" });
    pdf.setFontSize(7);
    setText(MUTED);
    pdf.text("SAS (Site Analysis Score)", marginX + 55, boxTop + 58, { align: "center" });

    // Tier + winner badge to the right of score box
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    setText(tierColor(c.tierLabel));
    pdf.text(`Tier: ${c.tierLabel}`, marginX + 124, boxTop + 18);

    if (c.decision?.is_winner) {
      setFill(GREEN);
      pdf.rect(marginX + 124, boxTop + 26, 80, 16, "F");
      setText(WHITE);
      pdf.setFontSize(10);
      pdf.text("* WINNER", marginX + 164, boxTop + 37, { align: "center" });
    }

    setText(NAVY);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    const verdictTop = boxTop + (c.decision?.is_winner ? 52 : 36);
    const verdictLines = pdf.splitTextToSize(verdictSentence(c), contentW - 130);
    let vy = verdictTop;
    for (const line of verdictLines) {
      pdf.text(line, marginX + 124, vy);
      vy += 11;
    }
    y = boxTop + 80;

    // 2. School Profile
    sectionTitle("2", `School Profile  |  sub-score ${c.pillars.schoolProfile}/100`);
    kvTable([
      ["School name", c.schoolName],
      ["Type", c.schoolTypeLabel],
      ["Grade band", c.gradeBandLabel],
      ["Enrollment", c.enrollment || "-"],
    ]);

    // 3. Neighborhood Affluence
    sectionTitle("3", `Neighborhood Affluence  |  sub-score ${c.pillars.affluence}/100`);
    const acs10 = c.signals?.acs10;
    const acs15 = c.signals?.acs15;
    kvTable([
      ["Median HHI - 10-min drive", fmtMoney(acs10?.medianHhi)],
      ["Median HHI - 15-min drive", fmtMoney(acs15?.medianHhi)],
      ["Households > $150K - 10-min", fmtPct(acs10?.pctAbove150k)],
      ["Households > $150K - 15-min", fmtPct(acs15?.pctAbove150k)],
    ]);

    // Map
    if (c.mapPngDataUrl) {
      ensureSpace(170, currentHeader);
      try {
        pdf.addImage(c.mapPngDataUrl, "PNG", marginX, y, contentW, 150);
        y += 154;
        setText(MUTED);
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(8);
        pdf.text("10-minute (inner) and 15-minute (outer) drive-time isochrones around the candidate address.", marginX, y);
        y += 14;
      } catch {
        body("[Isochrone map failed to render]", { color: MUTED, size: 9 });
      }
    } else {
      body("[Isochrone map unavailable -- re-run engine to generate drive-time rings.]", { color: MUTED, size: 9 });
    }

    // 4. Family Density
    sectionTitle("4", `Family Density  |  sub-score ${c.pillars.familyDensity}/100`);
    kvTable([
      ["Children 5-12 - 10-min drive", fmtCount(acs10?.children5to12)],
      ["Children 5-12 - 15-min drive", fmtCount(acs15?.children5to12)],
      ["Total population - 15-min", fmtCount(acs15?.totalPop)],
    ]);

    // ---- Page 2 ----
    newPage(currentHeader);

    // 5. School Ecosystem
    sectionTitle("5", `School Ecosystem  |  sub-score ${c.pillars.ecosystem}/100`);
    const eco = c.signals?.ecosystem;
    kvTable([
      ["Elementary schools nearby", fmtCount(eco?.elementaryCount)],
      ["Private schools nearby", fmtCount(eco?.privateCount)],
      ["Total nearby student population", fmtCount(eco?.nearbyStudentPop)],
    ]);

    // 6. Accessibility
    sectionTitle("6", `Accessibility  |  sub-score ${c.pillars.accessibility}/100`);
    const acc = c.signals?.accessibility;
    kvTable([
      ["Distance to major road", fmtMi(acc?.roadDistanceMi)],
      ["Distance to highway", fmtMi(acc?.highwayDistanceMi)],
      ["Population reachable - 15-min", fmtCount(acs15?.totalPop)],
    ]);

    // 7. Strengths
    sectionTitle("7", "Strengths");
    bullets(strengthsBullets(c));
    y += 4;

    // 8. Risks
    sectionTitle("8", "Risks");
    bullets(risksBullets(c));
    y += 4;

    // 9. Opportunities
    sectionTitle("9", "Opportunities");
    bullets(opportunitiesBullets(c));
    y += 4;

    // 10. Recommendations
    sectionTitle("10", "Recommendations");
    bullets(recommendationsBullets(c));
  }

  // ---------- Final page: 4-up comparison matrix ----------
  currentHeader = `Side-by-side comparison -- ${today}`;
  newPage(currentHeader);
  setText(BLUE);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("Side-by-Side Comparison", marginX, y);
  y += 22;
  setText(MUTED);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("Up to 4 candidates | all numbers recomputed from the same calibrated helper.", marginX, y);
  y += 16;

  const cols = candidates.slice(0, 4);
  const headRow: string[] = ["Metric", ...cols.map((c) => c.schoolName + (c.decision?.is_winner ? "  *" : ""))];

  const matrixRows: (string | number)[][] = [
    ["Address", ...cols.map((c) => c.address.split(",")[0] ?? c.address)],
    ["SAS Composite", ...cols.map((c) => c.composite)],
    ["Tier", ...cols.map((c) => c.tierLabel)],
    ["School Profile (25%)", ...cols.map((c) => c.pillars.schoolProfile)],
    ["Affluence (25%)", ...cols.map((c) => c.pillars.affluence)],
    ["Family Density (20%)", ...cols.map((c) => c.pillars.familyDensity)],
    ["Ecosystem (15%)", ...cols.map((c) => c.pillars.ecosystem)],
    ["Accessibility (15%)", ...cols.map((c) => c.pillars.accessibility)],
    ["Decision", ...cols.map((c) => VERDICT_LABEL[c.decision?.verdict ?? "undecided"])],
    ["Winner", ...cols.map((c) => (c.decision?.is_winner ? "*" : "-"))],
  ];

  autoTable(pdf, {
    startY: y,
    margin: { left: marginX, right: marginX },
    tableWidth: contentW,
    head: [headRow],
    body: matrixRows,
    theme: "grid",
    headStyles: {
      fillColor: NAVY,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
    },
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 5,
      textColor: NAVY,
      lineColor: LINE,
      lineWidth: 0.5,
      overflow: "linebreak",
    },
    columnStyles: {
      0: { fontStyle: "bold", textColor: MUTED, cellWidth: 110 },
    },
    alternateRowStyles: { fillColor: SOFT },
    didParseCell: (data) => {
      // Color the Tier row by tier
      if (data.section === "body" && data.row.index === 2 && data.column.index > 0) {
        data.cell.styles.textColor = tierColor(String(data.cell.raw));
        data.cell.styles.fontStyle = "bold";
      }
      // Winner row
      if (data.section === "body" && data.row.index === 9 && data.column.index > 0 && data.cell.raw === "*") {
        data.cell.styles.textColor = GREEN;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
  // @ts-expect-error - autoTable attaches lastAutoTable to the doc
  y = pdf.lastAutoTable.finalY + 14;

  setText(MUTED);
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(8);
  pdf.text(
    "All pillar and composite scores in this report are read from recomputeSiteScores -- the same helper used by the on-screen cards. No stored DB values are displayed.",
    marginX,
    y,
    { maxWidth: contentW },
  );

  return pdf;
}

/**
 * Fetch a Mapbox Static Images URL and convert it to a base64 data URL suitable
 * for `pdf.addImage(..., "PNG", ...)`. Returns null on any failure.
 */
export async function fetchMapPng(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(typeof fr.result === "string" ? fr.result : null);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
