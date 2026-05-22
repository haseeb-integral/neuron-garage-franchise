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

type ColDef = {
  key: string;
  label: string;
  align: "left" | "right";
  group?: string;
  // Extract sort value (number | string | null)
  get: (m: RankedMarket, rank: number) => number | string | null;
  // Render display
  render: (m: RankedMarket, rank: number) => React.ReactNode;
  className?: string;
};

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

const fmtNum2 = (v: any) =>
  v == null || v === "" || Number.isNaN(Number(v))
    ? "—"
    : Number(v).toFixed(2);

const tierBg: Record<string, string> = {
  A: "bg-[#dcfce7] text-[#0a7c3a]",
  B: "bg-[#dbeafe] text-[#174be8]",
  C: "bg-[#fef3c7] text-[#a16207]",
  D: "bg-[#fee2e2] text-[#b91c1c]",
};

function row(m: RankedMarket): any {
  return (m as any).scoredRow ?? {};
}
function cat(m: RankedMarket, k: string): number | null {
  const v = (m.categoryScores as any)?.[k];
  return v == null ? null : Number(v);
}

// Frozen-column geometry. Left edge is built up left-to-right so each frozen
// column sticks just past the previous one. Widths are fixed so the layout
// is deterministic regardless of cell content.
const STICKY_LEFT: Record<string, { left: number; width: number }> = {
  rank: { left: 0, width: 56 },
  state: { left: 56, width: 112 },
  city: { left: 168, width: 160 },
};

