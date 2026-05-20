import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Search, ChevronDown, Check } from "lucide-react";
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
  const [cityOpen, setCityOpen] = useState(false);
  const cityLabel = p.cityFilter && p.cityFilter !== "All" ? p.cityFilter : `All Cities (${p.cities.length})`;

  const selectClass =
    "h-9 rounded-lg border-[#dbe4f2] bg-white text-sm text-[#07142f] shadow-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-[#dbe4f2]";

  return (
    <div className="mb-0 rounded-xl border border-[#e7edf5] bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
      <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(220px,1fr)_220px_220px]">
        <div className="relative min-w-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8794ab]" />
          <Input
            placeholder="Search name, school, or city…"
            value={p.search}
            onChange={(e) => p.setSearch(e.target.value)}
            className="h-9 rounded-lg border-[#dbe4f2] bg-white pl-9 text-sm text-[#07142f] shadow-none placeholder:text-[#8794ab] focus:border-[#dbe4f2] focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        <Popover open={cityOpen} onOpenChange={setCityOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" className="h-9 justify-between rounded-lg border-[#dbe4f2] bg-white px-3 text-sm font-normal text-[#07142f] shadow-none hover:bg-white">
              <span className="truncate">{cityLabel}</span>
              <ChevronDown size={14} className="ml-2 shrink-0 text-[#8794ab]" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[280px] bg-white p-0">
            <Command>
              <CommandInput placeholder={`Search ${p.cities.length} cities…`} className="h-9" />
              <CommandList className="max-h-72">
                <CommandEmpty>No city matches.</CommandEmpty>
                <CommandGroup>
                  <CommandItem onSelect={() => { p.setCityFilter("All"); setCityOpen(false); }}>
                    <Check size={14} className={`mr-2 ${p.cityFilter === "All" || !p.cityFilter ? "opacity-100" : "opacity-0"}`} />
                    All Cities ({p.cities.length})
                  </CommandItem>
                  {p.cities.map((c) => (
                    <CommandItem key={c} value={c} onSelect={() => { p.setCityFilter(c); setCityOpen(false); }}>
                      <Check size={14} className={`mr-2 ${p.cityFilter === c ? "opacity-100" : "opacity-0"}`} />
                      {c}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

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
