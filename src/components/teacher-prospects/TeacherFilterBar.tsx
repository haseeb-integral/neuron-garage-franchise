import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { SourceFilter } from "@/lib/teacherSourceLabels";

interface Props {
  cities: string[];
  cityFilter: string;
  setCityFilter: (v: string) => void;
  sourceFilter: SourceFilter;
  setSourceFilter: (v: SourceFilter) => void;
  search: string;
  setSearch: (v: string) => void;
}

export function TeacherFilterBar(p: Props) {
  const selectClass =
    "h-9 rounded-lg border-[#dbe4f2] bg-white text-sm text-[#07142f] shadow-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-[#dbe4f2]";

  return (
    <div className="mb-0 rounded-xl border border-[#e7edf5] bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
      <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(220px,1fr)_180px_200px]">
        <div className="relative min-w-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8794ab]" />
          <Input
            placeholder="Search name, school, or city…"
            value={p.search}
            onChange={(e) => p.setSearch(e.target.value)}
            className="h-9 rounded-lg border-[#dbe4f2] bg-white pl-9 text-sm text-[#07142f] shadow-none placeholder:text-[#8794ab] focus:border-[#dbe4f2] focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        <Select value={p.cityFilter} onValueChange={p.setCityFilter}>
          <SelectTrigger className={selectClass}>
            <SelectValue placeholder="City" />
          </SelectTrigger>
          <SelectContent className="max-h-72 bg-white">
            <SelectItem value="All">All Cities ({p.cities.length})</SelectItem>
            {p.cities.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={p.sourceFilter} onValueChange={(v) => p.setSourceFilter(v as SourceFilter)}>
          <SelectTrigger className={selectClass}>
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="smartlead">SmartLead Enriched</SelectItem>
            <SelectItem value="linkedin">LinkedIn Import</SelectItem>
            <SelectItem value="needs_email">Needs Email Enrichment</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