const COLUMNS: ColDef[] = [
  {
    key: "rank", label: "#", align: "right",
    get: (_m, r) => r,
    render: (_m, r) => <span className="text-[#8794ab]">{r}</span>,
  },
  {
    key: "state", label: "State", align: "left",
    get: (m) => m.state ?? "",
    render: (m) => (
      <span className="inline-block rounded bg-[#eef2f7] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#526078]">
        {m.state || "—"}
      </span>
    ),
  },
  {
    key: "city", label: "City", align: "left",
    get: (m) => m.city ?? "",
    render: () => null, // rendered specially (link)
  },
  {
    key: "county", label: "County", align: "left",
    get: (m) => (m as any).county ?? "",
    render: (m) => <span className="text-[#526078]">{(m as any).county ?? "—"}</span>,
  },
  {
    key: "metro", label: "Metro Area", align: "left",
    get: (m) => (m as any).metroArea ?? "",
    render: (m) => <span className="text-[#526078]">{(m as any).metroArea ?? "—"}</span>,
  },
  {
    key: "marketType", label: "Type", align: "left",
    get: (m) => (m as any).marketType ?? "",
    render: (m) => (
      <span className="inline-block rounded-full bg-[#eaf0ff] text-[#174be8] text-[10px] font-medium px-1.5 py-0.5">
        {(m as any).marketType ?? "—"}
      </span>
    ),
  },
  {
    key: "tier", label: "Tier", align: "left",
    get: (m) => m.tier ?? "",
    render: (m) => (
      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${tierBg[m.tier as string] ?? "bg-[#eef2f7] text-[#526078]"}`}>
        {m.tier || "—"}
      </span>
    ),
  },
  {
    key: "composite", label: "Composite", align: "right", group: "Scores",
    get: (m) => m.compositeScore ?? null,
    render: (m) => <span className="font-semibold text-[#07142f]">{fmtNum1(m.compositeScore)}</span>,
  },
  {
    key: "score_demand", label: "Demand", align: "right", group: "Scores",
    get: (m) => cat(m, "demand"),
    render: (m) => fmtNum1(cat(m, "demand")),
  },
  {
    key: "score_tam", label: "TAM Teachers", align: "right", group: "Scores",
    get: (m) => cat(m, "franchiseeSupply"),
    render: (m) => fmtNum1(cat(m, "franchiseeSupply")),
  },
  {
    key: "score_csi_opp", label: "Comp. Opportunity", align: "right", group: "Scores",
    get: (m) => cat(m, "competitiveLandscape"),
    render: (m) => fmtNum1(cat(m, "competitiveLandscape")),
  },
  // Demand inputs
  {
    key: "population", label: "Population", align: "right", group: "Demand",
    get: (m) => m.population ?? row(m).population ?? null,
    render: (m) => fmtInt(m.population ?? row(m).population),
  },
  {
    key: "children_5_12", label: "Children 5–12", align: "right", group: "Demand",
    get: (m) => row(m).children_5_12 ?? null,
    render: (m) => fmtInt(row(m).children_5_12),
  },
  {
    key: "median_income", label: "Median HH Income", align: "right", group: "Demand",
    get: (m) => row(m).median_household_income ?? null,
    render: (m) => <span className="text-[#0ea66e] font-medium">{fmtMoney(row(m).median_household_income)}</span>,
  },
  {
    key: "dual_income_pct", label: "Dual-Income %", align: "right", group: "Demand",
    get: (m) => row(m).dual_working_families_pct ?? null,
    render: (m) => fmtPct(row(m).dual_working_families_pct),
  },
  {
    key: "college_pct", label: "College %", align: "right", group: "Demand",
    get: (m) => row(m).college_degree_pct ?? null,
    render: (m) => fmtPct(row(m).college_degree_pct),
  },
  // TAM Teachers
  // school_district_count removed 2026-05-22 — not in any live category
  // (Demand / CSI / TAM Teachers). DB column preserved.
  {
    key: "elem_schools", label: "Public Elem. Schools", align: "right", group: "TAM Teachers",
    get: (m) => row(m).public_elementary_count ?? null,
    render: (m) => fmtInt(row(m).public_elementary_count),
  },
  {
    key: "priv_charter", label: "Private+Charter Elem.", align: "right", group: "TAM Teachers",
    get: (m) => {
      const r = row(m);
      const v = (r.private_elementary_count ?? 0) + (r.charter_elementary_count ?? 0);
      return v || null;
    },
    render: (m) => {
      const r = row(m);
      const v = (r.private_elementary_count ?? 0) + (r.charter_elementary_count ?? 0);
      return fmtInt(v || null);
    },
  },
  {
    key: "elem_teachers", label: "Elem. Teachers (FTE)", align: "right", group: "TAM Teachers",
    get: (m) => row(m).public_elementary_teacher_count ?? null,
    render: (m) => fmtInt(row(m).public_elementary_teacher_count),
  },
  {
    key: "elem_enrollment", label: "Elem. Enrollment", align: "right", group: "TAM Teachers",
    get: (m) => row(m).public_elementary_enrollment ?? null,
    render: (m) => fmtInt(row(m).public_elementary_enrollment),
  },
  {
    key: "col_index", label: "COL Index", align: "right", group: "TAM Teachers",
    get: (m) => row(m).cost_of_living_index ?? null,
    render: (m) => fmtNum1(row(m).cost_of_living_index),
  },
  // Competitive Landscape
  {
    key: "competitors", label: "Camps (count)", align: "right", group: "Competitive Landscape",
    get: (m) => m.competitorCount ?? row(m).summer_camp_count ?? null,
    render: (m) => fmtInt(m.competitorCount ?? row(m).summer_camp_count),
  },
  {
    key: "csi_brand", label: "Nat'l Brand Supply (wtd)", align: "right", group: "Competitive Landscape",
    get: (m) => row(m).csi_national_brand_count_weighted ?? null,
    render: (m) => fmtNum2(row(m).csi_national_brand_count_weighted),
  },
  {
    key: "csi_local", label: "Local Provider Est.", align: "right", group: "Competitive Landscape",
    get: (m) => row(m).csi_local_provider_estimate ?? null,
    render: (m) => fmtNum2(row(m).csi_local_provider_estimate),
  },
  {
    key: "csi_dam", label: "Demand-Adj. Market", align: "right", group: "Competitive Landscape",
    get: (m) => row(m).csi_demand_adjusted_market ?? null,
    render: (m) => fmtInt(row(m).csi_demand_adjusted_market),
  },
  {
    key: "csi_raw", label: "CSI (raw)", align: "right", group: "Competitive Landscape",
    get: (m) => row(m).csi_score ?? null,
    render: (m) => {
      const v = row(m).csi_score;
      return v == null ? "—" : Number(v).toFixed(5);
    },
  },
  {
    key: "csi_sat", label: "Saturation", align: "left", group: "Competitive Landscape",
    get: (m) => row(m).csi_saturation_category ?? "",
    render: (m) => <span className="text-[#526078]">{row(m).csi_saturation_category ?? "—"}</span>,
  },
];

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

  // Pre-rank markets by composite (desc) so the # column is stable
  const rankedAll = useMemo(() => {
    return [...markets]
      .sort((a, b) => (b.compositeScore ?? 0) - (a.compositeScore ?? 0))
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

      {/* Table */}
      {/* Sticky columns: rank (#), state, city on the left; Actions on the right.
          Each frozen cell sets its own background so scrolled content doesn't
          bleed through. A subtle inset shadow on the edge frozen cells signals
          "more content to scroll" — same pattern Airtable / Linear use. */}
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
