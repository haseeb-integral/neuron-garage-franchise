import { useMemo, useState } from "react";
import { Download, Pencil, ChevronUp, ChevronDown } from "lucide-react";

import type { ShortlistRow } from "@/lib/mvs/shortlistSeed";
import { useMarketDecisions, type MarketVerdict } from "@/hooks/useMarketDecisions";
import { exportMarketDecisionsCsv } from "@/lib/decisionsExport";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type LiveOverlay = {
  composite: number | null;
  pricing: number | null;
  scaledOperator: number | null;
  diversity: number | null;
  depth: number | null;
  balance: number | null;
  lowConfidence: boolean;
  /** Enrichment Diversity thin-market flag: premium provider count < 4. Display only. */
  enrichmentThinMarket?: boolean;
};

const NAVY = "#07142f";
const MUTED = "#526078";
const BORDER = "#eef2f7";
const SOFT = "#f7faff";
const BLUE = "#174be8";

const VERDICT_OPTIONS: { v: MarketVerdict; label: string; bg: string; fg: string }[] = [
  { v: "undecided", label: "— Undecided —", bg: "#fff", fg: MUTED },
  { v: "pursue", label: "Pursue", bg: "#e3f3e7", fg: "#1d6b32" },
  { v: "hold", label: "Hold", bg: "#fff1d6", fg: "#925100" },
  { v: "drop", label: "Drop", bg: "#fce7ec", fg: "#a3142b" },
];

interface Props {
  rows: ShortlistRow[];
  activeCityId: string;
  onSelectCity: (cityId: string) => void;
  /**
   * Map of cityId -> live overlay from the pipeline. Cities without an entry
   * are rendered as "Not yet scored" — there is no fake fallback number.
   */
  liveOverlays?: Map<string, LiveOverlay>;
}

type SortKey = "city" | "composite" | "pricing" | "scaledOperator" | "diversity" | "depth" | "verdict";

