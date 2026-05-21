// Two-sheet XLSX export for the ranked-markets spreadsheet view.
//
// Sheet 1 (default) "Backend Data": raw DB row per filtered city, exactly as
//   stored — no recompute, no rounding, no user weighting applied.
//
// Sheet 2 "Weights Snapshot": compact snapshot of the user's current applied
//   categories + sub-metrics at export time. Weights are global, so this is a
//   single table (not per-city).

import * as XLSX from "xlsx";
import type { CategoryKey } from "@/stores/cityScoringStore";
import { METRICS_BY_CATEGORY } from "@/lib/sowMetricRegistry";

export type CategoryDef = { key: CategoryKey; label: string };

export type BuildXlsxArgs = {
  categories: CategoryDef[];
  backendHeader: string[];
  backendRows: (string | number | null)[][];
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

  // ── Sheet 2: Weights Snapshot ──────────────────────────────────────
  const masterTotal =
    args.categories.reduce((s, c) => s + (args.appliedWeights[c.key] ?? 0), 0) || 1;

  const aoa: (string | number | null)[][] = [];
  aoa.push([`Weights snapshot — exported ${args.exportedAt ?? new Date().toISOString()}`]);
  aoa.push([]);

  // Category master weights
  aoa.push(["Category", "Master Weight (raw)", "Master Weight % (normalized)"]);
  for (const cat of args.categories) {
    const raw = args.appliedWeights[cat.key] ?? 0;
    const pct = (raw / masterTotal) * 100;
    aoa.push([cat.label, raw, Number(pct.toFixed(2))]);
  }
  aoa.push([]);

  // Sub-metrics per category (enabled only)
  aoa.push(["Category", "Metric", "Sub-weight (raw)", "Normalized Share %"]);
  for (const cat of args.categories) {
    const subWeights = args.appliedSubWeights[cat.key] ?? {};
    const enabled = (METRICS_BY_CATEGORY[cat.key] ?? []).filter(
      (m) => (subWeights[m.key] ?? 0) > 0,
    );
    const subTotal = enabled.reduce((s, m) => s + (subWeights[m.key] ?? 0), 0) || 1;
    for (const m of enabled) {
      const w = subWeights[m.key] ?? 0;
      aoa.push([cat.label, m.label, w, Number(((w / subTotal) * 100).toFixed(2))]);
    }
    if (enabled.length === 0) {
      aoa.push([cat.label, "(no enabled metrics)", 0, 0]);
    }
  }

  const wsW = XLSX.utils.aoa_to_sheet(aoa);
  wsW["!cols"] = [{ wch: 28 }, { wch: 32 }, { wch: 20 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsW, "Weights Snapshot");

  return wb;
}

export function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename, { compression: true });
}
