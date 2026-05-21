// Three-sheet XLSX export for the ranked-markets spreadsheet view.
//
// Sheet 1 (default) "Backend Data": raw DB row per filtered city, as-is.
//   Identity columns (City/State/County/Metro) come from the mapped UI row
//   so they're always populated; remaining columns are dumped straight from
//   scoredRow.
// Sheet 2 "Weights Snapshot": global category + sub-metric weights at export time.
// Sheet 3 "Per-City Weights": one row per city; each category has a Master %
//   column (always visible) + collapsible sub-metric % columns.

import * as XLSX from "xlsx";
import type { CategoryKey } from "@/stores/cityScoringStore";
import { METRICS_BY_CATEGORY } from "@/lib/sowMetricRegistry";

export type CategoryDef = { key: CategoryKey; label: string };

export type WeightsCityRow = { city: string; state: string };

export type BuildXlsxArgs = {
  categories: CategoryDef[];
  backendHeader: string[];
  backendRows: (string | number | null)[][];
  weightsCities: WeightsCityRow[];
  appliedWeights: Record<CategoryKey, number>;
  appliedSubWeights: Record<CategoryKey, Record<string, number>>;
  exportedAt?: string;
};

export function buildRankedMarketsWorkbook(args: BuildXlsxArgs): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1 (default): Backend Data ────────────────────────────────
  const backendAoa: (string | number | null)[][] = [args.backendHeader, ...args.backendRows];
  const wsBackend = XLSX.utils.aoa_to_sheet(backendAoa);
  wsBackend["!cols"] = args.backendHeader.map((h) => ({
    wch: Math.max(12, Math.min(40, String(h).length + 2)),
  }));
  XLSX.utils.book_append_sheet(wb, wsBackend, "Backend Data");

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

  // ── Sheet 3: Per-City Weights (collapsible sub-metric columns) ─────
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
  wsW["!cols"] = header.map((h, i) => ({
    wch: Math.max(12, Math.min(40, h.length + 2)),
    level: colOutline[i] === 1 ? 1 : 0,
    hidden: colOutline[i] === 1,
  }));
  (wsW as any)["!outline"] = { above: false, left: false };
  XLSX.utils.book_append_sheet(wb, wsW, "Per-City Weights");

  return wb;
}

export function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename, { compression: true });
}
