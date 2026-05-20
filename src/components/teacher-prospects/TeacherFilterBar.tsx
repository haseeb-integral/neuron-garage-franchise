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
  cityFilters: string[];
  setCityFilters: (v: string[]) => void;
  sourceFilter: SourceFilter;
  setSourceFilter: (v: SourceFilter) => void;
  search: string;
  setSearch: (v: string) => void;
  hideInOutreach: boolean;
  setHideInOutreach: (v: boolean) => void;
  inOutreachCount: number;
}

const MAX_CITIES = 10;

export function TeacherFilterBar(p: Props) {
  const [cityOpen, setCityOpen] = useState(false);

  const selected = new Set(p.cityFilters);
  const cityLabel =
    p.cityFilters.length === 0
      ? `All Cities (${p.cities.length})`
      : p.cityFilters.length === 1
        ? p.cityFilters[0]
        : `${p.cityFilters.length} cities selected`;

  const toggle = (city: string) => {
    if (selected.has(city)) {
      p.setCityFilters(p.cityFilters.filter((c) => c !== city));
    } else {
      if (p.cityFilters.length >= MAX_CITIES) return;
      p.setCityFilters([...p.cityFilters, city]);
    }
  };

  const selectClass =
    "h-9 rounded-lg border-[#dbe4f2] bg-white text-sm text-[#07142f] shadow-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-[#dbe4f2]";

  return (
    <div className="mb-0 rounded-xl border border-[#e7edf5] bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
      <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(220px,1fr)_240px_220px]">
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
          <PopoverContent align="start" className="w-[300px] bg-white p-0">
            <Command>
              <CommandInput placeholder={`Search ${p.cities.length} cities…`} className="h-9" />
              <div className="flex items-center justify-between border-b border-[#eef2f7] px-2 py-1.5 text-[11px]">
                <span className="text-[#526078]">
                  {p.cityFilters.length === 0
                    ? "All cities"
                    : `${p.cityFilters.length}/${MAX_CITIES} selected`}
                </span>
                {p.cityFilters.length > 0 && (
                  <button
                    onClick={() => { p.setCityFilters([]); }}
                    className="font-semibold text-[#174be8] hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <CommandList className="max-h-72">
                <CommandEmpty>No city matches.</CommandEmpty>
                <CommandGroup>
                  {p.cities.map((c) => {
                    const isOn = selected.has(c);
                    const disabled = !isOn && p.cityFilters.length >= MAX_CITIES;
                    return (
                      <CommandItem
                        key={c}
                        value={c}
                        onSelect={() => { if (!disabled) toggle(c); }}
                        className={disabled ? "opacity-50" : ""}
                      >
                        <span className={`mr-2 flex h-4 w-4 items-center justify-center rounded border ${isOn ? "border-[#174be8] bg-[#174be8] text-white" : "border-[#cbd5e1] bg-white"}`}>
                          {isOn && <Check size={11} />}
                        </span>
                        <span className="truncate">{c}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
              <div className="flex items-center justify-end border-t border-[#eef2f7] px-2 py-1.5">
                <button
                  onClick={() => setCityOpen(false)}
                  className="rounded-md bg-[#174be8] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#1240c9]"
                >
                  Done
                </button>
              </div>
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

      <label className="mt-2 flex w-fit cursor-pointer select-none items-center gap-2 rounded-md px-1 py-1 text-xs text-[#34445f] hover:bg-[#f4f7ff]">
        <input
          type="checkbox"
          checked={p.hideInOutreach}
          onChange={(e) => p.setHideInOutreach(e.target.checked)}
          className="h-3.5 w-3.5 cursor-pointer accent-[#174be8]"
        />
        <span>
          Hide teachers already in outreach
          {p.inOutreachCount > 0 && (
            <span className="ml-1 text-[#8794ab]">({p.inOutreachCount.toLocaleString()} hidden when on)</span>
          )}
        </span>
      </label>
    </div>
  );
}
