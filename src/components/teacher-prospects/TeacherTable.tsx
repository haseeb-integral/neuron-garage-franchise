import { useState } from "react";
import { TeacherProspect } from "@/data/teacherData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { FitScoreBadge } from "./FitScoreBadge";
import { TagBadge } from "./TagBadge";
import { ArrowUpDown, CheckCircle2, Clock, Linkedin } from "lucide-react";

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

function maskEmail(email: string): string {
  if (!email) return "—";
  const [user, domain] = email.split("@");
  if (!domain) return email;
  return `${user[0]}••••@${domain}`;
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

  const allSelected = prospects.length > 0 && prospects.every(p => selected.includes(p.id));

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <TableHead className="cursor-pointer select-none whitespace-nowrap text-[11px] font-bold uppercase tracking-wide text-[#8794ab]" onClick={() => toggleSort(k)}>
      <span className="flex items-center gap-1">{label} <ArrowUpDown size={12} /></span>
    </TableHead>
  );

  return (
    <div className="overflow-hidden rounded-xl border border-[#dbe4f2] bg-white shadow-sm">
      <div className="border-b border-[#edf2f8] px-4 py-3">
        <h2 className="text-base font-black text-[#07142f]">Teacher Prospect List</h2>
        <p className="text-xs text-[#66728a]">Review enriched teacher-operator prospects for this market.</p>
      </div>
      <div className="overflow-x-auto">
        <Table>
        <TableHeader className="bg-[#fbfcfe]">
          <TableRow className="border-[#edf2f8] hover:bg-[#fbfcfe]">
            <TableHead className="w-10">
              <Checkbox className="border-[#dbe4f2] data-[state=checked]:border-[#174be8] data-[state=checked]:bg-[#174be8]" checked={allSelected} onCheckedChange={onToggleAll} />
            </TableHead>
            <SortHeader label="Name" k="name" />
            <SortHeader label="School" k="school" />
            <SortHeader label="City/State" k="city" />
            <TableHead className="text-[11px] font-bold uppercase tracking-wide text-[#8794ab]">Email</TableHead>
            <TableHead className="text-[11px] font-bold uppercase tracking-wide text-[#8794ab]">LinkedIn</TableHead>
            <SortHeader label="Fit Score" k="fitScore" />
            <TableHead className="text-[11px] font-bold uppercase tracking-wide text-[#8794ab]">Tag</TableHead>
            <TableHead className="text-[11px] font-bold uppercase tracking-wide text-[#8794ab]">Enrichment</TableHead>
            <TableHead className="text-[11px] font-bold uppercase tracking-wide text-[#8794ab] hidden md:table-cell">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map(p => (
            <TableRow
              key={p.id}
              className="cursor-pointer border-[#edf2f8] transition-colors hover:bg-[#f4f7ff]"
              onClick={() => onRowClick(p)}
            >
              <TableCell onClick={e => e.stopPropagation()}>
                <Checkbox className="border-[#dbe4f2] data-[state=checked]:border-[#174be8] data-[state=checked]:bg-[#174be8]" checked={selected.includes(p.id)} onCheckedChange={() => onToggleSelect(p.id)} />
              </TableCell>
              <TableCell className="font-semibold text-[#07142f]">{p.name}</TableCell>
              <TableCell className="text-[#526078]">{p.school}</TableCell>
              <TableCell className="text-[#526078]">{p.city}, {p.state}</TableCell>
              <TableCell className="text-xs font-mono text-[#526078]">{maskEmail(p.email)}</TableCell>
              <TableCell onClick={e => e.stopPropagation()}>
                <a href={`https://${p.linkedin}`} target="_blank" rel="noreferrer" className="inline-flex">
                  <Linkedin size={16} className="text-[#0a66c2]" />
                </a>
              </TableCell>
              <TableCell><FitScoreBadge score={p.fitScore} /></TableCell>
              <TableCell><TagBadge tag={p.tag} /></TableCell>
              <TableCell>
                {p.enrichmentStatus === "Enriched" ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[#0ea66e]">
                    <CheckCircle2 size={14} /> Enriched
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[#8794ab]">
                    <Clock size={14} /> Pending
                  </span>
                )}
              </TableCell>
              <TableCell onClick={e => e.stopPropagation()} className="hidden md:table-cell">
                {promotedIds?.has(p.id) ? (
                  <Button
                    size="sm"
                    disabled
                    className="h-8 rounded-lg bg-[#eef2f7] text-xs font-bold text-[#66728a]"
                  >
                    Promoted ✓
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="h-8 rounded-lg bg-[#174be8] text-xs font-bold text-white hover:bg-[#123fc5]"
                    disabled={promotingId === p.id}
                    onClick={() => onPromote(p)}
                  >
                    {promotingId === p.id ? "Promoting…" : "Promote"}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {prospects.length === 0 && (
            <TableRow>
              <TableCell colSpan={10} className="py-8 text-center text-[#8794ab]">
                No prospects match your filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
