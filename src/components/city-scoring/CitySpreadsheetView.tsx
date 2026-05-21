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

type SortKey =
  | "state"
  | "city"
  | "population"
  | "districts"
  | "elem_schools"
  | "median_income"
  | "college_pct"
  | "elem_enrollment"
  | "col_index"
  | "metro_income"
  | "composite";

type SortDir = "asc" | "desc";

interface Props {
  markets: RankedMarket[];
  onOpenCity: (m: RankedMarket) => void;
  onExportCsv?: () => void;
}

const fmtInt = (v: any) =>
  v == null || v === "" || Number.isNaN(Number(v))
    ? "—"
    : Number(v).toLocaleString();

const fmtMoney = (v: any) =>
  v == null || v === "" || Number.isNaN(Number(v))
    ? "—"
    : `$${Number(v).toLocaleString()}`;

const fmtPct = (v: any) =>
  v == null || v === "" || Number.isNaN(Number(v))
    ? "—"
    : `${Number(v).toFixed(1)}%`;

const fmtNum1 = (v: any) =>
  v == null || v === "" || Number.isNaN(Number(v))
    ? "—"
    : Number(v).toFixed(1);

function getValue(m: RankedMarket, key: SortKey): number | string | null {
  const row: any = (m as any).scoredRow ?? {};
  switch (key) {
    case "state":
      return m.state ?? "";
    case "city":
      return m.city ?? "";
    case "population":
      return m.population ?? row.population ?? null;
    case "districts":
      return row.school_district_count ?? null;
    case "elem_schools":
      return row.public_elementary_count ?? null;
    case "median_income":
      return row.median_household_income ?? null;
    case "college_pct":
      return row.college_degree_pct ?? null;
    case "elem_enrollment":
      return row.public_elementary_enrollment ?? null;
    case "col_index":
      return row.cost_of_living_index ?? null;
    case "metro_income":
      return row.median_household_income ?? null;
    case "composite":
      return m.compositeScore ?? null;
  }
}

export default function CitySpreadsheetView({ markets, onOpenCity, onExportCsv }: Props) {
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("All");
  const [pageSize, setPageSize] = useState<number>(50);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("composite");
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

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = getValue(a, sortKey);
      const bv = getValue(b, sortKey);
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
  }, [filtered, sortKey, sortDir]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const pageItems = sorted.slice(start, end);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "city" || key === "state" ? "asc" : "desc");
    }
  };

  const Sortable = ({ k, label, align = "left" }: { k: SortKey; label: string; align?: "left" | "right" }) => {
    const active = sortKey === k;
    const Icon = !active ? ChevronsUpDown : sortDir === "asc" ? ChevronUp : ChevronDown;
    return (
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#526078] hover:text-[#07142f] ${
          align === "right" ? "justify-end w-full" : ""
        }`}
      >
        <span>{label}</span>
        <Icon size={11} className={active ? "text-[#174be8]" : "text-[#8794ab]"} />
      </button>
    );
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
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
            <SelectTrigger className="h-9 w-[110px] bg-white border-[#e5eaf2] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25 / page</SelectItem>
              <SelectItem value="50">50 / page</SelectItem>
              <SelectItem value="100">100 / page</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#8794ab]">
            <span className="font-semibold text-[#07142f]">{total.toLocaleString()}</span> cities
          </span>
          {onExportCsv && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 border-[#dbe4f2] text-[#174be8] gap-1.5"
              onClick={onExportCsv}
            >
              <Download size={14} /> Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead className="bg-[#f8fafe] sticky top-0">
            <tr className="border-b border-[#eef2f7]">
              <th className="px-3 py-2 text-left"><Sortable k="state" label="State" /></th>
              <th className="px-3 py-2 text-left"><Sortable k="city" label="City" /></th>
              <th className="px-3 py-2 text-right"><Sortable k="population" label="Population" align="right" /></th>
              <th className="px-3 py-2 text-right"><Sortable k="districts" label="Districts" align="right" /></th>
              <th className="px-3 py-2 text-right"><Sortable k="elem_schools" label="Elem. Schools" align="right" /></th>
              <th className="px-3 py-2 text-right"><Sortable k="median_income" label="Median HH Income" align="right" /></th>
              <th className="px-3 py-2 text-right"><Sortable k="college_pct" label="College %" align="right" /></th>
              <th className="px-3 py-2 text-right"><Sortable k="elem_enrollment" label="Elem. Enrollment" align="right" /></th>
              <th className="px-3 py-2 text-right"><Sortable k="col_index" label="COL Index" align="right" /></th>
              <th className="px-3 py-2 text-right"><Sortable k="metro_income" label="Metro Income" align="right" /></th>
              <th className="px-3 py-2 text-right"><Sortable k="composite" label="Composite" align="right" /></th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-[#526078]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={12} className="px-3 py-10 text-center text-[12px] text-[#8794ab]">
                  No cities match your filters.
                </td>
              </tr>
            )}
            {pageItems.map((m) => {
              const row: any = (m as any).scoredRow ?? {};
              return (
                <tr
                  key={m.id}
                  className="border-b border-[#f3f5f9] last:border-0 hover:bg-[#fbfcff]"
                >
                  <td className="px-3 py-2">
                    <span className="inline-block rounded bg-[#eef2f7] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#526078]">
                      {m.state || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => onOpenCity(m)}
                      className="text-[#174be8] font-medium hover:underline text-left"
                    >
                      {m.city}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtInt(m.population ?? row.population)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtInt(row.school_district_count)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtInt(row.public_elementary_count)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-[#0ea66e] font-medium">
                    {fmtMoney(row.median_household_income)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtPct(row.college_degree_pct)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtInt(row.public_elementary_enrollment)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtNum1(row.cost_of_living_index)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(row.median_household_income)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-[#07142f]">
                    {fmtNum1(m.compositeScore)}
                  </td>
                  <td className="px-3 py-2 text-right">
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
