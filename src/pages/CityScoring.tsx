import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Bell, HelpCircle, ChevronDown, LogOut, Settings, Search, Download, FileText,
  Plus, RefreshCw, ArrowRight, GitCompare, Eye, Star, Users, DollarSign,
  Trophy, UserCheck, Cog, Heart, MapPin, Building2, GraduationCap, Home as HomeIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { sampleCities, CityData } from "@/data/cityData";
import { AddCriteriaDrawer } from "@/components/city-scoring/AddCriteriaDrawer";
import { CityDetailDrawer } from "@/components/city-scoring/CityDetailDrawer";
import { toast } from "sonner";

type CategoryKey =
  | "demand"
  | "pricingPower"
  | "competitiveLandscape"
  | "franchiseeSupply"
  | "easeOfOperations"
  | "parentMindset";

interface Category {
  key: CategoryKey;
  label: string;
  icon: typeof Users;
  color: string;
  bg: string;
  description: string;
  defaultWeight: number;
}

const CATEGORIES: Category[] = [
  { key: "demand", label: "Demand", icon: Users, color: "#174be8", bg: "#eaf0ff",
    description: "Measures size of target families and program demand.", defaultWeight: 25 },
  { key: "pricingPower", label: "Pricing Power", icon: DollarSign, color: "#0ea66e", bg: "#e6f7ef",
    description: "Measures ability to sustain premium pricing.", defaultWeight: 20 },
  { key: "competitiveLandscape", label: "Competitive Landscape", icon: Trophy, color: "#b8860b", bg: "#fff6dc",
    description: "Measures level of competition and market saturation.", defaultWeight: 20 },
  { key: "franchiseeSupply", label: "Franchisee Supply", icon: UserCheck, color: "#7c3aed", bg: "#f1ebff",
    description: "Measures availability and quality of teacher-operators.", defaultWeight: 15 },
  { key: "easeOfOperations", label: "Ease of Operations", icon: Cog, color: "#ea580c", bg: "#ffeede",
    description: "Measures operational complexity and real estate access.", defaultWeight: 10 },
  { key: "parentMindset", label: "Parent Mindset Indicators", icon: Heart, color: "#e11d48", bg: "#ffe4ea",
    description: "Measures education priorities and willingness to invest.", defaultWeight: 10 },
];

// Map mock data scoreBreakdown into our 6 category scores deterministically
function categoryScores(c: CityData): Record<CategoryKey, number> {
  const b = c.scoreBreakdown;
  return {
    demand: b.summerCampDemand,
    pricingPower: Math.round((b.dualIncomeFamilies + (c.medianIncome > 90000 ? 10 : 0)) * 0.95),
    competitiveLandscape: b.competitionScore,
    franchiseeSupply: Math.round((b.stemJobs + b.schoolDensity) / 2),
    easeOfOperations: Math.round((b.schoolDensity + b.dualIncomeFamilies) / 2),
    parentMindset: Math.round((b.childPopulation + b.dualIncomeFamilies) / 2),
  };
}

const NEARBY_MARKETS = [
  { name: "Prosper, TX (USD)", score: 87 },
  { name: "McKinney, TX (ISD)", score: 86 },
  { name: "Allen, TX (ISD)", score: 85 },
  { name: "Little Elm, TX", score: 82 },
  { name: "The Colony, TX", score: 80 },
];

const SOURCES = [
  { name: "U.S. Census Bureau", icon: Building2 },
  { name: "BLS (Occupational Data)", icon: Building2 },
  { name: "Google Trends", icon: Search },
  { name: "Yelp / Google Maps", icon: MapPin },
  { name: "GreatSchools.org", icon: GraduationCap },
  { name: "State Education Databases", icon: GraduationCap },
  { name: "ACA Camp Regulations", icon: FileText },
  { name: "Internal Franchise Data", icon: HomeIcon },
];

