import { useState } from "react";
import { TeacherProspect } from "@/data/teacherData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { FitScoreBadge } from "./FitScoreBadge";
import { ArrowUpDown, CheckCircle2, Clock, Globe, Linkedin, Mail, MoreVertical, Users } from "lucide-react";

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

export function TeacherTable({ prospects, selected, onToggleSelect, onToggleAll, onRowClick }: Props) {
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

  const allSelected = prospects.length > 0 && prospects.every(p => selected.includes(p.id));

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <TableHead className="cursor-pointer select-none whitespace-nowrap text-[11px] font-bold text-[#8794ab]" onClick={() => toggleSort(k)}>
      <span className="flex items-center gap-1">{label} <ArrowUpDown size={11} /></span>
    </TableHead>
  );

  return (
    <div className="overflow-hidden rounded-xl border border-[#dbe4f2] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-[#fbfcfe]">
            <TableRow className="border-[#edf2f8] hover:bg-[#fbfcfe]">
              <TableHead className="w-11">
                <Checkbox className="border-[#dbe4f2] data-[state=checked]:border-[#174be8] data-[state=checked]:bg-[#174be8]" checked={allSelected} onCheckedChange={onToggleAll} />
              </TableHead>
              <SortHeader label="Name" k="name" />
              <SortHeader label="School / District" k="school" />
              <TableHead className="text-[11px] font-bold text-[#8794ab]">Experience</TableHead>
              <TableHead className="text-[11px] font-bold text-[#8794ab]">Signals</TableHead>
              <SortHeader label="Fit Score" k="fitScore" />
              <TableHead className="text-[11px] font-bold text-[#8794ab]">Status</TableHead>
              <TableHead className="text-right text-[11px] font-bold text-[#8794ab]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((p, index) => {
              const isSelected = selected.includes(p.id);
              return (
                <TableRow
                  key={p.id}
                  className={`cursor-pointer border-[#edf2f8] transition-colors hover:bg-[#f4f7ff] ${index === 0 ? "bg-[#f4f7ff]" : ""}`}
                  onClick={() => onRowClick(p)}
                >
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Checkbox className="border-[#dbe4f2] data-[state=checked]:border-[#174be8] data-[state=checked]:bg-[#174be8]" checked={isSelected} onCheckedChange={() => onToggleSelect(p.id)} />
                  </TableCell>
                  <TableCell className="min-w-[210px]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#dbe7ff] text-[11px] font-black text-[#174be8]">
                        {initials(p.name)}
                      </div>
                      <div>
                        <div className="font-bold text-[#07142f]">{p.name}</div>
                        <div className="text-[11px] text-[#8794ab]">{p.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[185px] text-[#526078]">{p.school}</TableCell>
                  <TableCell className="whitespace-nowrap text-[#526078]">{p.yearsExperience} yrs</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-[#174be8]">
                      <Linkedin size={14} />
                      {p.enrichmentStatus === "Enriched" && <Mail size={14} />}
                      {p.hasSummerCampExp ? <Users size={14} /> : <Globe size={14} className="text-[#8794ab]" />}
                    </div>
                  </TableCell>
                  <TableCell><FitScoreBadge score={p.fitScore} /></TableCell>
                  <TableCell>
                    {p.enrichmentStatus === "Enriched" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f7ef] px-2.5 py-1 text-xs font-bold text-[#0ea66e]">
                        <CheckCircle2 size={13} /> Enriched
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#fff4df] px-2.5 py-1 text-xs font-bold text-[#b7791f]">
                        <Clock size={13} /> Pending
                      </span>
                    )}
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()} className="text-right">
                    <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#dbe4f2] bg-white text-[#526078] hover:bg-[#f4f7ff] hover:text-[#174be8]">
                      <MoreVertical size={15} />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
            {prospects.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-[#8794ab]">
                  No prospects match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between border-t border-[#edf2f8] px-4 py-3 text-xs text-[#66728a]">
        <span>Showing 1 to {Math.min(sorted.length, 6)} of 354 results</span>
        <div className="flex items-center gap-2">
          {["‹", "1", "2", "3", "…", "45", "›"].map((p) => (
            <button key={p} className={`h-7 min-w-7 rounded-md border px-2 font-bold ${p === "1" ? "border-[#174be8] bg-[#174be8] text-white" : "border-[#dbe4f2] bg-white text-[#526078]"}`}>{p}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
