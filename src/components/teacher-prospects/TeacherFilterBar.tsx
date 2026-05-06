import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface Props {
  cities: string[];
  cityFilter: string;
  setCityFilter: (v: string) => void;
  tagFilter: string;
  setTagFilter: (v: string) => void;
  gradeFilter: string;
  setGradeFilter: (v: string) => void;
  campOnly: boolean;
  setCampOnly: (v: boolean) => void;
  enrichmentFilter: string;
  setEnrichmentFilter: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
}

export function TeacherFilterBar(p: Props) {
  const selectClass = "h-10 rounded-lg border-[#dbe4f2] bg-white text-[#07142f] shadow-none";

  return (
    <div className="mb-4 rounded-xl border border-[#dbe4f2] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[280px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8794ab]" />
          <Input
            placeholder="Search name or school..."
            value={p.search}
            onChange={e => p.setSearch(e.target.value)}
            className="h-10 rounded-lg border-[#dbe4f2] bg-white pl-9 text-[#07142f] shadow-none placeholder:text-[#8794ab]"
          />
        </div>

        <Select value={p.cityFilter} onValueChange={p.setCityFilter}>
          <SelectTrigger className={`w-[150px] ${selectClass}`}><SelectValue placeholder="City" /></SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="All">All Cities</SelectItem>
            {p.cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={p.tagFilter} onValueChange={p.setTagFilter}>
          <SelectTrigger className={`w-[150px] ${selectClass}`}><SelectValue placeholder="Tag" /></SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="All">All Tags</SelectItem>
            <SelectItem value="High Potential">High Potential</SelectItem>
            <SelectItem value="Follow-Up">Follow-Up</SelectItem>
            <SelectItem value="Not a Fit">Not a Fit</SelectItem>
            <SelectItem value="Untagged">Untagged</SelectItem>
          </SelectContent>
        </Select>

        <Select value={p.gradeFilter} onValueChange={p.setGradeFilter}>
          <SelectTrigger className={`w-[140px] ${selectClass}`}><SelectValue placeholder="Grade" /></SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="All">All Grades</SelectItem>
            <SelectItem value="K-2">K-2</SelectItem>
            <SelectItem value="3-5">3-5</SelectItem>
            <SelectItem value="6-8">6-8</SelectItem>
          </SelectContent>
        </Select>

        <Select value={p.enrichmentFilter} onValueChange={p.setEnrichmentFilter}>
          <SelectTrigger className={`w-[160px] ${selectClass}`}><SelectValue placeholder="Enrichment" /></SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="All">All Status</SelectItem>
            <SelectItem value="Enriched">Enriched</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
          </SelectContent>
        </Select>

        <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-[#dbe4f2] bg-white px-3 text-sm font-medium text-[#07142f]">
          <Checkbox
            className="border-[#ff7a1a] data-[state=checked]:border-[#174be8] data-[state=checked]:bg-[#174be8]"
            checked={p.campOnly}
            onCheckedChange={(v) => p.setCampOnly(!!v)}
          />
          Has Camp Experience
        </label>
      </div>
    </div>
  );
}
