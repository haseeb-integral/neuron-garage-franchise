// Branded Feature 1B Site Analysis PDF — satisfies Sam's brief v2.2 (p.10) and
// SOW v2.2 (p.5) section list. One source of truth for pillar + composite
// numbers: callers MUST pass pillars from `recomputeSiteScores` so the PDF
// never disagrees with the on-screen cards.
//
// Layout (per analyzed candidate, A4 portrait):
//   Page 1 — Exec Summary · School Profile · Affluence (with map) · Family Density
//   Page 2 — Ecosystem · Accessibility · Strengths · Risks · Opportunities · Recs
// Final page — 4-up comparison matrix.

import jsPDF from "jspdf";
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

const NAVY = "#07142f";
const BLUE = "#174be8";
const MUTED = "#526078";
const SOFT = "#f7faff";
const LINE = "#e5eaf2";
const GREEN = "#1d6b32";
const AMBER = "#7a5800";
const RED = "#a3142b";

const PILLAR_ORDER: { key: keyof SasPillarScores; label: string; weight: string }[] = [
  { key: "schoolProfile", label: "School Profile", weight: "25%" },
  { key: "affluence", label: "Neighborhood Affluence", weight: "25%" },
  { key: "familyDensity", label: "Family Density", weight: "20%" },
  { key: "ecosystem", label: "School Ecosystem", weight: "15%" },
  { key: "accessibility", label: "Accessibility", weight: "15%" },
];

function fmtMoney(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${Math.round(v)}`;
}
function fmtPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  // ACS values are 0–1; treat >1 as already-percent.
  const pct = v > 1 ? v : v * 100;
  return `${Math.round(pct)}%`;
}
function fmtCount(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000).toLocaleString()}k`;
  return Math.round(v).toLocaleString();
}
function fmtMi(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${v.toFixed(1)} mi`;
}

function tierColor(tier: string): string {
  if (tier === "Recommend") return GREEN;
  if (tier === "Worth a look") return AMBER;
  return RED;
}

function verdictSentence(c: SitePackCandidate): string {
  const base =
    c.tierLabel === "Recommend"
      ? `${c.schoolName} clears the Recommend threshold (SAS ${c.composite}) on Sam's 25/25/20/15/15 weighting — proceed to LOI diligence.`
      : c.tierLabel === "Worth a look"
        ? `${c.schoolName} lands in the Worth-a-Look band (SAS ${c.composite}). Validate weakest pillar before committing.`
        : `${c.schoolName} fails the calibrated Recommend bar (SAS ${c.composite}). Negative anchor profile — do not pursue without a re-anchor.`;
  return base;
}

function strengthsBullets(c: SitePackCandidate): string[] {
  const out: string[] = [];
  for (const p of PILLAR_ORDER) {
    const v = c.pillars[p.key];
    if (v >= 70) out.push(`${p.label} is strong (${v}/100, weight ${p.weight}).`);
  }
  if (!out.length) out.push("No pillar scored above 70 — this site has no standout strength under Sam's weighting.");
  return out;
}

function risksBullets(c: SitePackCandidate): string[] {
  const out: string[] = [];
  for (const p of PILLAR_ORDER) {
    const v = c.pillars[p.key];
    if (v < 50) out.push(`${p.label} is weak (${v}/100, weight ${p.weight}). Drags ${(parseFloat(p.weight) * v / 100).toFixed(1)} pt off composite.`);
  }
  if (!out.length) out.push("No pillar below 50 — no headline risks under the calibrated bands.");
  return out;
}

function opportunitiesBullets(c: SitePackCandidate): string[] {
  const out: string[] = [];
  for (const p of PILLAR_ORDER) {
    const v = c.pillars[p.key];
    if (v >= 50 && v < 70) out.push(`${p.label} is mid-band (${v}/100) — a +10 lift here would move composite by ${(parseFloat(p.weight) * 0.1).toFixed(1)} pt.`);
  }
  if (!out.length) out.push("No mid-band pillars to optimize — site reads either strongly positive or strongly negative.");
  return out;
}

