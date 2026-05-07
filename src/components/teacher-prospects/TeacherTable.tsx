import { useState } from "react";
import { TeacherProspect } from "@/data/teacherData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { FitScoreBadge } from "./FitScoreBadge";
import { ArrowUpDown, CheckCircle2, Clock, Eye, Globe, Linkedin, Mail, MoreVertical, Send, Star, UserCheck, UserX, Users, MailPlus } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Props {
  prospects: TeacherProspect[];
  selected: number[];
  onToggleSelect: (id: number) => void;
  onToggleAll: () => void;
  onRowClick: (p: TeacherProspect) => void;
  onPromote: (p: TeacherProspect) => void;
  promotedIds?: Set<number>;
  promotingId?: number | null;
}

type SortKey = "name" | "school" | "city" | "fitScore";

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function fitTagClass(tag: TeacherProspect["tag"]) {
  if (tag === "High Potential") return "bg-[#e6f7ef] text-[#0a8f5a]";
  if (tag === "Follow-Up") return "bg-[#fff4df] text-[#b7791f]";
  if (tag === "Not a Fit") return "bg-[#eef2f7] text-[#526078]";
  return "bg-[#eef4ff] text-[#174be8]";
}

function fitTagLabel(tag: TeacherProspect["tag"]) {
  if (tag === "High Potential") return "High";
  if (tag === "Follow-Up") return "Follow";
  if (tag === "Not a Fit") return "Not Fit";
  return "Untagged";
}

export function TeacherTable({ prospects, selected, onToggleSelect, onToggleAll, onRowClick, onPromote, promotedIds, promotingId }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("fitScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
  };

  const sorted = [...prospects].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
    return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const visibleRows = sorted.slice(0, 6);
  const allSelected = prospects.length > 0 && prospects.every(p => selected.includes(p.id));

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
              <TableHead className="h-9 w-11 py-2"><Checkbox className="border-[#dbe4f2] data-[state=checked]:border-[#174be8] data-[state=checked]:bg-[#174be8]" checked={allSelected} onCheckedChange={onToggleAll} /></TableHead>
              <SortHeader label="Name" k="name" />
              <SortHeader label="School / District" k="school" />
              <TableHead className="h-9 py-2 text-[10.5px] font-bold text-[#8794ab]">Experience</TableHead>
              <TableHead className="h-9 py-2 text-[10.5px] font-bold text-[#8794ab]">Signals</TableHead>
              <SortHeader label="Fit Score" k="fitScore" />
              <TableHead className="h-9 py-2 text-[10.5px] font-bold text-[#8794ab]">Fit Tag</TableHead>
              <TableHead className="h-9 py-2 text-[10.5px] font-bold text-[#8794ab]">Status</TableHead>
              <TableHead className="h-9 py-2 text-right text-[10.5px] font-bold text-[#8794ab]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((p) => {
              const isSelected = selected.includes(p.id);
              const isPromoted = promotedIds?.has(p.id);
              return (
                <TableRow key={p.id} className="h-[54px] cursor-pointer border-[#edf2f8] transition-colors hover:bg-[#f7faff]" onClick={() => onRowClick(p)}>
                  <TableCell className="py-2" onClick={e => e.stopPropagation()}><Checkbox className="border-[#dbe4f2] data-[state=checked]:border-[#174be8] data-[state=checked]:bg-[#174be8]" checked={isSelected} onCheckedChange={() => onToggleSelect(p.id)} /></TableCell>
                  <TableCell className="min-w-[205px] py-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#dbe7ff] text-[10px] font-black text-[#174be8]">{initials(p.name)}</div>
                      <div><div className="text-sm font-bold text-[#07142f]">{p.name}</div><div className="text-[10.5px] text-[#8794ab]">{p.email}</div></div>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[170px] py-2 text-sm text-[#526078]">{p.school}</TableCell>
                  <TableCell className="whitespace-nowrap py-2 text-sm text-[#526078]">{p.yearsExperience} yrs</TableCell>
                  <TableCell className="py-2"><div className="flex items-center gap-2 text-[#174be8]"><Linkedin size={13} />{p.enrichmentStatus === "Enriched" && <Mail size={13} />}{p.hasSummerCampExp ? <Users size={13} /> : <Globe size={13} className="text-[#8794ab]" />}</div></TableCell>
                  <TableCell className="py-2"><FitScoreBadge score={p.fitScore} /></TableCell>
                  <TableCell className="py-2"><span title={p.tag} className={`inline-flex min-w-[54px] justify-center rounded-full px-2 py-0.5 text-[10.5px] font-bold leading-4 ${fitTagClass(p.tag)}`}>{fitTagLabel(p.tag)}</span></TableCell>
                  <TableCell className="py-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isPromoted && <span className="inline-flex items-center gap-1 rounded-full bg-[#eef2f7] px-2.5 py-1 text-xs font-bold text-[#526078]"><UserCheck size={12} /> In Outreach</span>}
                      {p.enrichmentStatus === "Enriched" ? <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f7ef] px-2.5 py-1 text-xs font-bold text-[#0ea66e]"><CheckCircle2 size={12} /> Enriched</span> : <span className="inline-flex items-center gap-1 rounded-full bg-[#fff4df] px-2.5 py-1 text-xs font-bold text-[#b7791f]"><Clock size={12} /> Pending</span>}
                    </div>
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()} className="py-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><button className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#dbe4f2] bg-white text-[#526078] hover:bg-[#f4f7ff] hover:text-[#174be8]"><MoreVertical size={14} /></button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52 bg-white">
                        <DropdownMenuItem onClick={() => onRowClick(p)}><Eye className="mr-2 h-4 w-4" /> View profile</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.info(`Sample enrichment queued for ${p.name}.`)}><Send className="mr-2 h-4 w-4" /> Enrich contact</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.success(`${p.name} added to shortlist.`)}><Star className="mr-2 h-4 w-4" /> Add to shortlist</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled={isPromoted || promotingId === p.id} onClick={() => onPromote(p)}><MailPlus className="mr-2 h-4 w-4" /> {isPromoted ? "Already in outreach" : "Add to outreach"}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.info(`${p.name} marked as not a fit.`)}><UserX className="mr-2 h-4 w-4" /> Mark not fit</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {prospects.length === 0 && <TableRow><TableCell colSpan={9} className="py-8 text-center text-[#8794ab]">No prospects match your filters.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between border-t border-[#edf2f8] px-4 py-2 text-xs text-[#66728a]">
        <span>Showing 1 to {Math.min(sorted.length, 6)} of 354 results</span>
        <div className="flex items-center gap-1.5">{["‹", "1", "2", "3", "…", "45", "›"].map((p) => <button key={p} className={`h-7 min-w-7 rounded-md border px-2 font-bold ${p === "1" ? "border-[#174be8] bg-[#174be8] text-white" : "border-[#dbe4f2] bg-white text-[#526078]"}`}>{p}</button>)}</div>
      </div>
    </div>
  );
}
