// PDF generator for MarketReportModal. Pulled out of the component so the
// modal stays presentational and the heavy jsPDF layout work is testable in
// isolation.
import jsPDF from "jspdf";
import type { CityData } from "@/data/cityData";
import { getSignalGeography } from "@/lib/signalGeography";
import type { LiveSignal, MetricCategory } from "./marketReportTypes";

const CAT_LABELS: { key: string; label: string }[] = [
  { key: "demand", label: "Demand" },
  { key: "competitiveLandscape", label: "Competitive Opportunity" },
  { key: "franchiseeSupply", label: "TAM Teachers" },
];

interface BuildPdfArgs {
  market: CityData;
  stateAbbr: string;
  categoryScores: Record<string, number>;
  signals: LiveSignal[];
  prioritySignals: LiveSignal[];
  coverageByCategory: { label: string; dbKey: MetricCategory; live: number; proxy: number; missing: number }[];
  liveCount: number;
  proxyCount: number;
  missingCount: number;
}

export function buildMarketReportPdf(args: BuildPdfArgs): jsPDF {
  const { market, stateAbbr, categoryScores, prioritySignals, coverageByCategory, liveCount, proxyCount, missingCount } = args;
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const marginX = 40;
  const marginTop = 56;
  const marginBottom = 48;
  const contentW = pageW - marginX * 2;
  const today = new Date().toISOString().slice(0, 10);
  const headerText = `${market.city}, ${stateAbbr} — SOW Market Report  ·  Generated ${today}`;
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

  const paragraph = (text: string, color = "#3a4c72", size = 9.5) => {
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

  const row = (left: string, right: string) => {
    const lh = 14;
    ensureSpace(lh + 2);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    setColor("#526078");
    const leftLines = pdf.splitTextToSize(left, contentW * 0.66) as string[];
    pdf.text(leftLines[0], marginX, y);
    setColor("#07142f");
    pdf.setFont("helvetica", "bold");
    pdf.text(right, pageW - marginX, y, { align: "right" });
    y += lh;
    setDraw("#f3f5f9");
    pdf.setLineWidth(0.4);
    pdf.line(marginX, y - 4, pageW - marginX, y - 4);
  };

  // ===== Cover header =====
  drawChrome();
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  setColor("#07142f");
  pdf.text(`${market.city}, ${stateAbbr}`, marginX, y + 10);
  y += 26;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  setColor("#526078");
  pdf.text("SOW Market Report", marginX, y);
  y += 24;

  // ===== Market summary =====
  heading("Market Summary");
  paragraph(
    `This report uses the live SOW metric registry for ${market.city}. It separates confirmed live metrics, proxy-backed metrics, and missing source integrations so the score is auditable instead of relying on hardcoded sample signals.`,
  );
  y += 8;

  // ===== Coverage stats =====
  heading("SOW Coverage Status");
  const cardW = (contentW - 16) / 3;
  const cardH = 52;
  ensureSpace(cardH + 6);
  const cards = [
    { n: liveCount, label: "Live", color: "#0ea66e" },
    { n: proxyCount, label: "Proxy", color: "#174be8" },
    { n: missingCount, label: "Missing", color: "#8794ab" },
  ];
  cards.forEach((c, i) => {
    const x = marginX + i * (cardW + 8);
    setDraw("#eef2f7");
    setFill("#ffffff");
    pdf.setLineWidth(0.6);
    pdf.roundedRect(x, y, cardW, cardH, 4, 4, "FD");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    setColor(c.color);
    pdf.text(String(c.n), x + cardW / 2, y + 24, { align: "center" });
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    setColor("#8794ab");
    pdf.text(c.label.toUpperCase(), x + cardW / 2, y + 40, { align: "center" });
  });
  y += cardH + 14;

  // ===== Category scores =====
  heading("Category Scores");
  const colW = (contentW - 20) / 2;
  const barH = 6;
  const itemH = 26;
  for (let i = 0; i < CAT_LABELS.length; i += 2) {
    ensureSpace(itemH + 4);
    for (let j = 0; j < 2 && i + j < CAT_LABELS.length; j++) {
      const c = CAT_LABELS[i + j];
      const x = marginX + j * (colW + 20);
      const score = categoryScores[c.key] ?? 0;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9.5);
      setColor("#526078");
      pdf.text(c.label, x, y);
      pdf.setFont("helvetica", "bold");
      setColor("#07142f");
      pdf.text(String(categoryScores[c.key] ?? "-"), x + colW, y, { align: "right" });
      setFill("#e8edf6");
      pdf.roundedRect(x, y + 5, colW, barH, 3, 3, "F");
      setFill("#174be8");
      pdf.roundedRect(x, y + 5, Math.max(0, Math.min(100, score)) / 100 * colW, barH, 3, 3, "F");
    }
    y += itemH;
  }
  y += 4;

  // ===== Category coverage =====
  heading("SOW Category Coverage");
  coverageByCategory.forEach((c) => {
    row(c.label, `${c.live} live · ${c.proxy} proxy · ${c.missing} missing`);
  });
  y += 8;

  // ===== Key signals =====
  heading("Key Live / Proxy Market Signals");
  if (prioritySignals.length === 0) {
    paragraph("No live/proxy SOW signals found yet. Run the SOW coverage refresh first.", "#526078");
  } else {
    prioritySignals.forEach((s) => {
      const status = (s.raw_data?.status ?? "proxy").toUpperCase();
      const geo = getSignalGeography(s.source, s.signal_key);
      const used = Boolean(s.raw_data?.used_in_score);
      const tag = `[${status}] [${geo.short}] [${used ? "✓ Counts" : "Info"}]`;
      const label = `${tag}  ${s.label ?? s.signal_key}`;
      row(label, String(s.value ?? "—"));
    });
  }
  y += 8;

  // ===== Recommendation =====
  heading("Recommendation");
  paragraph(
    `Treat ${market.city} as a high-priority market only after reviewing the proxy and missing metrics. The current live/proxy coverage is useful for screening, while pricing, weather, Google Trends, state education, and rental-cost integrations should be completed for a final investment-grade score.`,
  );

  return pdf;
}