function recommendationsBullets(c: SitePackCandidate): string[] {
  const out: string[] = [];
  if (c.tierLabel === "Recommend") {
    out.push("Advance to LOI. Confirm enrollment & lease terms with school admin.");
    out.push("Lock site in pipeline; begin teacher-search for this geography.");
  } else if (c.tierLabel === "Worth a look") {
    out.push("Run a second-anchor stress test before committing capital.");
    out.push("Investigate weakest pillar in-person before issuing LOI.");
  } else {
    out.push("Pass on this site. Document negative anchors for calibration corpus.");
    out.push("Re-direct search to addresses scoring ≥ 60 in the same MSA.");
  }
  const d = c.decision;
  if (d?.verdict && d.verdict !== "undecided") {
    out.push(`User decision recorded: ${VERDICT_LABEL[d.verdict]}.`);
  }
  if (d?.notes) out.push(`Decision notes: ${d.notes}`);
  if (d?.is_winner) out.push("★ Marked as winner — this site ships in the recommendation pack.");
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

  const setText = (hex: string) => {
    const n = parseInt(hex.replace("#", ""), 16);
    pdf.setTextColor((n >> 16) & 255, (n >> 8) & 255, n & 255);
  };
  const setFill = (hex: string) => {
    const n = parseInt(hex.replace("#", ""), 16);
    pdf.setFillColor((n >> 16) & 255, (n >> 8) & 255, n & 255);
  };
  const setDraw = (hex: string) => {
    const n = parseInt(hex.replace("#", ""), 16);
    pdf.setDrawColor((n >> 16) & 255, (n >> 8) & 255, n & 255);
  };

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
    pdf.text("Neuron Garage · Site Analysis · Phase 2 Feature 1B", marginX, pageH - 24);
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
    ensureSpace(28, currentHeader);
    setFill(SOFT);
    pdf.rect(marginX, y - 2, contentW, 20, "F");
    setText(NAVY);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(`${n}. ${label}`, marginX + 8, y + 12);
    y += 26;
  };

  const body = (text: string, opts: { bold?: boolean; size?: number; color?: string } = {}) => {
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

  const kv = (label: string, value: string) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    ensureSpace(14, currentHeader);
    setText(MUTED);
    pdf.text(label, marginX, y);
    setText(NAVY);
    pdf.setFont("helvetica", "bold");
    pdf.text(value, marginX + 200, y);
    y += 14;
  };

  const bullets = (items: string[]) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    setText(NAVY);
    for (const item of items) {
      const lines = pdf.splitTextToSize(`• ${item}`, contentW - 10);
      for (let i = 0; i < lines.length; i++) {
        ensureSpace(13, currentHeader);
        pdf.text(lines[i], marginX + (i === 0 ? 0 : 10), y);
        y += 13;
      }
      y += 2;
    }
  };

  let currentHeader = `Neuron Garage — Site Analysis Report · Generated ${today}`;

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
  pdf.text(`Generated ${today} · ${candidates.length} candidate site${candidates.length === 1 ? "" : "s"} analyzed`, marginX, y);
  y += 20;
  pdf.text("SAS weighting: 25% School Profile · 25% Affluence · 20% Family Density · 15% Ecosystem · 15% Accessibility", marginX, y);
  y += 28;
  // Cover summary table
  setFill(SOFT);
  pdf.rect(marginX, y, contentW, 24, "F");
  setText(NAVY);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("Candidate", marginX + 8, y + 16);
  pdf.text("SAS", marginX + 280, y + 16);
  pdf.text("Tier", marginX + 330, y + 16);
  pdf.text("Decision", marginX + 430, y + 16);
  y += 28;
  pdf.setFont("helvetica", "normal");
  for (const c of candidates) {
    ensureSpace(20, currentHeader);
    setText(NAVY);
    const nameLines = pdf.splitTextToSize(c.schoolName + (c.decision?.is_winner ? "  ★" : ""), 260);
    pdf.text(nameLines[0], marginX + 8, y + 12);
    pdf.text(String(c.composite), marginX + 280, y + 12);
    setText(tierColor(c.tierLabel));
    pdf.text(c.tierLabel, marginX + 330, y + 12);
    setText(NAVY);
    pdf.text(VERDICT_LABEL[c.decision?.verdict ?? "undecided"], marginX + 430, y + 12);
    setDraw(LINE);
    pdf.line(marginX, y + 20, pageW - marginX, y + 20);
    y += 22;
  }

  // ---------- Per-candidate detail pages ----------
  for (const c of candidates) {
    currentHeader = `${c.schoolName} — ${today}`;
    newPage(currentHeader);

    // 1. Executive Summary
    sectionTitle("1", "Executive Summary");
    body(c.schoolName, { bold: true, size: 13 });
    body(c.address, { color: MUTED });
    y += 4;
    // SAS score box
    setFill(SOFT);
    pdf.rect(marginX, y, 110, 60, "F");
    setText(NAVY);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(28);
    pdf.text(String(c.composite), marginX + 55, y + 36, { align: "center" });
    pdf.setFontSize(8);
    setText(MUTED);
    pdf.text("SAS (Site Analysis Score)", marginX + 55, y + 52, { align: "center" });
    // Tier + verdict
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    setText(tierColor(c.tierLabel));
    pdf.text(`Tier: ${c.tierLabel}`, marginX + 124, y + 18);
    if (c.decision?.is_winner) {
      setFill(GREEN);
      pdf.rect(marginX + 124, y + 26, 60, 14, "F");
      setText("#ffffff");
      pdf.setFontSize(9);
      pdf.text("★ Winner", marginX + 154, y + 36, { align: "center" });
    }
    setText(NAVY);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    const verdictLines = pdf.splitTextToSize(verdictSentence(c), contentW - 130);
    let vy = y + (c.decision?.is_winner ? 50 : 36);
    for (const line of verdictLines) {
      pdf.text(line, marginX + 124, vy);
      vy += 11;
    }
    y += 70;

    // 2. School Profile
    sectionTitle("2", `School Profile  ·  sub-score ${c.pillars.schoolProfile}/100`);
    kv("School name", c.schoolName);
    kv("Type", c.schoolTypeLabel);
    kv("Grade band", c.gradeBandLabel);
    kv("Enrollment", c.enrollment || "—");
    y += 6;

    // 3. Neighborhood Affluence
    sectionTitle("3", `Neighborhood Affluence  ·  sub-score ${c.pillars.affluence}/100`);
    const acs10 = c.signals?.acs10;
    const acs15 = c.signals?.acs15;
    kv("Median HHI · 10-min drive", fmtMoney(acs10?.medianHhi));
    kv("Median HHI · 15-min drive", fmtMoney(acs15?.medianHhi));
    kv("Households > $150K · 10-min", fmtPct(acs10?.pctAbove150k));
    kv("Households > $150K · 15-min", fmtPct(acs15?.pctAbove150k));
    y += 6;
    // Map
    if (c.mapPngDataUrl) {
      ensureSpace(160, currentHeader);
      try {
        pdf.addImage(c.mapPngDataUrl, "PNG", marginX, y, contentW, 150);
      } catch {
        setText(MUTED);
        pdf.setFontSize(9);
        pdf.text("[Isochrone map failed to render]", marginX, y + 12);
      }
      y += 156;
      setText(MUTED);
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(8);
      pdf.text("10-minute (inner) and 15-minute (outer) drive-time isochrones around the candidate address.", marginX, y);
      y += 14;
    } else {
      body("[Isochrone map unavailable — re-run engine to generate drive-time rings.]", { color: MUTED, size: 9 });
    }

    // 4. Family Density
    sectionTitle("4", `Family Density  ·  sub-score ${c.pillars.familyDensity}/100`);
    kv("Children 5–12 · 10-min drive", fmtCount(acs10?.children5to12));
    kv("Children 5–12 · 15-min drive", fmtCount(acs15?.children5to12));
    kv("Total population · 15-min", fmtCount(acs15?.totalPop));
    y += 6;

    // ---- Page 2 ----
    newPage(currentHeader);

    // 5. School Ecosystem
    sectionTitle("5", `School Ecosystem  ·  sub-score ${c.pillars.ecosystem}/100`);
    const eco = c.signals?.ecosystem;
    kv("Elementary schools nearby", fmtCount(eco?.elementaryCount));
    kv("Private schools nearby", fmtCount(eco?.privateCount));
    kv("Total nearby student population", fmtCount(eco?.nearbyStudentPop));
    y += 6;

    // 6. Accessibility
    sectionTitle("6", `Accessibility  ·  sub-score ${c.pillars.accessibility}/100`);
    const acc = c.signals?.accessibility;
    kv("Distance to major road", fmtMi(acc?.roadDistanceMi));
    kv("Distance to highway", fmtMi(acc?.highwayDistanceMi));
    kv("Population reachable · 15-min", fmtCount(acs15?.totalPop));
    y += 6;

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
  currentHeader = `Side-by-side comparison — ${today}`;
  newPage(currentHeader);
  setText(BLUE);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("Side-by-Side Comparison", marginX, y);
  y += 22;
  setText(MUTED);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(`Up to 4 candidates · all numbers recomputed from the same calibrated helper.`, marginX, y);
  y += 18;

  const cols = candidates.slice(0, 4);
  const colW = (contentW - 110) / Math.max(cols.length, 1);
  const labelX = marginX;
  const colX = (i: number) => marginX + 110 + i * colW;
  const rowH = 18;

  // Header row
  setFill(SOFT);
  pdf.rect(marginX, y, contentW, rowH, "F");
  setText(NAVY);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("Metric", labelX + 6, y + 12);
  cols.forEach((c, i) => {
    const name = c.schoolName + (c.decision?.is_winner ? "  ★" : "");
    const lines = pdf.splitTextToSize(name, colW - 8);
    pdf.text(lines[0] ?? "", colX(i) + 6, y + 12);
  });
  y += rowH;

  const row = (label: string, values: (string | number)[], colorPerCol?: (string | null)[]) => {
    setDraw(LINE);
    pdf.line(marginX, y + rowH, pageW - marginX, y + rowH);
    setText(MUTED);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(label, labelX + 6, y + 12);
    values.forEach((v, i) => {
      const c = colorPerCol?.[i];
      setText(c ?? NAVY);
      pdf.setFont("helvetica", c ? "bold" : "normal");
      pdf.text(String(v), colX(i) + 6, y + 12);
    });
    y += rowH;
  };

  row("Address", cols.map((c) => c.address.split(",")[0] ?? c.address));
  row("SAS Composite", cols.map((c) => c.composite));
  row("Tier", cols.map((c) => c.tierLabel), cols.map((c) => tierColor(c.tierLabel)));
  row("School Profile (25%)", cols.map((c) => c.pillars.schoolProfile));
  row("Affluence (25%)", cols.map((c) => c.pillars.affluence));
  row("Family Density (20%)", cols.map((c) => c.pillars.familyDensity));
  row("Ecosystem (15%)", cols.map((c) => c.pillars.ecosystem));
  row("Accessibility (15%)", cols.map((c) => c.pillars.accessibility));
  row("Decision", cols.map((c) => VERDICT_LABEL[c.decision?.verdict ?? "undecided"]));
  row("Winner", cols.map((c) => (c.decision?.is_winner ? "★" : "—")));

  y += 12;
  setText(MUTED);
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(8);
  pdf.text(
    "All pillar and composite scores in this report are read from `recomputeSiteScores` — the same helper used by the on-screen cards. No stored DB values are displayed.",
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