const CityScoring = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, user, role, signOut } = useAuth();

  const displayName = profile?.full_name || profile?.email || user?.email || "Account";
  const initials = (displayName.match(/\b\w/g) || []).slice(0, 1).join("").toUpperCase() || "U";

  const [searchTerm, setSearchTerm] = useState("");
  const [scoringModel, setScoringModel] = useState("Affluent Suburbs Model");
  const [compareMode, setCompareMode] = useState(false);
  const [showNearby, setShowNearby] = useState(true);

  const [stateFilter, setStateFilter] = useState("All");
  const [minPop, setMinPop] = useState("25000");
  const [minScore, setMinScore] = useState(35);
  const [tierFilter, setTierFilter] = useState("All");
  const [nonRegOnly, setNonRegOnly] = useState(false);

  const [weights, setWeights] = useState<Record<CategoryKey, number>>(
    CATEGORIES.reduce((acc, c) => ({ ...acc, [c.key]: c.defaultWeight }), {} as Record<CategoryKey, number>)
  );
  const [customCriteria, setCustomCriteria] = useState<Array<{ name: string; category: string; weight: number; source: string; notes: string }>>([]);
  const [addCritOpen, setAddCritOpen] = useState(false);

  const [selectedId, setSelectedId] = useState<number>(sampleCities[0]?.id ?? 1);
  const [selectedForCompare, setSelectedForCompare] = useState<number[]>([]);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);

  // Open city via global search ?city=ID
  useEffect(() => {
    const id = searchParams.get("city");
    if (id) {
      const found = sampleCities.find((c) => c.id === Number(id));
      if (found) setSelectedId(found.id);
      searchParams.delete("city");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return sampleCities.filter((c) => {
      if (searchTerm && !`${c.city} ${c.state}`.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (stateFilter !== "All" && c.state !== stateFilter) return false;
      if (tierFilter !== "All" && c.tier !== tierFilter) return false;
      if (nonRegOnly && !c.isNonRegistration) return false;
      if (c.compositeScore < minScore) return false;
      if (Number(minPop) && c.population < Number(minPop)) return false;
      return true;
    }).sort((a, b) => b.compositeScore - a.compositeScore);
  }, [searchTerm, stateFilter, tierFilter, nonRegOnly, minScore, minPop]);

  const selected = sampleCities.find((c) => c.id === selectedId) ?? sampleCities[0];

  const totalWeight = Object.values(weights).reduce((s, v) => s + v, 0);

  const resetWeights = () => {
    setWeights(CATEGORIES.reduce((acc, c) => ({ ...acc, [c.key]: c.defaultWeight }), {} as Record<CategoryKey, number>));
    toast.success("Weights reset to defaults");
  };

  const toggleCompare = (id: number) => {
    setSelectedForCompare((p) => p.includes(id) ? p.filter((i) => i !== id) : [...p, id]);
  };

  const handleFindTeachers = () => {
    navigate(`/teacher-prospects?city=${encodeURIComponent(selected.city)}&state=${encodeURIComponent(selected.state)}`);
  };

  const handleLogout = async () => { await signOut(); navigate("/auth", { replace: true }); };

  const cs = categoryScores(selected);
  const isFriscoMock = selected.city === "Frisco" && selected.state === "Texas";
  const detailScore = isFriscoMock ? 91 : selected.compositeScore;
  const detailCategoryScores = isFriscoMock
    ? {
        demand: 92,
        pricingPower: 90,
        competitiveLandscape: 76,
        franchiseeSupply: 83,
        easeOfOperations: 85,
        parentMindset: 84,
      }
    : cs;

  const sigRows = isFriscoMock
    ? [
        { icon: Users, label: "Children Ages 5-12", value: "19,842", delta: "+12% vs. nat. avg.", deltaClass: "text-[#8ad1a8]" },
        { icon: HomeIcon, label: "Households ($100k+)", value: "46%", delta: "+15% vs. nat. avg.", deltaClass: "text-[#8ad1a8]" },
        { icon: DollarSign, label: "Premium Camp Pricing", value: "$245 / week", delta: "+8%", deltaClass: "text-[#8ad1a8]" },
        { icon: GraduationCap, label: "Teacher Density", value: "1:475", delta: "20% below nat-avg kts", deltaClass: "text-[#8794ab]" },
        { icon: Building2, label: "School District Access", value: "High", delta: "Strong availability", deltaClass: "text-[#8794ab]" },
        { icon: Star, label: "Millennial Density", value: "42%", delta: "+16% vs. avg.", deltaClass: "text-[#8ad1a8]" },
      ]
    : [
        { icon: Users, label: "Children Ages 5-12", value: "19,842", delta: "+12% vs. nat. avg.", deltaClass: "text-[#8ad1a8]" },
        { icon: HomeIcon, label: "Households ($100k+)", value: "46%", delta: "+15% vs. nat. avg.", deltaClass: "text-[#8ad1a8]" },
        { icon: DollarSign, label: "Premium Camp Pricing", value: "$245 / week", delta: "+8%", deltaClass: "text-[#8ad1a8]" },
        { icon: GraduationCap, label: "Teacher Density", value: "1:475", delta: "20% below nat-avg kts", deltaClass: "text-[#8794ab]" },
        { icon: Building2, label: "School District Access", value: "High", delta: "Strong availability", deltaClass: "text-[#8794ab]" },
        { icon: Star, label: "Millennial Density", value: "42%", delta: "+16% vs. avg.", deltaClass: "text-[#8ad1a8]" },
      ];

  return (
    <div className="-mx-3 md:-mx-5 lg:-mx-6 -my-3 px-3 md:px-5 lg:px-6 py-3 min-h-screen bg-white">
      {/* Top header: search + actions + notification/help/avatar */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-[680px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8794ab]" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search city, suburb, metro, or school district…"
            className="pl-9 h-10 bg-white border-[#e5eaf2] text-sm"
          />
        </div>
        <Button variant="outline" className="h-10 border-[#e5eaf2] text-[#14233b] gap-2 font-normal">
          <Download size={15} /> Export Source Data
        </Button>
        <Button className="h-10 bg-[#174be8] hover:bg-[#1240c9] text-white gap-2 font-medium">
          <FileText size={15} /> Generate Market Report
        </Button>
        <button
          type="button"
          className="relative flex items-center justify-center rounded-full bg-white text-[#526078] hover:bg-[#f3f6fb]"
          aria-label="Notifications"
          style={{ width: 36, height: 36, border: "1px solid #eef2f7" }}
        >
          <Bell size={16} strokeWidth={1.75} />
          <span className="absolute -right-0.5 -top-0.5 flex items-center justify-center rounded-full bg-[#e11d48] text-[9px] font-bold text-white" style={{ width: 14, height: 14 }}>3</span>
        </button>
        <button
          className="flex items-center justify-center rounded-full bg-white text-[#526078] hover:bg-[#f3f6fb]"
          style={{ width: 36, height: 36, border: "1px solid #eef2f7" }}
        >
          <HelpCircle size={16} strokeWidth={1.75} />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full px-1 py-0.5 hover:bg-[#f7faff]">
              <span className="flex items-center justify-center rounded-full bg-[#174be8] text-sm font-bold text-white" style={{ width: 34, height: 34 }}>{initials}</span>
              <span className="hidden text-left md:block">
                <span className="block text-[13px] font-bold leading-4 text-[#07142f]">{displayName.split("@")[0]}</span>
                {role && <span className="block text-[10px] uppercase leading-3 tracking-wide text-[#526078]">{role}</span>}
              </span>
              <ChevronDown className="hidden h-4 w-4 text-[#526078] md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium truncate">{displayName}</span>
                {(profile?.email || user?.email) && (
                  <span className="text-xs text-muted-foreground truncate">{profile?.email || user?.email}</span>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {role === "admin" && (
              <>
                <DropdownMenuItem onClick={() => navigate("/settings/team")}>
                  <Settings className="mr-2 h-4 w-4" /> Team members
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Title row + model controls */}
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-[#07142f]">City Search</h1>
          <p className="text-xs text-[#526078] mt-0.5">
            Discover and score the best cities, suburbs, and metros for Neuron Garage franchises.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={scoringModel} onValueChange={setScoringModel}>
            <SelectTrigger className="h-9 w-[210px] bg-white border-[#e5eaf2] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Affluent Suburbs Model">Affluent Suburbs Model</SelectItem>
              <SelectItem value="Urban Core Model">Urban Core Model</SelectItem>
              <SelectItem value="Emerging Markets Model">Emerging Markets Model</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="h-9 border-[#e5eaf2] text-[#14233b] gap-1.5 font-normal" onClick={() => setAddCritOpen(true)}>
            <Plus size={14} /> Add Criteria
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#14233b]">Compare Mode</span>
            <Switch checked={compareMode} onCheckedChange={setCompareMode} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#14233b]">Show nearby markets</span>
            <Switch checked={showNearby} onCheckedChange={setShowNearby} />
          </div>
        </div>
      </div>

      {/* Scoring Weights */}
      <div className="mb-4 rounded-lg bg-white border border-[#eef2f7] p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-[#07142f]">Scoring Weights</h3>
            <span className="text-xs text-[#526078]">Total Weight: <span className={totalWeight === 100 ? "text-[#0ea66e] font-medium" : "text-[#ea580c] font-medium"}>{totalWeight}%</span></span>
          </div>
          <button onClick={resetWeights} className="text-xs font-medium text-[#174be8] hover:underline">Reset to Default</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const customCount = customCriteria.filter((c) => c.category === cat.label).length;
            return (
              <div key={cat.key} className="rounded-lg border border-[#eef2f7] bg-white p-3 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: 28, height: 28, backgroundColor: cat.bg }}>
                      <Icon size={15} style={{ color: cat.color }} />
                    </span>
                    <span className="text-[12.5px] font-semibold text-[#07142f] leading-tight">{cat.label}</span>
                  </div>
                </div>
                <div className="text-right text-base font-bold text-[#07142f]">{weights[cat.key]}%</div>
                <Slider
                  value={[weights[cat.key]]}
                  onValueChange={([v]) => setWeights((w) => ({ ...w, [cat.key]: v }))}
                  max={50}
                  step={1}
                  className="[&>span:first-child]:bg-[#eaf0ff] [&>span:first-child]:h-1.5 [&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5 [&_[role=slider]]:border-[#174be8] [&_[role=slider]]:bg-white [&>span:first-child_span]:bg-[#174be8]"
                />
                <p className="text-[11px] text-[#8794ab] leading-snug">{cat.description}</p>
                {customCount > 0 && (
                  <p className="text-[10px] text-[#174be8] font-medium">+{customCount} custom metric{customCount > 1 ? "s" : ""}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters row */}
      <div className="mb-4 rounded-lg bg-white border border-[#eef2f7] p-3 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1 min-w-[140px]">
          <label className="text-[11px] text-[#526078]">State</label>
          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="h-9 bg-white border-[#e5eaf2] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All States</SelectItem>
              <SelectItem value="Texas">Texas</SelectItem>
              <SelectItem value="Florida">Florida</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1 min-w-[140px]">
          <label className="text-[11px] text-[#526078]">Min Population</label>
          <Select value={minPop} onValueChange={setMinPop}>
            <SelectTrigger className="h-9 bg-white border-[#e5eaf2] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Any</SelectItem>
              <SelectItem value="25000">25,000+</SelectItem>
              <SelectItem value="50000">50,000+</SelectItem>
              <SelectItem value="100000">100,000+</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1 min-w-[180px] flex-1 max-w-[260px]">
          <label className="text-[11px] text-[#526078]">Min Score</label>
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
          <label className="text-[11px] text-[#526078]">Tier</label>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="h-9 bg-white border-[#e5eaf2] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="A">A</SelectItem>
              <SelectItem value="B">B</SelectItem>
              <SelectItem value="C">C</SelectItem>
              <SelectItem value="D">D</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-2 h-9">
          <Checkbox checked={nonRegOnly} onCheckedChange={(v) => setNonRegOnly(!!v)} />
          <span className="text-xs text-[#14233b] whitespace-nowrap">Non-Registration States Only</span>
        </label>
        <div className="ml-auto h-9 flex items-end">
          <Button variant="outline" className="h-9 border-[#e5eaf2] text-[#14233b] gap-1.5 font-normal" onClick={() => toast.success("Data refreshed")}>
            <RefreshCw size={14} /> Refresh Data
          </Button>
        </div>
      </div>

      {/* Three-column layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.5fr_0.85fr] items-stretch">
        {/* Left: Ranked Markets */}
        <div className="min-w-0 rounded-lg bg-white border border-[#eef2f7] p-3 flex flex-col">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#07142f]">Ranked Markets</h3>
              <p className="text-[11px] text-[#8794ab]">({filtered.length} markets found)</p>
            </div>
            <button className="flex items-center gap-1 text-xs font-medium text-[#174be8] hover:underline">
              <GitCompare size={12} /> Compare ({selectedForCompare.length})
            </button>
          </div>
          <div className="overflow-hidden">
            <div className="grid grid-cols-[18px_22px_minmax(0,1fr)_56px_78px_24px] items-center gap-2 px-2 py-1.5 text-[10px] uppercase tracking-wide text-[#8794ab] border-b border-[#eef2f7]">
              <span></span>
              <span>Rank</span>
              <span>Market</span>
              <span>Type</span>
              <span>Score</span>
              <span>Tier</span>
            </div>
            {filtered.map((c, i) => {
              const isSel = c.id === selectedId;
              const isCmp = selectedForCompare.includes(c.id);
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`grid grid-cols-[18px_22px_minmax(0,1fr)_56px_78px_24px] items-center gap-2 px-2 py-2 text-xs cursor-pointer border-b border-[#f3f5f9] last:border-0 ${isSel ? "bg-[#eaf0ff]" : "hover:bg-[#f7faff]"}`}
                >
                  <Checkbox checked={isCmp} onCheckedChange={() => toggleCompare(c.id)} onClick={(e) => e.stopPropagation()} />
                  <span className="text-[#526078]">{i + 1}</span>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-[#07142f]">{c.city}, {c.state === "Texas" ? "TX" : c.state === "Florida" ? "FL" : c.state}</div>
                    <div className="truncate text-[10px] text-[#8794ab]">{c.population > 200000 ? "Travis County" : "Collin County"}</div>
                  </div>
                  <span className="inline-block self-center w-fit rounded-full bg-[#eaf0ff] text-[#174be8] text-[10px] font-medium px-1.5 py-0.5">
                    {c.population > 200000 ? "Metro" : "Suburb"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#07142f] font-semibold">{c.compositeScore}</span>
                    <div className="h-1.5 w-12 rounded-full bg-[#eef2f7]">
                      <div className="h-full rounded-full bg-[#0ea66e]" style={{ width: `${c.compositeScore}%` }} />
                    </div>
                  </div>
                  <span className={`flex items-center justify-center rounded-full text-[10px] font-bold text-white`} style={{ width: 18, height: 18, backgroundColor: c.tier === "A" ? "#0ea66e" : c.tier === "B" ? "#174be8" : c.tier === "C" ? "#b8860b" : "#ea580c" }}>{c.tier}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-[#8794ab]">
            <span>Showing 1 to {Math.min(filtered.length, 25)} of 238 results</span>
            <div className="flex items-center gap-1">
              <button className="px-1.5 h-6 rounded border border-[#eef2f7] text-[#526078]">‹</button>
              <button className="px-2 h-6 rounded bg-[#174be8] text-white font-medium">1</button>
              <button className="px-2 h-6 rounded border border-[#eef2f7] text-[#14233b]">2</button>
              <button className="px-2 h-6 rounded border border-[#eef2f7] text-[#14233b]">3</button>
              <span className="px-1 text-[#8794ab]">…</span>
              <button className="px-2 h-6 rounded border border-[#eef2f7] text-[#14233b]">10</button>
              <button className="px-1.5 h-6 rounded border border-[#eef2f7] text-[#526078]">›</button>
            </div>
          </div>
        </div>

        {/* Center: Selected Market Detail */}
        <div className="min-w-0 rounded-lg bg-white border border-[#eef2f7] p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <h2 className="text-[18px] leading-none font-bold text-[#07142f]">{selected.city}, {selected.state === "Texas" ? "TX" : selected.state === "Florida" ? "FL" : selected.state}</h2>
            <button className="flex items-center gap-1 text-[11px] font-medium text-[#174be8] hover:underline whitespace-nowrap">
              <Star size={12} /> Add to Watchlist
            </button>
          </div>

          <div className="grid grid-cols-[176px_1fr] gap-4 items-start">
            <div className="flex flex-col items-center text-center pt-1">
              <p className="mb-1.5 text-[12px] font-semibold text-[#3a4c72]">Overall Score</p>
              <svg viewBox="0 0 200 120" className="h-[116px] w-[176px] max-w-full">
                <path d="M25 92 A75 75 0 0 1 175 92" fill="none" stroke="#e7ebf3" strokeWidth="14" strokeLinecap="round" />
                <path
                  d="M25 92 A75 75 0 0 1 175 92"
                  fill="none"
                  stroke="#0ea66e"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={`${(detailScore / 100) * 236} 236`}
                />
                <text x="100" y="76" textAnchor="middle" className="fill-[#07142f]" style={{ fontSize: 32, fontWeight: 800 }}>{detailScore}</text>
                <text x="100" y="102" textAnchor="middle" className="fill-[#7e8aa3]" style={{ fontSize: 12, fontWeight: 600 }}>/100</text>
              </svg>
              <p className="-mt-2 text-[14px] font-semibold text-[#0ea66e]">Excellent Opportunity</p>
            </div>

            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-x-5 gap-y-3 text-[11px]">
                <div className="space-y-3">
                  <div className="grid grid-cols-[70px_1fr] items-center gap-3">
                    <span className="text-[#6b7a96]">Tier</span>
                    <span className="w-fit rounded-full bg-[#e6f7ef] px-2.5 py-1 text-[11px] font-semibold leading-none text-[#0ea66e]">{selected.tier} (Tier 1)</span>
                  </div>
                  <div className="grid grid-cols-[70px_1fr] items-start gap-3">
                    <span className="pt-0.5 text-[#6b7a96]">Metro Area</span>
                    <span className="font-semibold leading-5 text-[#07142f]">Dallas-Fort Worth, TX</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-[84px_1fr] items-center gap-3">
                    <span className="text-[#6b7a96]">Market Type</span>
                    <span className="w-fit rounded-full bg-[#eef3ff] px-2.5 py-1 text-[11px] font-medium leading-none text-[#174be8]">Suburb</span>
                  </div>
                  <div className="grid grid-cols-[52px_1fr] items-start gap-3">
                    <span className="pt-0.5 text-[#6b7a96]">County</span>
                    <span className="font-semibold leading-5 text-[#07142f]">Collin County</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-1 text-[12px] font-semibold text-[#3a4c72]">Market Summary</p>
                <p className="max-w-[420px] text-[12px] leading-5 text-[#14233b]">Affluent, rapidly growing suburb with strong demand for premium youth education and enrichment programs.</p>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-[1fr_1.08fr] gap-5 border-t border-[#eef2f7] pt-3.5">
            <div>
              <p className="mb-2.5 text-[13px] font-semibold text-[#07142f]">Category Scores</p>
              <div className="space-y-2">
                {CATEGORIES.map((cat) => (
                  <div key={cat.key}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-[12px]">
                      <span className="text-[#526078]">{cat.label}</span>
                      <span className="font-semibold text-[#07142f]">{detailCategoryScores[cat.key]}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#e8edf6]">
                      <div className="h-full rounded-full bg-[#1d4fff]" style={{ width: `${detailCategoryScores[cat.key]}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-l border-[#eef2f7] pl-5">
              <p className="mb-2.5 text-[13px] font-semibold text-[#07142f]">Key Market Signals</p>
              <div className="grid grid-cols-1 gap-y-2">
                {sigRows.map((r) => {
                  const Icon = r.icon;
                  return (
                    <div key={r.label} className="grid grid-cols-[16px_minmax(0,1.3fr)_auto_minmax(0,1.1fr)] items-center gap-x-2.5 text-[11px]">
                      <Icon size={13} className="text-[#3160ff] flex-shrink-0" />
                      <span className="text-[#526078] leading-tight truncate">{r.label}</span>
                      <span className="font-semibold text-[#07142f] tabular-nums whitespace-nowrap text-right">{r.value}</span>
                      <span className={`whitespace-nowrap text-right text-[10.5px] font-medium ${r.deltaClass}`}>{r.delta}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-[1.5fr_0.78fr_1.05fr_1.1fr] gap-2">
            <Button onClick={handleFindTeachers} className="h-9 min-w-0 bg-[#174be8] hover:bg-[#1240c9] text-white gap-1.5 px-2 font-medium text-[10.5px] whitespace-nowrap">
              Find Teachers in This Market <ArrowRight size={12} />
            </Button>
            <Button variant="outline" className="h-9 min-w-0 border-[#dbe4f2] text-[#2250eb] gap-1 px-2 font-medium text-[10.5px] whitespace-nowrap">
              <GitCompare size={12} /> Compare
            </Button>
            <Button variant="outline" className="h-9 min-w-0 border-[#dbe4f2] text-[#2250eb] gap-1 px-2 font-medium text-[10.5px] whitespace-nowrap">
              <FileText size={12} /> Generate Report
            </Button>
            <Button variant="outline" className="h-9 min-w-0 border-[#dbe4f2] text-[#2250eb] gap-1 px-2 font-medium text-[10.5px] whitespace-nowrap" onClick={() => setDetailDrawerOpen(true)}>
              <Eye size={12} /> View Full Details
            </Button>
          </div>
        </div>

        {/* Right column */}
        <div className="min-w-0 space-y-3 flex flex-col">
          {showNearby && (
            <div className="rounded-lg bg-white border border-[#eef2f7] p-3 self-start">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-[13px] font-semibold text-[#07142f]">Nearby Markets</h4>
                <button className="text-[10px] font-medium text-[#174be8] hover:underline">View All</button>
              </div>
              <div className="space-y-2">
                {NEARBY_MARKETS.map((m) => (
                  <div key={m.name} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="flex min-w-0 items-center gap-1.5 text-[#14233b]"><MapPin size={11} className="flex-shrink-0 text-[#8794ab]" /> <span className="truncate">{m.name}</span></span>
                    <span className="font-semibold text-[#07142f]">{m.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg bg-white border border-[#eef2f7] p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-[#07142f]">Source Data</h4>
              <button className="text-[10px] font-medium text-[#174be8] hover:underline">View All</button>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {SOURCES.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.name} className="flex items-center gap-1.5 text-[11px] text-[#14233b]">
                    <Icon size={11} className="text-[#8794ab] flex-shrink-0" />
                    <span className="truncate">{s.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg bg-white border border-[#eef2f7] p-3">
            <h4 className="text-xs font-bold text-[#07142f] mb-1">Market Research Report</h4>
            <p className="text-[10px] text-[#8794ab] mb-2">Comprehensive PDF report with data, insights, recommendations, and competitor analysis.</p>
            <Button variant="outline" className="w-full h-8 border-[#dbe4f2] text-[#2250eb] text-[11px] font-medium" onClick={() => toast.success("Generating PDF report…")}>
              Generate PDF Report
            </Button>
          </div>

          <div className="rounded-lg bg-white border border-[#eef2f7] p-3">
            <h4 className="text-xs font-bold text-[#07142f] mb-2">Market Snapshot</h4>
            <div
              className="relative h-28 rounded border border-[#eef2f7] mb-2 overflow-hidden"
              style={{
                backgroundColor: "#f1f6fc",
                backgroundImage:
                  "linear-gradient(to right, #e3ecf7 1px, transparent 1px), linear-gradient(to bottom, #e3ecf7 1px, transparent 1px)",
                backgroundSize: "16px 16px",
              }}
            >
              <MapPin size={16} className="absolute text-[#174be8]" style={{ top: "30%", left: "40%" }} fill="#174be8" />
              <MapPin size={12} className="absolute text-[#0ea66e]" style={{ top: "55%", left: "22%" }} fill="#0ea66e" />
              <MapPin size={12} className="absolute text-[#0ea66e]" style={{ top: "20%", left: "65%" }} fill="#0ea66e" />
              <MapPin size={12} className="absolute text-[#e11d48]" style={{ top: "65%", left: "70%" }} fill="#e11d48" />
            </div>
            <div className="space-y-1 text-[10px] text-[#14233b]">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#174be8]" /> Selected Market</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#0ea66e]" /> Nearby Markets</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#e11d48]" /> Higher Competition</div>
            </div>
          </div>
        </div>
      </div>

      <AddCriteriaDrawer
        open={addCritOpen}
        onClose={() => setAddCritOpen(false)}
        onSave={(c) => setCustomCriteria((prev) => [...prev, c])}
      />

      <CityDetailDrawer city={selected} open={detailDrawerOpen} onClose={() => setDetailDrawerOpen(false)} />
    </div>
  );
};

export default CityScoring;
