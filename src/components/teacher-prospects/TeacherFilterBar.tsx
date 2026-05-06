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
  const selectClass = "h-9 rounded-lg border-[#dbe4f2] bg-white text-sm text-[#07142f] shadow-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-[#dbe4f2]";

  return (
    <div className="mb-0 rounded-xl border border-[#e7edf5] bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
      <div className="grid grid-cols-1 items-center gap-2 xl:grid-cols-[minmax(220px,1fr)_120px_120px_110px_120px_auto]">
        <div className="relative min-w-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8794ab]" />
          <Input
            placeholder="Search name or school..."
            value={p.search}
            onChange={e => p.setSearch(e.target.value)}
            className="h-9 rounded-lg border-[#dbe4f2] bg-white pl-9 text-sm text-[#07142f] shadow-none placeholder:text-[#8794ab] focus:border-[#dbe4f2] focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        <Select value={p.cityFilter} onValueChange={p.setCityFilter}>
          <SelectTrigger className={selectClass}><SelectValue placeholder="City" /></SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="All">All Cities</SelectItem>
            {p.cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={p.tagFilter} onValueChange={p.setTagFilter}>
          <SelectTrigger className={selectClass}><SelectValue placeholder="Fit Tag" /></SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="All">All Fit Tags</SelectItem>
            <SelectItem value="High Potential">High Potential</SelectItem>
            <SelectItem value="Follow-Up">Follow-Up</SelectItem>
            <SelectItem value="Not a Fit">Not a Fit</SelectItem>
            <SelectItem value="Untagged">Untagged</SelectItem>
          </SelectContent>
        </Select>

        <Select value={p.gradeFilter} onValueChange={p.setGradeFilter}>
          <SelectTrigger className={selectClass}><SelectValue placeholder="Grade" /></SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="All">All Grades</SelectItem>
            <SelectItem value="K-2">K-2</SelectItem>
            <SelectItem value="3-5">3-5</SelectItem>
            <SelectItem value="6-8">6-8</SelectItem>
          </SelectContent>
        </Select>

        <Select value={p.enrichmentFilter} onValueChange={p.setEnrichmentFilter}>
          <SelectTrigger className={selectClass}><SelectValue placeholder="Enrichment" /></SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="All">All Status</SelectItem>
            <SelectItem value="Enriched">Enriched</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
          </SelectContent>
        </Select>

        <label className="flex h-9 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border border-[#dbe4f2] bg-white px-3 text-sm font-medium text-[#07142f] focus-within:ring-0">
          <Checkbox
            className="border-[#ff7a1a] focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=checked]:border-[#174be8] data-[state=checked]:bg-[#174be8]"
            checked={p.campOnly}
            onCheckedChange={(v) => p.setCampOnly(!!v)}
          />
          Has Camp Experience
        </label>
      </div>
    </div>
  );
}
