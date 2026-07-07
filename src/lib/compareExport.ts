// Compare-modal export builders (XLSX + PDF). Pure — no DOM/React.
//
// Both builders MUST consume pillar numbers from the same pipeline the modal
// renders on screen (`buildRecomputedPillarScores → buildPillarView`) so the
// exported file matches the screen value-for-value. This is the May-24
// "one calibrated number everywhere" rule extended to exports.

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { buildMarketView, buildPillarView, type PillarKey } from "@/lib/marketView";
import { tierFromDisplayScore } from "@/lib/cityTiers";
import {
  buildSeededFallbackSignalsFromScored,
  type RankedMarket,
} from "@/lib/cityScoringLiveData";
import {
  buildRecomputedPillarScores,
  buildRecomputedRawComposite,
  type AppliedSubWeights,
} from "@/lib/recomputedPillars";
import { METRICS_BY_CATEGORY } from "@/lib/sowMetricRegistry";
import { formatMetric } from "@/lib/numberFormat";
import type { CategoryKey } from "@/stores/cityScoringStore";

// Tier 1 rework (2026-07-07) Phase 3b: CSI-derived Competitive Opportunity
// was removed from the composite, so the compare export drops that column
// too — it would show a score that no longer influences the total.
const PILLARS: { key: PillarKey; label: string }[] = [
  { key: "demand", label: "Demand" },
  { key: "franchiseeSupply", label: "TAM Teachers" },
];

const SHORT_STATE: Record<string, string> = { Texas: "TX", Florida: "FL" };
const shortState = (s: string) => SHORT_STATE[s] ?? s;
const cityHeader = (m: RankedMarket) => `${m.city}, ${shortState(m.state)}`;

// ── filename helper ────────────────────────────────────────────────────
function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function isoDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}
export function buildCompareFilename(
  markets: RankedMarket[],
  ext: "xlsx" | "pdf",
  date = new Date(),
): string {
  const named = markets.slice(0, 4).map((m) => slug(m.city));
  const extra = markets.length > 4 ? `-plus-${markets.length - 4}-more` : "";
  return `compare-${named.join("-")}${extra}-${isoDate(date)}.${ext}`;
}

// ── shared data assembly ───────────────────────────────────────────────
type PillarRow = { label: string; values: (number | null)[] };
type SignalRow = { key: string; label: string; values: string[] };

function assemble(
  markets: RankedMarket[],
  appliedSubWeights: AppliedSubWeights,
  appliedWeights: Partial<Record<CategoryKey, number>>,
) {
  // Use the re-ranked composite (same pipeline as the table SCORE column)
  // so exports always match what the user sees on screen.
  const displayComposite = (m: RankedMarket): number | null => {
    if (!m.hasLiveData) return null;
    const raw = buildRecomputedRawComposite(m, appliedSubWeights, appliedWeights);
    return buildMarketView({ ...m, compositeScore: raw }).composite || null;
  };
  const overall = markets.map(displayComposite);
  const tiers = markets.map((m) => {
    const v = displayComposite(m);
    return v == null ? null : tierFromDisplayScore(v);
  });

  const pillarRows: PillarRow[] = PILLARS.map(({ key, label }) => ({
    label,
    values: markets.map((m) => {
      if (!m.hasLiveData) return null;
      const recomputed = buildRecomputedPillarScores(m, appliedSubWeights);
      return buildPillarView(recomputed)[key].display ?? null;
    }),
  }));

  // Signals: union of keys seen across markets, preserving first-seen order.
  const seen = new Map<string, string>(); // key → label
  const valuesByCity: Record<string, Record<string, string>> = {};
  markets.forEach((m, idx) => {
    if (!m.scoredRow) return;
    const seeded = buildSeededFallbackSignalsFromScored(m.scoredRow);
    valuesByCity[idx] = {};
    seeded.forEach((s) => {
      if (!s.signal_key) return;
      if (!seen.has(s.signal_key)) seen.set(s.signal_key, s.label || s.signal_key);
      valuesByCity[idx][s.signal_key] = formatMetric(s.value, s.signal_key);
    });
  });
  const signalRows: SignalRow[] = Array.from(seen.entries()).map(([key, label]) => ({
    key,
    label,
    values: markets.map((_, idx) => valuesByCity[idx]?.[key] ?? "—"),
  }));

  return { overall, tiers, pillarRows, signalRows };
}

