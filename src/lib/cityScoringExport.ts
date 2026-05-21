// Two-sheet XLSX export for the ranked-markets spreadsheet view.
//
// Sheet 1 ("Snapshot"): true snapshot of the spreadsheet view at export time.
//   Mirrors the rows the CSV export already produces.
//
// Sheet 2 ("Category Weights"): per-city weights with collapsible column
//   groups. For each category we emit a Master% column (always visible) plus
//   one column per enabled sub-metric showing its normalized share (sub_i /
//   Σ enabled sub-weights × 100). Sub-metric columns are placed in an outline
//   group so Excel can collapse them down to just the Master% summary.

import * as XLSX from "xlsx";
import type { CategoryKey } from "@/stores/cityScoringStore";
import { METRICS_BY_CATEGORY } from "@/lib/sowMetricRegistry";

export type CategoryDef = {
  key: CategoryKey;
  label: string;
};

export type SnapshotRow = (string | number | null)[];

export type WeightsCityRow = {
  city: string;
  state: string;
};

export type BuildXlsxArgs = {
  categories: CategoryDef[];
  snapshotHeader: string[];
  snapshotRows: SnapshotRow[];
  weightsCities: WeightsCityRow[];
  appliedWeights: Record<CategoryKey, number>;
  appliedSubWeights: Record<CategoryKey, Record<string, number>>;
};

export function buildRankedMarketsWorkbook(args: BuildXlsxArgs): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Snapshot ──────────────────────────────────────────────
  const snapAoa: (string | number | null)[][] = [args.snapshotHeader, ...args.snapshotRows];
  const wsSnap = XLSX.utils.aoa_to_sheet(snapAoa);
  XLSX.utils.book_append_sheet(wb, wsSnap, "Snapshot");

  // ── Sheet 2: Category Weights (per-city, collapsible) ──────────────
  const masterTotal =
    args.categories.reduce((s, c) => s + (args.appliedWeights[c.key] ?? 0), 0) || 1;

  // Build the header + remember which columns are sub-metric (collapsible)
  // versus identity / master columns (always visible).
  const header: string[] = ["City", "State"];
  const colOutline: number[] = [0, 0]; // 0 = visible, 1 = grouped/collapsible

  type CatBlock = {
    cat: CategoryDef;
    masterCol: number;
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
    const masterCol = header.length - 1;

    const metrics = enabledMetrics.map((m) => {
      header.push(`${cat.label} → ${m.label} %`);
      colOutline.push(1);
      return {
        key: m.key,
        label: m.label,
        subShare: ((subWeights[m.key] ?? 0) / subTotal) * 100,
      };
    });

    blocks.push({ cat, masterCol, metrics: metrics });
    // Implicit: masterPct used per row below.
    void masterPct;
  }

  const weightsAoa: (string | number)[][] = [header];
  for (const c of args.weightsCities) {
    const row: (string | number)[] = [c.city, c.state];
    for (const b of blocks) {
      const masterPct = ((args.appliedWeights[b.cat.key] ?? 0) / masterTotal) * 100;
      row.push(Number(masterPct.toFixed(2)));
      for (const m of b.metrics) {
        row.push(Number(m.subShare.toFixed(2)));
      }
    }
    weightsAoa.push(row);
  }

  const wsW = XLSX.utils.aoa_to_sheet(weightsAoa);

  // Column widths + outline grouping for collapse.
  wsW["!cols"] = header.map((h, i) => ({
    wch: Math.max(12, Math.min(40, h.length + 2)),
    level: colOutline[i] === 1 ? 1 : 0,
    // Start collapsed so the sheet opens summarised to Master % per category.
    hidden: colOutline[i] === 1,
  }));
  // Enable summary-right behaviour so collapse buttons sit at the right edge
  // of each group (Excel default for column outlines).
  (wsW as any)["!outline"] = { above: false, left: false };

  XLSX.utils.book_append_sheet(wb, wsW, "Category Weights");

  return wb;
}

export function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename, { compression: true });
}
