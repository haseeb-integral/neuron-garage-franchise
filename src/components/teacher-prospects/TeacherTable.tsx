import { useMemo, useState } from "react";
import { TeacherProspect } from "@/data/teacherData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, Eye, MailPlus, MoreVertical, Send, Star, UserCheck, UserX } from "lucide-react";
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
  if (current > 3) out.push("…");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) add(i);
  if (current < total - 2) out.push("…");
  if (total > 1) add(total);
  return out;
}

export function TeacherTable({
  prospects, selected, onToggleSelect, onToggleAll, onRowClick, onPromote,
  promotedIds, promotingId, page, pageSize, totalCount, onPageChange,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  const sorted = useMemo(() => [...prospects].sort((a, b) => {
    const av = String(a[sortKey] ?? ""), bv = String(b[sortKey] ?? "");
    return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
  }), [prospects, sortKey, sortDir]);

  const allSelected = prospects.length > 0 && prospects.every(p => selected.includes(p.id));
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const fromIdx = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const toIdx = Math.min(totalCount, (page - 1) * pageSize + prospects.length);

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <TableHead className="h-9 cursor-pointer select-none whitespace-nowrap py-2 text-[10.5px] font-bold text-[#8794ab]" onClick={() => toggleSort(k)}>
      <span className="flex items-center gap-1">{label} <ArrowUpDown size={10} /></span>
    </TableHead>
  );

  return (
    <div className="overflow-hidden rounded-xl border border-[#e7edf5] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.025)]">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-white">
            <TableRow className="h-9 border-[#edf2f8] hover:bg-white">
              <TableHead className="h-9 w-11 py-2">
                <Checkbox className="border-[#dbe4f2] data-[state=checked]:border-[#174be8] data-[state=checked]:bg-[#174be8]" checked={allSelected} onCheckedChange={onToggleAll} />
              </TableHead>
              <SortHeader label="Name" k="name" />
              <SortHeader label="School / District" k="school" />
              <SortHeader label="City" k="city" />
              <TableHead className="h-9 py-2 text-[10.5px] font-bold text-[#8794ab]">Source</TableHead>
              <TableHead className="h-9 py-2 text-[10.5px] font-bold text-[#8794ab]">Fit Score</TableHead>
              <TableHead className="h-9 py-2 text-right text-[10.5px] font-bold text-[#8794ab]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((p) => {
              const isSelected = selected.includes(p.id);
              const isPromoted = promotedIds?.has(p.id);
              const badge = statusBadgeFor({
                enrichment_source: p.enrichmentSource ?? null,
                verification_status: p.verificationStatus ?? null,
                email: p.email,
              });
              return (
                <TableRow key={p.id} className="h-[54px] cursor-pointer border-[#edf2f8] transition-colors hover:bg-[#f7faff]" onClick={() => onRowClick(p)}>
                  <TableCell className="py-2" onClick={e => e.stopPropagation()}>
                    <Checkbox className="border-[#dbe4f2] data-[state=checked]:border-[#174be8] data-[state=checked]:bg-[#174be8]" checked={isSelected} onCheckedChange={() => onToggleSelect(p.id)} />
                  </TableCell>
                  <TableCell className="min-w-[205px] py-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#dbe7ff] text-[10px] font-black text-[#174be8]">{initials(p.name)}</div>
                      <div>
                        <div className="text-sm font-bold text-[#07142f]">{p.name}</div>
                        <div className="text-[10.5px] text-[#8794ab]">{p.email || <span className="italic text-[#b0bbd0]">no email</span>}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[170px] py-2 text-sm text-[#526078]">{p.school}</TableCell>
                  <TableCell className="whitespace-nowrap py-2 text-sm text-[#526078]">{p.city}{p.state ? `, ${p.state}` : ""}</TableCell>
                  <TableCell className="py-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <SourceBadge badge={badge} />
                      {isPromoted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#eef2f7] px-2 py-0.5 text-[10.5px] font-bold text-[#526078]">
                          <UserCheck size={11} /> In Outreach
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 text-[#8794ab]">
                    <span title="AI Fit Scoring not yet run (Task 14)">— <span className="text-[10.5px]">Score with AI</span></span>
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()} className="py-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#dbe4f2] bg-white text-[#526078] hover:bg-[#f4f7ff] hover:text-[#174be8]">
                          <MoreVertical size={14} />
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
                  </TableCell>
                </TableRow>
              );
            })}
            {prospects.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-[#8794ab]">No prospects match your filters.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between border-t border-[#edf2f8] px-4 py-2 text-xs text-[#66728a]">
        <span>Showing {(fromIdx ?? 0).toLocaleString()}–{(toIdx ?? 0).toLocaleString()} of {(totalCount ?? 0).toLocaleString()}</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="h-7 min-w-7 rounded-md border border-[#dbe4f2] bg-white px-2 font-bold text-[#526078] disabled:opacity-40"
          >‹</button>
          {pageList(page, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={`e${i}`} className="px-1 text-[#8794ab]">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p as number)}
                className={`h-7 min-w-7 rounded-md border px-2 font-bold ${p === page ? "border-[#174be8] bg-[#174be8] text-white" : "border-[#dbe4f2] bg-white text-[#526078]"}`}
              >{p}</button>
            ),
          )}
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="h-7 min-w-7 rounded-md border border-[#dbe4f2] bg-white px-2 font-bold text-[#526078] disabled:opacity-40"
          >›</button>
        </div>
      </div>
    </div>
  );
}