export function ShortlistTable({ rows, activeCityId, onSelectCity, liveOverlays }: Props) {
  const { byCity, setVerdict, setNotes, isAuthed } = useMarketDecisions();
  const [sortKey, setSortKey] = useState<SortKey>("composite");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [verdictFilter, setVerdictFilter] = useState<MarketVerdict | "all">("all");
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState("");

  // Pick the live-overlay value for sorting. Un-scored cities sort to the
  // bottom regardless of direction by treating their value as -Infinity in
  // desc and +Infinity in asc (so they never beat real scored rows).
  const valFor = (r: ShortlistRow, k: SortKey): number | string => {
    if (k === "city") return r.city;
    if (k === "verdict") return byCity.get(r.id)?.verdict ?? "undecided";
    const overlay = liveOverlays?.get(r.id);
    const live =
      overlay &&
      (k === "composite" ? overlay.composite :
       k === "pricing" ? overlay.pricing :
       k === "scaledOperator" ? overlay.scaledOperator :
       k === "diversity" ? overlay.diversity :
       k === "depth" ? overlay.depth : null);
    if (live != null) return live;
    return sortDir === "desc" ? -Infinity : Infinity;
  };

  const sorted = useMemo(() => {
    const filtered = rows.filter((r) => {
      if (verdictFilter === "all") return true;
      const v = byCity.get(r.id)?.verdict ?? "undecided";
      return v === verdictFilter;
    });
    return [...filtered].sort((a, b) => {
      const av = valFor(a, sortKey);
      const bv = valFor(b, sortKey);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sortKey, sortDir, verdictFilter, byCity, liveOverlays]);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "city" ? "asc" : "desc"); }
  };

  const headerCell = (k: SortKey, label: string, align: "left" | "right" = "right", title?: string) => (
    <th
      onClick={() => toggleSort(k)}
      title={title}
      className={`cursor-pointer whitespace-nowrap px-2 py-2 text-[10px] font-semibold uppercase tracking-wide ${
        align === "left" ? "text-left" : "text-right"
      }`}
      style={{ color: MUTED }}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === k && (sortDir === "asc" ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
      </span>
    </th>
  );

  const decisionCounts = useMemo(() => {
    const c = { pursue: 0, hold: 0, drop: 0, undecided: 0 };
    rows.forEach((r) => {
      const v = byCity.get(r.id)?.verdict ?? "undecided";
      c[v]++;
    });
    return c;
  }, [rows, byCity]);

  const fmt = (n: number | null | undefined) =>
    n == null ? "—" : Number.isInteger(n) ? `${n}` : n.toFixed(1);

  return (
    <section className="mb-5 rounded-lg border bg-white" style={{ borderColor: BORDER }}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: BORDER }}>
        <div className="min-w-0">
          <h2 className="text-[14px] font-bold" style={{ color: NAVY }}>
            Shortlist · {rows.length} cities
          </h2>
          <p className="mt-0.5 text-[11px]" style={{ color: MUTED }}>
            Click a row to see the full deep-dive below. Set a verdict per city — decisions persist to your account.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportMarketDecisionsCsv(rows, byCity, liveOverlays)}
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold"
            style={{ borderColor: BLUE, color: BLUE, backgroundColor: "#fff" }}
          >
            <Download size={12} />
            Export decisions (CSV)
          </button>
        </div>
      </div>

      {/* Filter + decision summary */}
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2 text-[11px]" style={{ borderColor: BORDER, backgroundColor: SOFT }}>
        <span className="font-semibold" style={{ color: NAVY }}>Filter:</span>
        {(["all", "pursue", "hold", "drop", "undecided"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setVerdictFilter(f)}
            className="rounded-full px-2 py-0.5 capitalize"
            style={{
              backgroundColor: verdictFilter === f ? BLUE : "#fff",
              color: verdictFilter === f ? "#fff" : NAVY,
              border: `1px solid ${verdictFilter === f ? BLUE : BORDER}`,
              fontWeight: 600,
            }}
          >
            {f === "all" ? "All" : f}
            {f !== "all" && (
              <span className="ml-1 opacity-80">({decisionCounts[f]})</span>
            )}
          </button>
        ))}
        {!isAuthed && (
          <span className="ml-auto rounded-md px-2 py-0.5" style={{ backgroundColor: "#fff1d6", color: "#925100" }}>
            Sign in to persist decisions
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead style={{ backgroundColor: "#fff" }}>
            <tr className="border-b" style={{ borderColor: BORDER }}>
              {headerCell("city", "City", "left")}
              {headerCell("composite", "MVS", "right", "Market Validation Score (composite)")}
              {headerCell("pricing", "Pricing")}
              {headerCell("scaledOperator", "Scaled Op")}
              {headerCell("diversity", "Diversity")}
              {headerCell("depth", "Depth")}
              <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
                Balance
              </th>
              {headerCell("verdict", "Verdict", "left")}
              <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
                Notes
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const d = byCity.get(r.id);
              const isActive = r.id === activeCityId;
              const v = d?.verdict ?? "undecided";
              const opt = VERDICT_OPTIONS.find((o) => o.v === v)!;
              const overlay = liveOverlays?.get(r.id);
              const isLive = !!overlay;
              return (
                <tr
                  key={r.id}
                  className="cursor-pointer border-b transition"
                  style={{
                    borderColor: BORDER,
                    backgroundColor: isActive ? "#eef6ff" : "transparent",
                  }}
                  onClick={() => onSelectCity(r.id)}
                >
                  <td className="px-2 py-2 font-semibold" style={{ color: NAVY }}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isActive && <span className="block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: BLUE }} />}
                      <span>{r.city}, {r.state}</span>
                      {isLive ? (
                        <span
                          className="inline-flex items-center whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                          style={{ backgroundColor: "#e3f3e7", color: "#1d6b32" }}
                          title="Live pipeline data via computeMvs helper"
                        >
                          Live
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                          style={{ backgroundColor: "#eef2f7", color: MUTED }}
                          title="This city has not been run through the scoring pipeline yet. Open the scoring console to run it."
                        >
                          Not yet scored
                        </span>
                      )}
                      {isLive && overlay?.lowConfidence && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className="inline-flex items-center whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide cursor-help"
                              style={{ backgroundColor: "#fce7ec", color: "#a3142b" }}
                            >
                              ⚑ Limited Source Coverage
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-[12px] leading-relaxed">
                            More than 20% of premium providers in this city had missing or broken registration pages we could not read. The Market Validation Score still computed, but treat it with caution until those sources are fixed in the QA Queue.
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right font-black tabular-nums" style={{ color: isLive ? NAVY : MUTED }}>{fmt(overlay?.composite)}</td>
                  <td className="px-2 py-2 text-right tabular-nums" style={{ color: isLive ? NAVY : MUTED }}>{fmt(overlay?.pricing)}</td>
                  <td className="px-2 py-2 text-right tabular-nums" style={{ color: isLive ? NAVY : MUTED }}>{fmt(overlay?.scaledOperator)}</td>
                  <td className="px-2 py-2 text-right tabular-nums" style={{ color: isLive ? NAVY : MUTED }}>
                    <span className="inline-flex items-center gap-1 justify-end">
                      {fmt(overlay?.diversity)}
                      {overlay?.enrichmentThinMarket && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold cursor-help"
                              style={{ backgroundColor: "#fff3d6", color: "#8a5a00" }}
                            >
                              Thin
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-[12px] leading-relaxed">
                            Thin market — low confidence. Fewer than 4 premium providers found in this city, so the enrichment breadth signal is weak.
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums" style={{ color: isLive ? NAVY : MUTED }}>{fmt(overlay?.depth)}</td>
                  <td className="px-2 py-2">
                    {isLive && overlay?.balance != null ? (
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{ backgroundColor: SOFT, color: NAVY, border: `1px solid ${BORDER}` }}
                      >
                        Balance {overlay.balance.toFixed(0)}
                      </span>
                    ) : (
                      <span style={{ color: MUTED }}>—</span>
                    )}
                  </td>

                  <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={v}
                      onChange={(e) => setVerdict(r.id, `${r.city}, ${r.state}`, e.target.value as MarketVerdict)}
                      disabled={!isAuthed}
                      className="rounded-md border px-1.5 py-1 text-[11px] font-semibold disabled:opacity-50"
                      style={{
                        borderColor: opt.fg === MUTED ? BORDER : opt.fg,
                        backgroundColor: opt.bg,
                        color: opt.fg,
                      }}
                    >
                      {VERDICT_OPTIONS.map((o) => (
                        <option key={o.v} value={o.v}>{o.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                    {editingNotes === r.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          autoFocus
                          value={draftNotes}
                          onChange={(e) => setDraftNotes(e.target.value)}
                          onBlur={() => {
                            setNotes(r.id, `${r.city}, ${r.state}`, draftNotes);
                            setEditingNotes(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              setNotes(r.id, `${r.city}, ${r.state}`, draftNotes);
                              setEditingNotes(null);
                            }
                            if (e.key === "Escape") setEditingNotes(null);
                          }}
                          className="w-44 rounded-md border px-1.5 py-1 text-[11px]"
                          style={{ borderColor: BLUE, color: NAVY }}
                          placeholder="Reasoning…"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setDraftNotes(d?.notes ?? "");
                          setEditingNotes(r.id);
                        }}
                        disabled={!isAuthed}
                        className="inline-flex max-w-[180px] items-center gap-1 truncate text-left text-[11px] disabled:opacity-50"
                        style={{ color: d?.notes ? NAVY : MUTED }}
                        title={d?.notes || "Add note"}
                      >
                        <Pencil size={10} />
                        <span className="truncate">{d?.notes || "Add note"}</span>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-[12px]" style={{ color: MUTED }}>
                  No cities match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
