/**
 * Phase 2 demo — export helpers for Brett's decisions.
 *
 * 1A: CSV (scores + verdicts + notes).
 * 1B: branded print-to-PDF window (uses the browser's native print dialog —
 *      no PDF engine wired up yet). Reads live candidate pillars + composite
 *      computed by the engine, not stored demo values.
 */

import type { MarketDecisionRow, MarketVerdict } from "@/hooks/useMarketDecisions";
import type { ShortlistRow } from "@/lib/mvs/shortlistSeed";
import type { LiveOverlay } from "@/components/phase2-demo/ShortlistTable";

const VERDICT_LABEL: Record<MarketVerdict, string> = {
  pursue: "Pursue",
  hold: "Hold",
  drop: "Drop",
  undecided: "Undecided",
};


function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportMarketDecisionsCsv(
  shortlist: ShortlistRow[],
  byCity: Map<string, MarketDecisionRow>,
  liveOverlays?: Map<string, LiveOverlay>,
) {
  const headers = [
    "city_id",
    "city",
    "state",
    "mvs_score",
    "pricing",
    // "absorption" removed in v1.1 — Market Absorption no longer in composite.
    "scaled_op",
    "diversity",
    "depth",
    "balance",
    "data_source",
    "verdict",
    "notes",
    "decided_at",
  ];
  const fmt = (n: number | null | undefined) =>
    n == null ? "" : Number.isInteger(n) ? `${n}` : (n as number).toFixed(1);
  // No-fake-numbers rule: when a city has no live overlay, every numeric
  // score cell is blank. The CSV row still appears so the verdict + notes
  // are exported, but the score columns honestly reflect "not yet scored".
  const rows = shortlist.map((c) => {
    const d = byCity.get(c.id);
    const ov = liveOverlays?.get(c.id);
    const dataSource = ov ? "live" : "not_scored";
    const balance = ov && ov.balance != null ? `Balance ${ov.balance.toFixed(0)}` : "";
    return [
      c.id,
      c.city,
      c.state,
      fmt(ov?.composite),
      fmt(ov?.pricing),
      // absorption column removed in v1.1.
      fmt(ov?.scaledOperator),
      fmt(ov?.diversity),
      fmt(ov?.depth),
      balance,
      dataSource,
      VERDICT_LABEL[d?.verdict ?? "undecided"],
      d?.notes ?? "",
      d?.decided_at ?? "",
    ].map(csvCell).join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `market-validation-decisions-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}



