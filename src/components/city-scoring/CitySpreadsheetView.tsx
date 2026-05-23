import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, ChevronUp, ChevronsUpDown, Download, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RankedMarket } from "@/lib/cityScoringLiveData";
import { buildMarketView } from "@/lib/marketView";
import { COLUMNS, STICKY_LEFT, type SortDir } from "./cityColumns";

interface Props {
  markets: RankedMarket[];
  onOpenCity: (m: RankedMarket) => void;
  onExportCsv?: () => void;
}

export default function CitySpreadsheetView({ markets, onOpenCity, onExportCsv }: Props) {
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("All");
  // "all" is a sentinel that collapses pagination to a single page.
  // If the dataset grows past ~2k rows, revisit with react-window virtualization.
  const [pageSize, setPageSize] = useState<number | "all">(50);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string>("composite");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const states = useMemo(() => {
    const s = new Set<string>();
    markets.forEach((m) => m.state && s.add(m.state));
    return Array.from(s).sort();
  }, [markets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return markets.filter((m) => {
      if (stateFilter !== "All" && m.state !== stateFilter) return false;
      if (!q) return true;
      return (
        (m.city ?? "").toLowerCase().includes(q) ||
        (m.state ?? "").toLowerCase().includes(q)
      );
    });
  }, [markets, search, stateFilter]);

  // Pre-rank markets by composite (desc) so the # column is stable.
  const rankedAll = useMemo(() => {
    return [...markets]
      .sort((a, b) => buildMarketView(b).composite - buildMarketView(a).composite)
      .reduce<Map<number | string, number>>((acc, m, i) => {
        acc.set(m.id, i + 1);
        return acc;
      }, new Map());
  }, [markets]);

  const col = COLUMNS.find((c) => c.key === sortKey) ?? COLUMNS.find((c) => c.key === "composite")!;
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = col.get(a, rankedAll.get(a.id) ?? 0);
      const bv = col.get(b, rankedAll.get(b.id) ?? 0);
      const aNull = av == null || av === "";
      const bNull = bv == null || bv === "";
      if (aNull && bNull) return 0;
      if (aNull) return 1;
      if (bNull) return -1;
      let cmp = 0;
      if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, col, sortDir, rankedAll]);

  const total = sorted.length;
  const effectivePageSize = pageSize === "all" ? Math.max(total, 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(total / effectivePageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * effectivePageSize;
  const end = Math.min(start + effectivePageSize, total);
  const pageItems = sorted.slice(start, end);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "city" || key === "state" || key === "county" || key === "metro" ? "asc" : "desc");
    }
  };

  return (
    <div className="rounded-lg border border-[#eef2f7] bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eef2f7] px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative h-9 w-[240px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8794ab]" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search cities…"
              className="h-9 pl-8 pr-7 bg-white border-[#e5eaf2] text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8794ab] hover:text-[#07142f]"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <Select value={stateFilter} onValueChange={(v) => { setStateFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-[150px] bg-white border-[#e5eaf2] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All states</SelectItem>
              {states.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(v === "all" ? "all" : Number(v)); setPage(1); }}>
            <SelectTrigger className="h-9 w-[130px] bg-white border-[#e5eaf2] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25 / page</SelectItem>
              <SelectItem value="50">50 / page</SelectItem>
              <SelectItem value="100">100 / page</SelectItem>
              <SelectItem value="250">250 / page</SelectItem>
              <SelectItem value="500">500 / page</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#8794ab]">
            <span className="font-semibold text-[#07142f]">{total.toLocaleString()}</span> cities
          </span>
          {onExportCsv && (
            <Button
              size="sm"
              className="h-9 bg-[#174be8] hover:bg-[#1240c9] text-white gap-1.5 font-medium"
              onClick={onExportCsv}
            >
              <Download size={14} /> Export XLSX
            </Button>
          )}
        </div>
      </div>

      {/* Table — sticky columns: rank/state/city on the left, Actions on the right. */}
      <div className="overflow-x-auto">
        <table className="w-full text-[12px] min-w-[1600px] border-separate border-spacing-0">
          <thead className="bg-[#f8fafe] sticky top-0 z-20">
            <tr>
              {COLUMNS.map((c) => {
                const active = sortKey === c.key;
                const Icon = !active ? ChevronsUpDown : sortDir === "asc" ? ChevronUp : ChevronDown;
                const stickyStyle = STICKY_LEFT[c.key];
                const isLastFrozen = c.key === "city";
                return (
                  <th
                    key={c.key}
                    style={stickyStyle ? { left: stickyStyle.left, minWidth: stickyStyle.width, width: stickyStyle.width } : undefined}
                    className={[
                      "px-3 py-2 whitespace-nowrap border-b border-[#eef2f7] bg-[#f8fafe]",
                      c.align === "right" ? "text-right" : "text-left",
                      stickyStyle ? "sticky z-30" : "",
                      isLastFrozen ? "shadow-[inset_-8px_0_8px_-8px_rgba(15,23,42,0.08)]" : "",
                    ].join(" ")}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#526078] hover:text-[#07142f] ${
                        c.align === "right" ? "justify-end w-full" : ""
                      }`}
                      title={c.group ? `${c.group} • ${c.label}` : c.label}
                    >
                      <span>{c.label}</span>
                      <Icon size={11} className={active ? "text-[#174be8]" : "text-[#8794ab]"} />
                    </button>
                  </th>
                );
              })}
              <th
                className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-[#526078] whitespace-nowrap border-b border-[#eef2f7] bg-[#f8fafe] sticky right-0 z-30 shadow-[inset_8px_0_8px_-8px_rgba(15,23,42,0.08)]"
                style={{ minWidth: 80, width: 80 }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="px-3 py-10 text-center text-[12px] text-[#8794ab] border-b border-[#f3f5f9]">
                  No cities match your filters.
                </td>
              </tr>
            )}
            {pageItems.map((m) => {
              const r = rankedAll.get(m.id) ?? 0;
              return (
                <tr key={m.id} className="group hover:bg-[#fbfcff]">
                  {COLUMNS.map((c) => {
                    const stickyStyle = STICKY_LEFT[c.key];
                    const isLastFrozen = c.key === "city";
                    return (
                      <td
                        key={c.key}
                        style={stickyStyle ? { left: stickyStyle.left, minWidth: stickyStyle.width, width: stickyStyle.width } : undefined}
                        className={[
                          "px-3 py-2 whitespace-nowrap border-b border-[#f3f5f9]",
                          c.align === "right" ? "text-right tabular-nums" : "",
                          stickyStyle ? "sticky z-10 bg-white group-hover:bg-[#fbfcff]" : "",
                          isLastFrozen ? "shadow-[inset_-8px_0_8px_-8px_rgba(15,23,42,0.08)]" : "",
                        ].join(" ")}
                      >
                        {c.key === "city" ? (
                          <button
                            type="button"
                            onClick={() => onOpenCity(m)}
                            className="text-[#174be8] font-medium hover:underline text-left"
                          >
                            {m.city}
                          </button>
                        ) : (
                          c.render(m, r)
                        )}
                      </td>
                    );
                  })}
                  <td
                    className="px-3 py-2 text-right border-b border-[#f3f5f9] sticky right-0 z-10 bg-white group-hover:bg-[#fbfcff] shadow-[inset_8px_0_8px_-8px_rgba(15,23,42,0.08)]"
                    style={{ minWidth: 80, width: 80 }}
                  >
                    <button
                      type="button"
                      onClick={() => onOpenCity(m)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#174be8] hover:underline"
                    >
                      View <ArrowRight size={11} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#eef2f7] px-3 py-2 text-[11px] text-[#526078]">
        <span>
          {total === 0
            ? "Showing 0 of 0"
            : `Showing ${start + 1}–${end} of ${total.toLocaleString()} cities`}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]"
            disabled={safePage <= 1} onClick={() => setPage(1)}>First</Button>
          <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]"
            disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
          <span className="px-2 tabular-nums">{safePage} / {totalPages}</span>
          <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]"
            disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
          <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]"
            disabled={safePage >= totalPages} onClick={() => setPage(totalPages)}>Last</Button>
        </div>
      </div>
    </div>
  );
}
