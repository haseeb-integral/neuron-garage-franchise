import { Check, ChevronsUpDown, Info, RefreshCw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  stateOpen: boolean;
  setStateOpen: (v: boolean) => void;
  stateFilter: string;
  setStateFilter: (v: string) => void;
  availableStates: string[];
  cityFilter: string;
  setCityFilter: (v: string) => void;
  minPop: string;
  setMinPop: (v: string) => void;
  minScore: number;
  setMinScore: (v: number) => void;
  tierFilter: string;
  setTierFilter: (v: string) => void;
  nonRegOnly: boolean;
  setNonRegOnly: (v: boolean) => void;
  refreshingMarket: boolean;
  onRefreshData: () => void;
}

export function CityFiltersRow({
  stateOpen, setStateOpen, stateFilter, setStateFilter, availableStates,
  cityFilter, setCityFilter, minPop, setMinPop, minScore, setMinScore,
  tierFilter, setTierFilter, nonRegOnly, setNonRegOnly,
  refreshingMarket, onRefreshData,
}: Props) {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="mb-4 rounded-lg bg-white border border-[#eef2f7] p-3 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1 min-w-[180px]">
          <label className="text-[11px] text-[#526078]">State</label>
          <Popover open={stateOpen} onOpenChange={setStateOpen}>
            <PopoverTrigger asChild>
              <button
                role="combobox"
                aria-expanded={stateOpen}
                className="h-9 w-full flex items-center justify-between rounded-md border border-[#e5eaf2] bg-white px-3 text-sm text-[#07142f] hover:bg-[#fbfcff]"
              >
                <span className="truncate">{stateFilter === "All" ? "All States" : stateFilter}</span>
                <ChevronsUpDown size={14} className="ml-2 shrink-0 text-[#8794ab]" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[240px]" align="start">
              <Command>
                <CommandInput placeholder="Search state…" className="h-9" />
                <CommandList>
                  <CommandEmpty>No state found.</CommandEmpty>
                  <CommandGroup>
                    {(["All", ...availableStates] as string[]).map((s) => (
                      <CommandItem
                        key={s}
                        value={s}
                        onSelect={() => { setStateFilter(s); setStateOpen(false); }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", stateFilter === s ? "opacity-100" : "opacity-0")} />
                        {s === "All" ? "All States" : s}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-col gap-1 min-w-[180px]">
          <label className="text-[11px] text-[#526078]">City</label>
          <div className="relative h-9">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8794ab]" />
            <Input
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              placeholder="Search city…"
              className="h-9 pl-8 pr-7 bg-white border-[#e5eaf2] text-sm"
            />
            {cityFilter && (
              <button
                type="button"
                onClick={() => setCityFilter("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8794ab] hover:text-[#07142f]"
                aria-label="Clear city filter"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1 min-w-[140px]">
          <label className="text-[11px] text-[#526078] flex items-center gap-1">
            Min Population
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help text-[#8794ab]"><Info size={11} /></span>
              </TooltipTrigger>
              <TooltipContent className="max-w-[220px] text-xs">Only show cities with population above this threshold.</TooltipContent>
            </Tooltip>
          </label>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            placeholder="Any"
            value={minPop === "0" ? "" : minPop}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9]/g, "");
              setMinPop(v === "" ? "0" : v);
            }}
            className="h-9 bg-white border-[#e5eaf2] text-sm"
          />
        </div>
        <div className="flex flex-col gap-1 min-w-[180px] flex-1 max-w-[260px]">
          <label className="text-[11px] text-[#526078] flex items-center gap-1">
            Min Score
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help text-[#8794ab]"><Info size={11} /></span>
              </TooltipTrigger>
              <TooltipContent className="max-w-[220px] text-xs">Only show cities scoring at or above this number (0–100).</TooltipContent>
            </Tooltip>
          </label>
          <div className="flex items-center gap-2 h-9">
            <Slider
              value={[minScore]}
              onValueChange={([v]) => setMinScore(v)}
              max={100}
              step={1}
              className="flex-1 [&>span:first-child]:bg-[#eaf0ff] [&>span:first-child]:h-1.5 [&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5 [&_[role=slider]]:border-[#174be8] [&_[role=slider]]:bg-white [&>span:first-child_span]:bg-[#174be8]"
            />
            <span className="text-xs font-medium text-[#07142f] w-7 text-right">{minScore}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1 min-w-[120px]">
          <label className="text-[11px] text-[#526078] flex items-center gap-1">
            Tier
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help text-[#8794ab]"><Info size={11} /></span>
              </TooltipTrigger>
              <TooltipContent className="max-w-[280px] text-xs leading-relaxed">
                Tiers are assigned by <b>absolute Total Score</b>, same as school grades:
                <br />
                <b>Tier A = 90–100</b>, <b>Tier B = 80–89</b>,{" "}
                <b>Tier C = 70–79</b>, <b>Tier D = below 70</b>.
                <br />
                Because each cutoff is a fixed score, tier counts respond to weight changes — a stronger preset can push cities up a tier.
              </TooltipContent>
            </Tooltip>
          </label>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="h-9 bg-white border-[#e5eaf2] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="A">Tier A — 90–100</SelectItem>
              <SelectItem value="B">Tier B — 80–89</SelectItem>
              <SelectItem value="C">Tier C — 70–79</SelectItem>
              <SelectItem value="D">Tier D — below 70</SelectItem>

            </SelectContent>
          </Select>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <label className="flex items-center gap-2 h-9 cursor-pointer">
              <Checkbox
                checked={nonRegOnly}
                onCheckedChange={(v) => {
                  const on = !!v;
                  setNonRegOnly(on);
                  if (on) toast.success("Non-registration state filter applied to available sample data.");
                }}
              />
              <span className="text-xs text-[#14233b] whitespace-nowrap inline-flex items-center gap-1">
                Non-Registration States Only
                <Info size={11} className="text-[#8794ab]" />
              </span>
            </label>
          </TooltipTrigger>
          <TooltipContent className="max-w-[280px] text-xs">
            Franchise registration states require extra legal filings. Check this to only see states where you can sell franchises without state registration.
          </TooltipContent>
        </Tooltip>
        <div className="ml-auto h-9 flex items-end">
          <Button
            variant="outline"
            className="h-9 border-[#e5eaf2] text-[#14233b] gap-1.5 font-normal"
            disabled={refreshingMarket}
            onClick={onRefreshData}
          >
            <RefreshCw size={14} className={refreshingMarket ? "animate-spin" : ""} />
            {refreshingMarket ? "Refreshing..." : "Refresh Data"}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
