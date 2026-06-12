import { useMemo, useState } from "react";
import { Download, Pencil, ChevronUp, ChevronDown } from "lucide-react";

import type { ShortlistRow } from "@/data/phase2DemoData";
import { useMarketDecisions, type MarketVerdict } from "@/hooks/useMarketDecisions";
import { exportMarketDecisionsCsv } from "@/lib/decisionsExport";
import { SampleDataBadge } from "@/components/phase2-demo/SampleDataBadge";

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
}

type SortKey = "city" | "composite" | "pricing" | "absorption" | "scaledOperator" | "diversity" | "depth" | "verdict";

export function ShortlistTable({ rows, activeCityId, onSelectCity }: Props) {
  const { byCity, setVerdict, setNotes, isAuthed } = useMarketDecisions();
  const [sortKey, setSortKey] = useState<SortKey>("composite");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [verdictFilter, setVerdictFilter] = useState<MarketVerdict | "all">("all");
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState("");

  const sorted = useMemo(() => {
    const filtered = rows.filter((r) => {
      if (verdictFilter === "all") return true;
      const v = byCity.get(r.id)?.verdict ?? "undecided";
      return v === verdictFilter;
    });
    return [...filtered].sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      if (sortKey === "city") {
        av = a.city; bv = b.city;
      } else if (sortKey === "verdict") {
        av = byCity.get(a.id)?.verdict ?? "undecided";
        bv = byCity.get(b.id)?.verdict ?? "undecided";
      } else {
        av = a[sortKey] as number;
        bv = b[sortKey] as number;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, sortKey, sortDir, verdictFilter, byCity]);

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
          <SampleDataBadge label="Demo cities" />
          <button
            type="button"
            onClick={() => exportMarketDecisionsCsv(rows, byCity)}
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
              {headerCell("composite", "Premium Enrichment", "right", "Premium Enrichment Ecosystem Score (composite)")}
              {headerCell("pricing", "Pricing")}
              {headerCell("absorption", "Absorp.")}
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
                    <div className="flex items-center gap-1.5">
                      {isActive && <span className="block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: BLUE }} />}
                      <span>{r.city}, {r.state}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right font-black tabular-nums" style={{ color: NAVY }}>{r.composite}</td>
                  <td className="px-2 py-2 text-right tabular-nums" style={{ color: NAVY }}>{r.pricing}</td>
                  <td className="px-2 py-2 text-right tabular-nums" style={{ color: NAVY }}>{r.absorption}</td>
                  <td className="px-2 py-2 text-right tabular-nums" style={{ color: NAVY }}>{r.scaledOperator}</td>
                  <td className="px-2 py-2 text-right tabular-nums" style={{ color: NAVY }}>{r.diversity}</td>
                  <td className="px-2 py-2 text-right tabular-nums" style={{ color: NAVY }}>{r.depth}</td>
                  <td className="px-2 py-2">
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{ backgroundColor: SOFT, color: NAVY, border: `1px solid ${BORDER}` }}
                    >
                      {r.balanceBand}
                    </span>
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
