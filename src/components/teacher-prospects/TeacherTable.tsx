import { useMemo, useState } from "react";
import { TeacherProspect } from "@/data/teacherData";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ExternalLink, Eye, Link2, Loader2, MailPlus, MoreVertical, Sparkles, Star, UserCheck, UserX } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SourceBadge } from "./SourceBadge";
import { statusBadgeFor } from "@/lib/teacherSourceLabels";

export type OutreachInfo = {
  campaign_id: string | null;
  state: "queued" | "assigned" | "sending" | "sent" | "failed" | string;
};

interface Props {
  prospects: TeacherProspect[];
  selected: number[];
  onToggleSelect: (id: number) => void;
  onToggleAll: () => void;
  onRowClick: (p: TeacherProspect) => void;
  onPromote: (p: TeacherProspect) => void;
  onShortlist: (p: TeacherProspect) => void;
  onEnrich: (p: TeacherProspect) => void;
  onMarkNotFit: (p: TeacherProspect) => void;
  promotedUuids?: Set<string>;
  promotedInfo?: Map<string, OutreachInfo>;
  campaignNames?: Map<string, string>;
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (n: number) => void;
  onPageSizeChange?: (n: number) => void;
  loading?: boolean;
  hideCityColumn?: boolean;
}

type SortKey = "name" | "school" | "city";

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function liHref(url: string | null | undefined): string | null {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function siteHref(url: string | null | undefined): string | null {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
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
  prospects, selected, onToggleSelect, onToggleAll, onRowClick,
  onPromote, onShortlist, onEnrich, onMarkNotFit,
  promotedUuids, promotedInfo, campaignNames,
  page, pageSize, totalCount, onPageChange, onPageSizeChange, loading,
  hideCityColumn,
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
      <div className="max-h-[calc(100vh-340px)] min-h-[300px] overflow-auto rounded-t-xl">
        <table className="w-full min-w-[1200px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className={`${headerCls} sticky left-0 z-20 w-10 bg-[#f8fafc]`}>
                <Checkbox className="border-[#dbe4f2] data-[state=checked]:border-[#174be8] data-[state=checked]:bg-[#174be8]" checked={allSelected} onCheckedChange={onToggleAll} />
              </th>
              <th className={`${headerCls} sticky left-10 z-20 min-w-[200px] cursor-pointer bg-[#f8fafc]`} onClick={() => toggleSort("name")}>
                <span className="inline-flex items-center gap-1">Name <ArrowUpDown size={10} /></span>
              </th>
              <th className={`${headerCls} min-w-[160px]`}>Title</th>
              <th className={`${headerCls} min-w-[200px] cursor-pointer`} onClick={() => toggleSort("school")}>
                <span className="inline-flex items-center gap-1">School <ArrowUpDown size={10} /></span>
              </th>
              {!hideCityColumn && (
                <th className={`${headerCls} min-w-[150px] cursor-pointer`} onClick={() => toggleSort("city")}>
                  <span className="inline-flex items-center gap-1">City <ArrowUpDown size={10} /></span>
                </th>
              )}
              <th className={`${headerCls} min-w-[180px]`}>Email</th>
              <th className={`${headerCls} w-12 text-center`}>In</th>
              <th className={`${headerCls} min-w-[170px]`}>Source</th>
              <th className={`${headerCls} sticky right-0 z-20 w-16 bg-[#f8fafc] text-right`}>Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const isSelected = selected.includes(p.id);
              const isPromoted = (promotedUuids?.has(p.uuid)) || p.status === "in_outreach";
              const isShortlisted = p.status === "shortlisted";
              const isNotFit = p.status === "not_fit";
              const badge = statusBadgeFor({
                enrichment_source: p.enrichmentSource ?? null,
                verification_status: p.verificationStatus ?? null,
                email: p.email,
              });
              const liUrl = liHref(p.linkedinUrl);
              const schoolUrl = siteHref(p.schoolUrl);
              const rowOpacity = isNotFit ? "opacity-50" : "";
              return (
                <tr key={p.uuid} className={`group cursor-pointer transition-colors hover:bg-[#f7faff] ${rowOpacity}`} onClick={() => onRowClick(p)}>
                  <td className={`${cellCls} sticky left-0 z-10 bg-white group-hover:bg-[#f7faff]`} onClick={e => e.stopPropagation()}>
                    <Checkbox className="border-[#dbe4f2] data-[state=checked]:border-[#174be8] data-[state=checked]:bg-[#174be8]" checked={isSelected} onCheckedChange={() => onToggleSelect(p.id)} />
                  </td>
                  <td className={`${cellCls} sticky left-10 z-10 bg-white group-hover:bg-[#f7faff]`}>
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#dbe7ff] text-[9.5px] font-black text-[#174be8]">{initials(p.name)}</div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-[#07142f]" title={p.name}>
                          {p.name}
                          {isShortlisted && <Star size={10} className="ml-1 inline fill-[#f59e0b] text-[#f59e0b]" />}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className={cellCls}>
                    {p.title ? (
                      <span className="block max-w-[180px] truncate text-[#526078]" title={p.title}>{p.title}</span>
                    ) : <span className="text-[#b0bbd0]">—</span>}
                  </td>
                  <td className={cellCls}>
                    <div className="flex items-center gap-1.5">
                      <span className="block max-w-[220px] truncate text-[#07142f]" title={p.school}>{p.school}</span>
                      {schoolUrl && (
                        <a
                          href={schoolUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 text-[#8794ab] hover:text-[#174be8]"
                          title={schoolUrl}
                        >
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </td>
                  {!hideCityColumn && (
                    <td className={`${cellCls} whitespace-nowrap`}>{p.city}{p.state ? `, ${p.state}` : ""}</td>
                  )}
                  <td className={cellCls}>
                    {p.email ? (
                      <span className="block max-w-[220px] truncate text-[#374151]" title={p.email}>{p.email}</span>
                    ) : <span className="italic text-[#b0bbd0]">no email</span>}
                  </td>
                  <td className={`${cellCls} text-center`} onClick={(e) => e.stopPropagation()}>
                    {liUrl ? (
                      <a
                        href={liUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#eaf2fb] text-[#0a66c2] transition hover:bg-[#0a66c2] hover:text-white"
                        title={p.linkedinUrl ?? ""}
                      >
                        <Linkedin size={12} />
                      </a>
                    ) : (
                      <span className="text-[#cdd5e0]" title="No LinkedIn">—</span>
                    )}
                  </td>
                  <td className={cellCls}>
                    <div className="flex items-center gap-1.5">
                      <SourceBadge badge={badge} />
                      {isPromoted && (() => {
                        const info = promotedInfo?.get(p.uuid);
                        const state = info?.state ?? "queued";
                        const cname = info?.campaign_id ? (campaignNames?.get(info.campaign_id) ?? `Campaign #${info.campaign_id}`) : "Unassigned";
                        const tone =
                          state === "sent" ? "bg-[#dcfce7] text-[#0a8f5a]" :
                          state === "sending" ? "bg-[#dbeafe] text-[#1e6fb8]" :
                          state === "failed" ? "bg-[#fee2e2] text-[#b91c1c]" :
                          state === "assigned" ? "bg-[#eef2f7] text-[#34445f]" :
                          "bg-[#fef3c7] text-[#92400e]"; // queued
                        const label =
                          state === "sent" ? "Sent" :
                          state === "sending" ? "Sending" :
                          state === "failed" ? "Failed" :
                          state === "assigned" ? "In" :
                          "Queued";
                        return (
                          <span
                            className={`inline-flex max-w-[180px] items-center gap-1 truncate rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tone}`}
                            title={`${label}: ${cname} — open Email Outreach to manage`}
                          >
                            <UserCheck size={10} className="shrink-0" />
                            <span className="truncate">{label}: {cname}</span>
                          </span>
                        );
                      })()}
                    </div>
                  </td>
                  <td className={`${cellCls} sticky right-0 z-10 bg-white text-right group-hover:bg-[#f7faff]`} onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[#dbe4f2] bg-white text-[#526078] transition hover:border-[#174be8] hover:bg-[#f4f7ff] hover:text-[#174be8]">
                          <MoreVertical size={12} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        sideOffset={6}
                        className="w-[228px] rounded-xl border-0 bg-white p-1.5 shadow-[0_12px_32px_rgba(15,23,42,0.12)] ring-1 ring-[#e7edf5]"
                      >
                        <DropdownMenuLabel className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#8794ab]">View</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onRowClick(p)} className="cursor-pointer rounded-md px-2 py-1.5 text-[13px] text-[#34445f] focus:bg-[#f4f7ff] focus:text-[#174be8]">
                          <Eye className="mr-2 h-3.5 w-3.5" /> View profile
                          <span className="ml-auto text-[10px] font-bold text-[#b0bbd0]">V</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="my-1 bg-[#f1f5f9]" />
                        <DropdownMenuLabel className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#8794ab]">Enrichment</DropdownMenuLabel>
                        <DropdownMenuItem
                          disabled={!p.schoolNcesId}
                          onClick={() => onEnrich(p)}
                          className="cursor-pointer rounded-md px-2 py-1.5 text-[13px] text-[#34445f] focus:bg-[#f4f7ff] focus:text-[#174be8]"
                        >
                          <Sparkles className="mr-2 h-3.5 w-3.5" />
                          {p.schoolNcesId ? "Enrich from school site" : "Enrich (school not linked)"}
                          <span className="ml-auto text-[10px] font-bold text-[#b0bbd0]">E</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onShortlist(p)} className="cursor-pointer rounded-md px-2 py-1.5 text-[13px] text-[#34445f] focus:bg-[#f4f7ff] focus:text-[#174be8]">
                          <Star className={`mr-2 h-3.5 w-3.5 ${isShortlisted ? "fill-[#f59e0b] text-[#f59e0b]" : ""}`} />
                          {isShortlisted ? "Remove from shortlist" : "Add to shortlist"}
                          <span className="ml-auto text-[10px] font-bold text-[#b0bbd0]">S</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="my-1 bg-[#f1f5f9]" />
                        <DropdownMenuLabel className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#8794ab]">Pipeline</DropdownMenuLabel>
                        <DropdownMenuItem
                          disabled={isPromoted}
                          onClick={() => onPromote(p)}
                          className="cursor-pointer rounded-md px-2 py-1.5 text-[13px] font-semibold text-[#174be8] focus:bg-[#eef4ff]"
                        >
                          <MailPlus className="mr-2 h-3.5 w-3.5" />
                          {isPromoted ? "Already in outreach" : "Add to outreach…"}
                          <span className="ml-auto text-[10px] font-bold text-[#b0bbd0]">O</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="my-1 bg-[#f1f5f9]" />
                        <DropdownMenuItem onClick={() => onMarkNotFit(p)} className="cursor-pointer rounded-md px-2 py-1.5 text-[13px] text-[#dc2626] focus:bg-[#fff5f5] focus:text-[#b91c1c]">
                          <UserX className="mr-2 h-3.5 w-3.5" /> Mark not fit
                          <span className="ml-auto text-[10px] font-bold text-[#fca5a5]">N</span>
                        </DropdownMenuItem>
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
