import { useMemo, useState } from "react";
import { TeacherProspect } from "@/data/teacherData";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye, Loader2, MailPlus, MoreVertical, Send, Star, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SourceBadge } from "./SourceBadge";
import { statusBadgeFor } from "@/lib/teacherSourceLabels";

interface Props {
  prospects: TeacherProspect[];
  selected: number[];
  onToggleSelect: (id: number) => void;
  onToggleAll: () => void;
  onRowClick: (p: TeacherProspect) => void;
  onPromote: (p: TeacherProspect) => void;
  promotedIds?: Set<number>;
  promotingId?: number | null;
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (n: number) => void;
  onPageSizeChange?: (n: number) => void;
  loading?: boolean;
}

type SortKey = "name" | "school" | "city";

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function pageList(current: number, total: number): (number | "…")[] {
  if (total <= 1) return [1];
  const out: (number | "…")[] = [];
  const add = (n: number) => out[out.length - 1] !== n && out.push(n);
  add(1);
  if (current > 4) out.push("…");
  for (let i = Math.max(2, current - 2); i <= Math.min(total - 1, current + 2); i++) add(i);
  if (current < total - 3) out.push("…");
  if (total > 1) add(total);
  return out;
}

export function TeacherTable({
  prospects, selected, onToggleSelect, onToggleAll, onRowClick, onPromote,
  promotedIds, promotingId, page, pageSize, totalCount, onPageChange, onPageSizeChange, loading,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [gotoInput, setGotoInput] = useState("");

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  const sorted = useMemo(() => [...prospects].sort((a, b) => {
    const av = String(a[sortKey] ?? ""), bv = String(b[sortKey] ?? "");
    return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
  }), [prospects, sortKey, sortDir]);

  const allSelected = prospects.length > 0 && prospects.every(p => selected.includes(p.id));
  const safeTotal = totalCount ?? 0;
  const safePageSize = pageSize || 25;
  const safePage = page || 1;
  const totalPages = Math.max(1, Math.ceil(safeTotal / safePageSize));
  const fromIdx = safeTotal === 0 ? 0 : (safePage - 1) * safePageSize + 1;
  const toIdx = Math.min(safeTotal, (safePage - 1) * safePageSize + prospects.length);

  const headerCls = "sticky top-0 z-10 bg-[#f8fafc] h-8 px-3 text-left align-middle whitespace-nowrap text-[10.5px] font-bold uppercase tracking-wide text-[#66728a] border-b border-[#e7edf5]";
  const cellCls = "px-3 py-1.5 align-middle text-[12.5px] text-[#374151] border-b border-[#f1f5f9]";

  const handleGoto = () => {
    const n = parseInt(gotoInput, 10);
    if (!isNaN(n) && n >= 1 && n <= totalPages) { onPageChange(n); setGotoInput(""); }
  };

  return (
    <div className="relative rounded-xl border border-[#e7edf5] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.025)]">
      {/* Scroll container: horizontal scroll lives INSIDE the table pane */}
      <div className="max-h-[calc(100vh-340px)] min-h-[300px] overflow-auto rounded-t-xl">
        <table className="w-full min-w-[1100px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className={`${headerCls} sticky left-0 z-20 w-10 bg-[#f8fafc]`}>
                <Checkbox className="border-[#dbe4f2] data-[state=checked]:border-[#174be8] data-[state=checked]:bg-[#174be8]" checked={allSelected} onCheckedChange={onToggleAll} />
              </th>
              <th className={`${headerCls} sticky left-10 z-20 min-w-[200px] cursor-pointer bg-[#f8fafc]`} onClick={() => toggleSort("name")}>
                <span className="inline-flex items-center gap-1">Name <ArrowUpDown size={10} /></span>
              </th>
              <th className={`${headerCls} min-w-[160px]`}>Email</th>
              <th className={`${headerCls} min-w-[170px] cursor-pointer`} onClick={() => toggleSort("school")}>
                <span className="inline-flex items-center gap-1">School <ArrowUpDown size={10} /></span>
              </th>
              <th className={`${headerCls} min-w-[140px]`}>District</th>
              <th className={`${headerCls} min-w-[70px]`}>Grade</th>
              <th className={`${headerCls} min-w-[150px] cursor-pointer`} onClick={() => toggleSort("city")}>
                <span className="inline-flex items-center gap-1">City <ArrowUpDown size={10} /></span>
              </th>
              <th className={`${headerCls} min-w-[170px]`}>Source</th>
              <th className={`${headerCls} sticky right-0 z-20 w-16 bg-[#f8fafc] text-right`}>Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const isSelected = selected.includes(p.id);
              const isPromoted = promotedIds?.has(p.id);
              const badge = statusBadgeFor({
                enrichment_source: p.enrichmentSource ?? null,
                verification_status: p.verificationStatus ?? null,
                email: p.email,
              });
              return (
                <tr key={p.id} className="cursor-pointer transition-colors hover:bg-[#f7faff]" onClick={() => onRowClick(p)}>
                  <td className={`${cellCls} sticky left-0 z-10 bg-white hover:bg-[#f7faff]`} onClick={e => e.stopPropagation()}>
                    <Checkbox className="border-[#dbe4f2] data-[state=checked]:border-[#174be8] data-[state=checked]:bg-[#174be8]" checked={isSelected} onCheckedChange={() => onToggleSelect(p.id)} />
                  </td>
                  <td className={`${cellCls} sticky left-10 z-10 bg-white hover:bg-[#f7faff]`}>
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#dbe7ff] text-[9.5px] font-black text-[#174be8]">{initials(p.name)}</div>
                      <div className="truncate font-semibold text-[#07142f]" title={p.name}>{p.name}</div>
                    </div>
                  </td>
                  <td className={cellCls}>
                    {p.email ? (
                      <span className="block max-w-[230px] truncate text-[#374151]" title={p.email}>{p.email}</span>
                    ) : <span className="italic text-[#b0bbd0]">no email</span>}
                  </td>
                  <td className={cellCls}>
                    <span className="block max-w-[240px] truncate" title={p.school}>{p.school}</span>
                  </td>
                  <td className={cellCls}>
                    <span className="block max-w-[200px] truncate text-[#526078]" title={p.district ?? ""}>{p.district ?? "—"}</span>
                  </td>
                  <td className={cellCls}>
                    <span className="text-[#526078]">{p.gradeRaw ?? "—"}</span>
                  </td>
                  <td className={`${cellCls} whitespace-nowrap`}>{p.city}{p.state ? `, ${p.state}` : ""}</td>
                  <td className={cellCls}>
                    <div className="flex items-center gap-1.5">
                      <SourceBadge badge={badge} />
                      {isPromoted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#eef2f7] px-1.5 py-0.5 text-[10px] font-bold text-[#526078]">
                          <UserCheck size={10} /> Outreach
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={`${cellCls} sticky right-0 z-10 bg-white text-right hover:bg-[#f7faff]`} onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[#dbe4f2] bg-white text-[#526078] hover:bg-[#f4f7ff] hover:text-[#174be8]">
                          <MoreVertical size={12} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52 bg-white">
                        <DropdownMenuItem onClick={() => onRowClick(p)}><Eye className="mr-2 h-4 w-4" /> View profile</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.info(`Sample enrichment queued for ${p.name}.`)}><Send className="mr-2 h-4 w-4" /> Enrich contact</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.success(`${p.name} added to shortlist.`)}><Star className="mr-2 h-4 w-4" /> Add to shortlist</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled={isPromoted || promotingId === p.id} onClick={() => onPromote(p)}>
                          <MailPlus className="mr-2 h-4 w-4" /> {isPromoted ? "Already in outreach" : "Add to outreach"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.info(`${p.name} marked as not a fit.`)}><UserX className="mr-2 h-4 w-4" /> Mark not fit</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
            {prospects.length === 0 && !loading && (
              <tr><td colSpan={9} className="py-10 text-center text-[#8794ab]">No prospects match your filters.</td></tr>
            )}
          </tbody>
        </table>
        {loading && (
          <div className="pointer-events-none absolute inset-x-0 top-8 flex justify-center">
            <div className="flex items-center gap-2 rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-[#526078] shadow-sm ring-1 ring-[#e7edf5]">
              <Loader2 size={12} className="animate-spin" /> Loading…
            </div>
          </div>
        )}
      </div>

      {/* Pager */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf2f8] bg-[#fafbfd] px-4 py-2 text-xs text-[#66728a]">
        <div className="flex items-center gap-3">
          <span>
            Showing <span className="font-bold text-[#07142f]">{fromIdx.toLocaleString()}–{toIdx.toLocaleString()}</span> of <span className="font-bold text-[#07142f]">{safeTotal.toLocaleString()}</span>
          </span>
          {onPageSizeChange && (
            <label className="flex items-center gap-1.5">
              <span className="text-[#8794ab]">Rows</span>
              <select
                value={safePageSize}
                onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
                className="h-7 rounded-md border border-[#dbe4f2] bg-white px-1.5 text-xs font-bold text-[#07142f] focus:outline-none focus:ring-1 focus:ring-[#174be8]"
              >
                {[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <button onClick={() => onPageChange(1)} disabled={safePage <= 1} className="flex h-7 items-center rounded-md border border-[#dbe4f2] bg-white px-1.5 font-bold text-[#526078] disabled:opacity-40" title="First page"><ChevronsLeft size={12} /></button>
          <button onClick={() => onPageChange(Math.max(1, safePage - 1))} disabled={safePage <= 1} className="flex h-7 items-center rounded-md border border-[#dbe4f2] bg-white px-1.5 font-bold text-[#526078] disabled:opacity-40"><ChevronLeft size={12} /></button>
          {pageList(safePage, totalPages).map((pg, i) =>
            pg === "…" ? (
              <span key={`e${i}`} className="px-1 text-[#8794ab]">…</span>
            ) : (
              <button
                key={pg}
                onClick={() => onPageChange(pg as number)}
                className={`h-7 min-w-[28px] rounded-md border px-1.5 font-bold ${pg === safePage ? "border-[#174be8] bg-[#174be8] text-white" : "border-[#dbe4f2] bg-white text-[#526078] hover:bg-[#f4f7ff]"}`}
              >{pg}</button>
            ),
          )}
          <button onClick={() => onPageChange(Math.min(totalPages, safePage + 1))} disabled={safePage >= totalPages} className="flex h-7 items-center rounded-md border border-[#dbe4f2] bg-white px-1.5 font-bold text-[#526078] disabled:opacity-40"><ChevronRight size={12} /></button>
          <button onClick={() => onPageChange(totalPages)} disabled={safePage >= totalPages} className="flex h-7 items-center rounded-md border border-[#dbe4f2] bg-white px-1.5 font-bold text-[#526078] disabled:opacity-40" title="Last page"><ChevronsRight size={12} /></button>

          <div className="ml-2 flex items-center gap-1">
            <span className="text-[#8794ab]">Go to</span>
            <input
              value={gotoInput}
              onChange={(e) => setGotoInput(e.target.value.replace(/[^0-9]/g, ""))}
              onKeyDown={(e) => { if (e.key === "Enter") handleGoto(); }}
              placeholder={String(safePage)}
              className="h-7 w-14 rounded-md border border-[#dbe4f2] bg-white px-1.5 text-center text-xs font-bold text-[#07142f] focus:outline-none focus:ring-1 focus:ring-[#174be8]"
            />
            <button onClick={handleGoto} className="h-7 rounded-md border border-[#dbe4f2] bg-white px-2 text-xs font-bold text-[#526078] hover:bg-[#f4f7ff]">Go</button>
          </div>
        </div>
      </div>
    </div>
  );
}
