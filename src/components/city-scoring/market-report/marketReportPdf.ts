// PDF generator for MarketReportModal. Mirrors the modal: total score,
// category scores, AI executive summary (and four narrative sub-sections
// when available), and the on-screen key market signals.
import jsPDF from "jspdf";
import type { CityData } from "@/data/cityData";
import { buildPillarView, type PillarKey } from "@/lib/marketView";
import type { CityNarrative } from "@/lib/useCityNarrative";
import type { SigRow } from "../ExecutiveSummaryPanel";
import { SIGNAL_EXPLAIN } from "../signalExplain";

const CAT_LABELS: { key: PillarKey; label: string }[] = [
  { key: "demand", label: "Demand" },
  { key: "competitiveLandscape", label: "Competitive Opportunity" },
  { key: "franchiseeSupply", label: "Operator & Venue Supply" },
];

interface BuildPdfArgs {
  market: CityData;
  stateAbbr: string;
  categoryScores: Record<string, number>;
  sigRows: SigRow[];
  narrative: CityNarrative | null;
  score: number;
  tier: number | string;
  verdictLabel: string;
}

// Strip the small subset of markdown that the narrative produces so jsPDF
// renders clean text (no leading `**`, `#`, or `- ` artifacts).
function stripMarkdown(md: string): string {
  return md
    .replace(/^\s*#+\s*/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

export function buildMarketReportPdf(args: BuildPdfArgs): jsPDF {
  const { market, stateAbbr, categoryScores, sigRows, narrative, score, tier, verdictLabel } = args;
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const marginX = 40;
  const marginTop = 56;
  const marginBottom = 48;
  const contentW = pageW - marginX * 2;
  const today = new Date().toISOString().slice(0, 10);
  const headerText = `${market.city}, ${stateAbbr} — Market Research Report  ·  Generated ${today}`;
  let pageNum = 0;
  let y = marginTop;

  const setColor = (hex: string) => {
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

  const drawChrome = () => {
    pageNum++;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    setColor("#8794ab");
    pdf.text(headerText, marginX, 28);
    setDraw("#e5eaf2");
    pdf.setLineWidth(0.5);
    pdf.line(marginX, 36, pageW - marginX, 36);
    pdf.text(`Page ${pageNum}`, pageW - marginX, pageH - 24, { align: "right" });
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - marginBottom) {
      pdf.addPage();
      drawChrome();
      y = marginTop;
    }
  };

  const heading = (text: string) => {
    ensureSpace(28);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    setColor("#07142f");
    pdf.text(text, marginX, y);
    y += 6;
    setDraw("#174be8");
    pdf.setLineWidth(1.2);
    pdf.line(marginX, y, marginX + 28, y);
    y += 12;
  };

  const subheading = (text: string) => {
    ensureSpace(18);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    setColor("#07142f");
    pdf.text(text, marginX, y);
    y += 12;
  };

  const paragraph = (text: string, color = "#3a4c72", size = 9.5) => {
    if (!text) return;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(size);
    setColor(color);
    const lines = pdf.splitTextToSize(text, contentW) as string[];
    const lh = size * 1.35;
    for (const line of lines) {
      ensureSpace(lh);
      pdf.text(line, marginX, y);
      y += lh;
    }
  };

  // ===== Cover =====
  drawChrome();
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  setColor("#07142f");
  pdf.text(`${market.city}, ${stateAbbr}`, marginX, y + 10);
  y += 26;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  setColor("#526078");
  pdf.text("Market Research Report", marginX, y);
  y += 22;

  // ===== Total score card =====
  ensureSpace(64);
  setDraw("#e5eaf2");
  setFill("#f7faff");
  pdf.setLineWidth(0.6);
  pdf.roundedRect(marginX, y, contentW, 56, 6, 6, "FD");
  setColor("#8794ab");
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("TOTAL SCORE", marginX + 14, y + 20);
  setColor("#07142f");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text(`${score}`, pageW - marginX - 14, y + 26, { align: "right" });
  setColor("#8794ab");
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text("/100", pageW - marginX - 14, y + 40, { align: "right" });
  setColor("#174be8");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text(`Tier ${tier} · ${verdictLabel.replace("-", " ")} market`, marginX + 14, y + 42);
  y += 70;

  // ===== Category scores =====
  heading("Category Scores");
  const pdfPillars = buildPillarView(categoryScores as Partial<Record<PillarKey, number>>);
  const colW = (contentW - 20) / 2;
  const barH = 6;
  const itemH = 26;
  for (let i = 0; i < CAT_LABELS.length; i += 2) {
    ensureSpace(itemH + 4);
    for (let j = 0; j < 2 && i + j < CAT_LABELS.length; j++) {
      const c = CAT_LABELS[i + j];
      const x = marginX + j * (colW + 20);
      const p = pdfPillars[c.key];
      const s = p?.display ?? 0;
      const label = p?.displayFormatted ?? "—";
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9.5);
      setColor("#526078");
      pdf.text(c.label, x, y);
      pdf.setFont("helvetica", "bold");
      setColor("#07142f");
      pdf.text(label, x + colW, y, { align: "right" });
      setFill("#e8edf6");
      pdf.roundedRect(x, y + 5, colW, barH, 3, 3, "F");
      setFill("#174be8");
      pdf.roundedRect(x, y + 5, Math.max(0, Math.min(100, s)) / 100 * colW, barH, 3, 3, "F");
    }
    y += itemH;
  }
  y += 4;

  // ===== AI Executive Summary =====
  heading("AI Executive Summary");
  if (narrative) {
    paragraph(narrative.executive_summary, "#14233b", 10);
    y += 6;
    subheading("Market Snapshot");
    paragraph(stripMarkdown(narrative.report_snapshot));
    y += 4;
    subheading("Demand-Side Read");
    paragraph(stripMarkdown(narrative.report_demand));
    y += 4;
    subheading("Supply & Competitive Read");
    paragraph(stripMarkdown(narrative.report_supply));
    y += 4;
    subheading("Recommended Next Move");
    paragraph(stripMarkdown(narrative.report_next_move));
  } else {
    paragraph("Narrative not loaded. Open the report once before downloading the PDF to ensure the AI summary is included.", "#8794ab");
  }
  y += 8;

  // ===== Key market signals =====
  heading("Key Market Signals");
  if (sigRows.length === 0) {
    paragraph("No signals available for this market yet.", "#526078");
  } else {
    sigRows.forEach((r) => {
      const lh = 14;
      ensureSpace(lh + 22);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      setColor("#07142f");
      const leftLines = pdf.splitTextToSize(r.label, contentW * 0.72) as string[];
      pdf.text(leftLines[0], marginX, y);
      pdf.text(String(r.value ?? "—"), pageW - marginX, y, { align: "right" });
      y += lh;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      setColor("#8794ab");
      const meta = r.benchmark?.label ? `${r.source}  ·  ${r.benchmark.label}` : r.source;
      pdf.text(meta, marginX, y);
      y += 11;

      const tone = r.benchmark?.tone;
      const explain = tone ? SIGNAL_EXPLAIN[r.key]?.[tone] ?? "" : "";
      if (explain) {
        paragraph(explain, "#3a4763", 9);
      }
      setDraw("#f1f4f9");
      pdf.setLineWidth(0.4);
      pdf.line(marginX, y + 2, pageW - marginX, y + 2);
      y += 8;
    });
  }

  return pdf;
}
