// Four-sheet XLSX export for the ranked-markets spreadsheet view.
//
// Sheet order (left → right):
//   1. "Selected Cities (Raw Metrics)"  — user's current filtered selection,
//      raw DB columns. Default active sheet.
//   2. "Weights Snapshot"               — global category + sub-metric weights
//      at export time.
//   3. "Per-City Weights"               — one row per selected city. Sub-metric
//      columns are GROUPED (outline level 1) and COLLAPSED by default so each
//      category shows only its Master % column on first open. Users click the
//      `+` above the column header to expand a category's sub-metrics.
//   4. "All Cities (Raw Metrics)"       — every city in the underlying ranked
//      dataset (~817), unfiltered. Same column shape as sheet 1. Placed last
//      so it's an explicit "full universe" reference rather than the default
//      view.
//
// Cell alignment: we do NOT set explicit cell styles. The community `xlsx`
// package does not persist `cell.s` on write, so adding styles here would
// have no effect. Excel/Numbers/Sheets fall back to their defaults — text
// left-aligned, numbers right-aligned — which IS the cross-app standard for
// tabular data. If you're seeing centered values, that's a viewer template
// override, not something this exporter writes.

import * as XLSX from "xlsx";
import type { CategoryKey } from "@/stores/cityScoringStore";
import { METRICS_BY_CATEGORY } from "@/lib/sowMetricRegistry";

export type CategoryDef = { key: CategoryKey; label: string };

export type WeightsCityRow = { city: string; state: string };

export type BuildXlsxArgs = {
  categories: CategoryDef[];
  backendHeader: string[];
  backendRows: (string | number | null)[][];
  /** Optional 4th sheet: full unfiltered database. Same header shape as backendHeader. */
  fullDatabaseHeader?: string[];
  fullDatabaseRows?: (string | number | null)[][];
  weightsCities: WeightsCityRow[];
  appliedWeights: Record<CategoryKey, number>;
  appliedSubWeights: Record<CategoryKey, Record<string, number>>;
  exportedAt?: string;
};