// ── XLSX builder ───────────────────────────────────────────────────────
export function buildCompareWorkbook(
  markets: RankedMarket[],
  appliedSubWeights: AppliedSubWeights,
  appliedWeights: Partial<Record<CategoryKey, number>>,
  presetName: string | null,
  exportedAt: Date = new Date(),
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const data = assemble(markets, appliedSubWeights, appliedWeights);
  const headerCols = markets.map(cityHeader);

  // Sheet 1: Overview
  const overviewAoa: (string | number | null)[][] = [["Metric", ...headerCols]];
  overviewAoa.push(["Overall Score (/100)", ...data.overall]);
  overviewAoa.push(["Tier", ...data.tiers.map((t) => t ?? "—")]);
  data.pillarRows.forEach((row) =>
    overviewAoa.push([row.label, ...row.values]),
  );
  const wsOverview = XLSX.utils.aoa_to_sheet(overviewAoa);
  wsOverview["!cols"] = [{ wch: 28 }, ...headerCols.map(() => ({ wch: 22 }))];
  XLSX.utils.book_append_sheet(wb, wsOverview, "Overview");

  // Sheet 2: Key Market Signals
  const signalsAoa: (string | number)[][] = [["Signal", ...headerCols]];
  data.signalRows.forEach((row) => signalsAoa.push([row.label, ...row.values]));
  const wsSignals = XLSX.utils.aoa_to_sheet(signalsAoa);
  wsSignals["!cols"] = [{ wch: 32 }, ...headerCols.map(() => ({ wch: 22 }))];
  XLSX.utils.book_append_sheet(wb, wsSignals, "Key Market Signals");

  // Sheet 3: Weights Snapshot
  const masterTotal =
    (Object.values(appliedWeights) as number[]).reduce((s, v) => s + (v ?? 0), 0) ||
    1;
  const snapAoa: (string | number)[][] = [];
  snapAoa.push([`Weights snapshot — exported ${exportedAt.toISOString()}`]);
  snapAoa.push([`Active preset: ${presetName ?? "Custom"}`]);
  snapAoa.push([]);
  snapAoa.push(["Category", "Master Weight (raw)", "Master Weight % (normalized)"]);
  const catLabels: Partial<Record<CategoryKey, string>> = {
    demand: "Demand",
    franchiseeSupply: "TAM Teachers",
  };
  (Object.keys(catLabels) as CategoryKey[]).forEach((k) => {
    const raw = appliedWeights[k] ?? 0;
    snapAoa.push([catLabels[k]!, raw, Number(((raw / masterTotal) * 100).toFixed(2))]);
  });
  snapAoa.push([]);
  snapAoa.push(["Category", "Metric", "Sub-weight (raw)", "Normalized Share %"]);
  (Object.keys(catLabels) as CategoryKey[]).forEach((k) => {
    const subs = appliedSubWeights[k] ?? {};
    const enabled = (METRICS_BY_CATEGORY[k] ?? []).filter(
      (m) => (subs[m.key] ?? 0) > 0,
    );
    const subTotal = enabled.reduce((s, m) => s + (subs[m.key] ?? 0), 0) || 1;
    if (enabled.length === 0) {
      snapAoa.push([catLabels[k]!, "(no enabled metrics)", 0, 0]);
    } else {
      enabled.forEach((m) => {
        const w = subs[m.key] ?? 0;
        snapAoa.push([
          catLabels[k]!,
          m.label,
          w,
          Number(((w / subTotal) * 100).toFixed(2)),
        ]);
      });
    }
  });
  const wsSnap = XLSX.utils.aoa_to_sheet(snapAoa);
  wsSnap["!cols"] = [{ wch: 28 }, { wch: 32 }, { wch: 20 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsSnap, "Weights Snapshot");

  return wb;
}

// ── PDF builder ────────────────────────────────────────────────────────
export function buildComparePdf(
  markets: RankedMarket[],
  appliedSubWeights: AppliedSubWeights,
  appliedWeights: Partial<Record<CategoryKey, number>>,
  presetName: string | null,
  exportedAt: Date = new Date(),
): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const data = assemble(markets, appliedSubWeights, appliedWeights);
  const headerCols = markets.map(cityHeader);

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Market Comparison", 40, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(
    `${exportedAt.toLocaleDateString()} · Preset: ${presetName ?? "Custom"} · ${markets.length} markets`,
    40,
    68,
  );
  doc.setTextColor(0);

  // Overview + Category Scores in one table
  const overviewBody: (string | number)[][] = [];
  overviewBody.push([
    "Overall Score (/100)",
    ...data.overall.map((v) => (v == null ? "—" : String(v))),
  ]);
  overviewBody.push(["Tier", ...data.tiers.map((t) => t ?? "—")]);
  data.pillarRows.forEach((row) =>
    overviewBody.push([row.label, ...row.values.map((v) => (v == null ? "—" : String(v)))]),
  );

  autoTable(doc, {
    startY: 86,
    head: [["Metric", ...headerCols]],
    body: overviewBody,
    headStyles: { fillColor: [23, 75, 232], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 5 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 160 } },
    theme: "grid",
  });

  // Signals table
  const lastY = (doc as any).lastAutoTable?.finalY ?? 200;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Key Market Signals", 40, lastY + 24);

  autoTable(doc, {
    startY: lastY + 32,
    head: [["Signal", ...headerCols]],
    body: data.signalRows.map((r) => [r.label, ...r.values]),
    headStyles: { fillColor: [231, 237, 247], textColor: 20, fontStyle: "bold" },
    styles: { fontSize: 8.5, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 160 } },
    theme: "grid",
  });

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    const pageW = doc.internal.pageSize.getWidth();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(
      `Generated by Neuron Garage Franchise Intelligence — ${exportedAt.toISOString()}`,
      40,
      pageH - 24,
    );
    doc.text(`Page ${i} / ${pageCount}`, pageW - 80, pageH - 24);
    doc.setTextColor(0);
  }

  return doc;
}
