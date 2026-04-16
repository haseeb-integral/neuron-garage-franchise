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
  return (
    <div className="bg-white rounded-lg p-4 mb-4 flex flex-wrap items-center gap-3" style={{ border: "1px solid #dee2e6" }}>
      <div className="relative flex-1 min-w-[200px]">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#adb5bd" }} />
        <Input
          placeholder="Search name or school..."
          value={p.search}
          onChange={e => p.setSearch(e.target.value)}
          className="pl-9 bg-white h-9"
        />
      </div>

      <Select value={p.cityFilter} onValueChange={p.setCityFilter}>
        <SelectTrigger className="w-[140px] bg-white h-9"><SelectValue placeholder="City" /></SelectTrigger>
        <SelectContent className="bg-white">
          <SelectItem value="All">All Cities</SelectItem>
          {p.cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={p.tagFilter} onValueChange={p.setTagFilter}>
        <SelectTrigger className="w-[140px] bg-white h-9"><SelectValue placeholder="Tag" /></SelectTrigger>
        <SelectContent className="bg-white">
          <SelectItem value="All">All Tags</SelectItem>
          <SelectItem value="High Potential">High Potential</SelectItem>
          <SelectItem value="Follow-Up">Follow-Up</SelectItem>
          <SelectItem value="Not a Fit">Not a Fit</SelectItem>
          <SelectItem value="Untagged">Untagged</SelectItem>
        </SelectContent>
      </Select>

      <Select value={p.gradeFilter} onValueChange={p.setGradeFilter}>
        <SelectTrigger className="w-[130px] bg-white h-9"><SelectValue placeholder="Grade" /></SelectTrigger>
        <SelectContent className="bg-white">
          <SelectItem value="All">All Grades</SelectItem>
          <SelectItem value="K-2">K-2</SelectItem>
          <SelectItem value="3-5">3-5</SelectItem>
          <SelectItem value="6-8">6-8</SelectItem>
        </SelectContent>
      </Select>

      <Select value={p.enrichmentFilter} onValueChange={p.setEnrichmentFilter}>
        <SelectTrigger className="w-[150px] bg-white h-9"><SelectValue placeholder="Enrichment" /></SelectTrigger>
        <SelectContent className="bg-white">
          <SelectItem value="All">All Status</SelectItem>
          <SelectItem value="Enriched">Enriched</SelectItem>
          <SelectItem value="Pending">Pending</SelectItem>
        </SelectContent>
      </Select>

      <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "#343a40" }}>
        <Checkbox checked={p.campOnly} onCheckedChange={(v) => p.setCampOnly(!!v)} />
        Has Camp Experience
      </label>
    </div>
  );
}