export function buildRankedMarketsWorkbook(args: BuildXlsxArgs): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1 (default): Selected Cities (Raw Metrics) ───────────────
  const backendAoa: (string | number | null)[][] = [args.backendHeader, ...args.backendRows];
  const wsBackend = XLSX.utils.aoa_to_sheet(backendAoa);
  wsBackend["!cols"] = args.backendHeader.map((h) => ({
    wch: Math.max(14, Math.min(40, String(h).length + 2)),
  }));
  XLSX.utils.book_append_sheet(wb, wsBackend, "Selected Cities (Raw Metrics)");

  // ── Sheet 2: Weights Snapshot (global) ─────────────────────────────
  const masterTotal =
    args.categories.reduce((s, c) => s + (args.appliedWeights[c.key] ?? 0), 0) || 1;

  const snapAoa: (string | number | null)[][] = [];
  snapAoa.push([`Weights snapshot — exported ${args.exportedAt ?? new Date().toISOString()}`]);
  snapAoa.push([]);
  snapAoa.push(["Category", "Master Weight (raw)", "Master Weight % (normalized)"]);
  for (const cat of args.categories) {
    const raw = args.appliedWeights[cat.key] ?? 0;
    snapAoa.push([cat.label, raw, Number(((raw / masterTotal) * 100).toFixed(2))]);
  }
  snapAoa.push([]);
  snapAoa.push(["Category", "Metric", "Sub-weight (raw)", "Normalized Share %"]);
  for (const cat of args.categories) {
    const subWeights = args.appliedSubWeights[cat.key] ?? {};
    const enabled = (METRICS_BY_CATEGORY[cat.key] ?? []).filter(
      (m) => (subWeights[m.key] ?? 0) > 0,
    );
    const subTotal = enabled.reduce((s, m) => s + (subWeights[m.key] ?? 0), 0) || 1;
    if (enabled.length === 0) {
      snapAoa.push([cat.label, "(no enabled metrics)", 0, 0]);
    } else {
      for (const m of enabled) {
        const w = subWeights[m.key] ?? 0;
        snapAoa.push([cat.label, m.label, w, Number(((w / subTotal) * 100).toFixed(2))]);
      }
    }
  }
  const wsSnap = XLSX.utils.aoa_to_sheet(snapAoa);
  wsSnap["!cols"] = [{ wch: 28 }, { wch: 32 }, { wch: 20 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsSnap, "Weights Snapshot");

  // ── Sheet 3: Per-City Weights (sub-metric cols COLLAPSED by default) ─
  // Each category shows its "Master %" column. Sub-metric columns are
  // grouped at outline level 1 and hidden by default — Excel renders a
  // `+` above the group so users can expand on demand.
  const header: string[] = ["City", "State"];
  const colOutline: number[] = [0, 0];

  type CatBlock = {
    cat: CategoryDef;
    masterPct: number;
    metrics: { key: string; label: string; subShare: number }[];
  };
  const blocks: CatBlock[] = [];

  for (const cat of args.categories) {
    const masterPct = ((args.appliedWeights[cat.key] ?? 0) / masterTotal) * 100;
    const subWeights = args.appliedSubWeights[cat.key] ?? {};
    const enabledMetrics = (METRICS_BY_CATEGORY[cat.key] ?? []).filter(
      (m) => (subWeights[m.key] ?? 0) > 0,
    );
    const subTotal = enabledMetrics.reduce((s, m) => s + (subWeights[m.key] ?? 0), 0) || 1;

    header.push(`${cat.label} — Master %`);
    colOutline.push(0);

    const metrics = enabledMetrics.map((m) => {
      header.push(`${cat.label} → ${m.label} %`);
      colOutline.push(1);
      return {
        key: m.key,
        label: m.label,
        subShare: ((subWeights[m.key] ?? 0) / subTotal) * 100,
      };
    });

    blocks.push({ cat, masterPct, metrics });
  }

  const weightsAoa: (string | number)[][] = [header];
  for (const c of args.weightsCities) {
    const row: (string | number)[] = [c.city, c.state];
    for (const b of blocks) {
      row.push(Number(b.masterPct.toFixed(2)));
      for (const m of b.metrics) row.push(Number(m.subShare.toFixed(2)));
    }
    weightsAoa.push(row);
  }

  const wsW = XLSX.utils.aoa_to_sheet(weightsAoa);
  wsW["!cols"] = header.map((h, i) => {
    let minWidth = 14;
    if (i === 0) minWidth = 24; // City
    if (i === 1) minWidth = 14; // State
    const isSubMetric = colOutline[i] === 1;
    return {
      wch: Math.max(minWidth, Math.min(40, h.length + 2)),
      level: isSubMetric ? 1 : 0,
      hidden: isSubMetric, // collapsed by default
    };
  });
  // summaryRight:false → the `+` expand button sits on the LEFT of each
  // grouped block, i.e. directly to the right of the category's Master %
  // column where the user is already looking.
  (wsW as any)["!outline"] = { above: false, left: false, summaryBelow: false, summaryRight: false };
  XLSX.utils.book_append_sheet(wb, wsW, "Per-City Weights");

  // ── Sheet 4 (last): All Cities (Raw Metrics) — unfiltered universe ─
  if (args.fullDatabaseHeader && args.fullDatabaseRows) {
    const fullAoa: (string | number | null)[][] = [
      args.fullDatabaseHeader,
      ...args.fullDatabaseRows,
    ];
    const wsFull = XLSX.utils.aoa_to_sheet(fullAoa);
    wsFull["!cols"] = args.fullDatabaseHeader.map((h) => ({
      wch: Math.max(14, Math.min(40, String(h).length + 2)),
    }));
    XLSX.utils.book_append_sheet(wb, wsFull, "All Cities (Raw Metrics)");
  }

  return wb;
}

export function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename, { compression: true });
}
