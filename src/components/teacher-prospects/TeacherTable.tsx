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
}

type SortKey = "name" | "school" | "city" | "fitScore";

function maskEmail(email: string): string {
  if (!email) return "—";
  const [user, domain] = email.split("@");
  if (!domain) return email;
  return `${user[0]}••••@${domain}`;
}

export function TeacherTable({ prospects, selected, onToggleSelect, onToggleAll, onRowClick, onPromote }: Props) {
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
    <TableHead className="cursor-pointer select-none whitespace-nowrap text-xs" onClick={() => toggleSort(k)} style={{ color: "#6c757d" }}>
      <span className="flex items-center gap-1">{label} <ArrowUpDown size={12} /></span>
    </TableHead>
  );

  return (
    <div className="bg-white rounded-lg" style={{ border: "1px solid #dee2e6" }}>
      <div className="overflow-x-auto rounded-lg">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox checked={allSelected} onCheckedChange={onToggleAll} />
            </TableHead>
            <SortHeader label="Name" k="name" />
            <SortHeader label="School" k="school" />
            <SortHeader label="City/State" k="city" />
            <TableHead className="text-xs" style={{ color: "#6c757d" }}>Email</TableHead>
            <TableHead className="text-xs" style={{ color: "#6c757d" }}>LinkedIn</TableHead>
            <SortHeader label="Fit Score" k="fitScore" />
            <TableHead className="text-xs" style={{ color: "#6c757d" }}>Tag</TableHead>
            <TableHead className="text-xs" style={{ color: "#6c757d" }}>Enrichment</TableHead>
            <TableHead className="text-xs" style={{ color: "#6c757d" }}>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map(p => (
            <TableRow
              key={p.id}
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => onRowClick(p)}
            >
              <TableCell onClick={e => e.stopPropagation()}>
                <Checkbox checked={selected.includes(p.id)} onCheckedChange={() => onToggleSelect(p.id)} />
              </TableCell>
              <TableCell className="font-medium" style={{ color: "#343a40" }}>{p.name}</TableCell>
              <TableCell style={{ color: "#6c757d" }}>{p.school}</TableCell>
              <TableCell style={{ color: "#6c757d" }}>{p.city}, {p.state}</TableCell>
              <TableCell style={{ color: "#6c757d" }} className="text-xs font-mono">{maskEmail(p.email)}</TableCell>
              <TableCell onClick={e => e.stopPropagation()}>
                <a href={`https://${p.linkedin}`} target="_blank" rel="noreferrer" className="inline-flex">
                  <Linkedin size={16} style={{ color: "#0a66c2" }} />
                </a>
              </TableCell>
              <TableCell><FitScoreBadge score={p.fitScore} /></TableCell>
              <TableCell><TagBadge tag={p.tag} /></TableCell>
              <TableCell>
                {p.enrichmentStatus === "Enriched" ? (
                  <span className="inline-flex items-center gap-1 text-xs" style={{ color: "#20c997" }}>
                    <CheckCircle2 size={14} /> Enriched
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs" style={{ color: "#adb5bd" }}>
                    <Clock size={14} /> Pending
                  </span>
                )}
              </TableCell>
              <TableCell onClick={e => e.stopPropagation()}>
                <Button
                  size="sm"
                  className="text-white h-7 text-xs"
                  style={{ backgroundColor: "#fd7e14" }}
                  onClick={() => onPromote(p)}
                >
                  Promote
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {prospects.length === 0 && (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-8" style={{ color: "#adb5bd" }}>
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
