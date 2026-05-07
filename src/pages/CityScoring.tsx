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
import { MarketDetailDrawer } from "@/components/city-scoring/MarketDetailDrawer";
import { MarketCompareModal } from "@/components/city-scoring/MarketCompareModal";
import { MarketReportModal } from "@/components/city-scoring/MarketReportModal";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  const [refreshingMarket, setRefreshingMarket] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

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
    setSelectedForCompare((p) => {
      if (p.includes(id)) return p.filter((i) => i !== id);
      if (p.length >= 4) {
        toast.error("You can compare up to 4 markets at a time");
        return p;
      }
      return [...p, id];
    });
  };

  const buildCsvDownload = () => {
    const rows = [
      ["Rank", "Market", "State", "Tier", "Composite Score", "Population", "Competitors"],
      ...filtered.map((c, i) => [String(i + 1), c.city, c.state, c.tier, String(c.compositeScore), String(c.population), String(c.competitorCount)]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ranked-markets-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Ranked markets exported as CSV");
  };

  const openCompare = () => {
    if (selectedForCompare.length < 2) {
      toast.error("Select at least 2 markets to compare");
      return;
    }
    setCompareOpen(true);
  };

  const applyWeights = () => {
    if (totalWeight !== 100) return;
    toast.success("Sample scores recalculated.");
  };

  const handleFindTeachers = () => {
    navigate(`/teacher-prospects?city=${encodeURIComponent(selected.city)}&state=${encodeURIComponent(selected.state)}`);
  };

  const handleRefreshData = async () => {
    if (!selected) return;
    setRefreshingMarket(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-city-market-data", {
        body: { city: selected.city, state: selected.state },
      });
      if (error) {
        toast.error("Refresh failed", { description: error.message });
        return;
      }
      toast.success("Market data refreshed", {
        description: `${selected.city}, ${selected.state} updated with POC database rows.`,
      });
      console.log("fetch-city-market-data response", data);
    } catch (err) {
      toast.error("Refresh failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setRefreshingMarket(false);
    }
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
        <Button variant="outline" className="h-10 border-[#e5eaf2] text-[#14233b] gap-2 font-normal" onClick={buildCsvDownload}>
          <Download size={15} /> Export Source Data
        </Button>
        <Button className="h-10 bg-[#174be8] hover:bg-[#1240c9] text-white gap-2 font-medium" onClick={() => setReportOpen(true)}>
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
        <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-sm font-bold text-[#07142f]">Scoring Weights</h3>
            <span className="text-xs text-[#526078]">Total Weight: <span className={totalWeight === 100 ? "text-[#0ea66e] font-medium" : "text-[#ea580c] font-medium"}>{totalWeight}%</span></span>
            {totalWeight !== 100 && (
              <span className="text-[11px] text-[#ea580c]">Weights must total 100% to apply scoring.</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={resetWeights} className="text-xs font-medium text-[#174be8] hover:underline">Reset to Default</button>
            <Button
              size="sm"
              disabled={totalWeight !== 100}
              onClick={applyWeights}
              className="h-7 bg-[#174be8] hover:bg-[#1240c9] text-white text-[11px] px-3 disabled:opacity-50"
            >
              Apply Weights
            </Button>
          </div>
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
          <Checkbox
            checked={nonRegOnly}
            onCheckedChange={(v) => {
              const on = !!v;
              setNonRegOnly(on);
              if (on) toast.success("Non-registration state filter applied to available sample data.");
            }}
          />
          <span className="text-xs text-[#14233b] whitespace-nowrap">Non-Registration States Only</span>
        </label>
        <div className="ml-auto h-9 flex items-end">
          <Button
            variant="outline"
            className="h-9 border-[#e5eaf2] text-[#14233b] gap-1.5 font-normal"
            onClick={() => toast.success("Sample data refreshed. Live source refresh will be connected later.")}
          >
            <RefreshCw size={14} /> Refresh Data
          </Button>
        </div>
      </div>

      {/* Three-column layout */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.1fr_1.35fr_0.78fr] items-stretch">
        {/* Left: Ranked Markets */}
        <div className="min-w-0 rounded-lg bg-white border border-[#eef2f7] p-3 flex flex-col">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#07142f]">Ranked Markets</h3>
              <p className="text-[11px] text-[#8794ab]">({filtered.length} markets found)</p>
            </div>
            <button
              onClick={openCompare}
              disabled={selectedForCompare.length < 2}
              className="flex items-center gap-1 text-xs font-medium text-[#174be8] hover:underline disabled:text-[#8794ab] disabled:no-underline disabled:cursor-not-allowed"
            >
              <GitCompare size={12} /> Compare ({selectedForCompare.length})
            </button>
          </div>
          {compareMode && (
            <div className="mb-2 rounded-md bg-[#eaf0ff] border border-[#cfdcff] px-2 py-1.5 text-[11px] text-[#174be8]">
              Compare mode on — select 2 to 4 markets, then click Compare.
            </div>
          )}
          <div className="overflow-hidden flex-1">
            <div className="grid grid-cols-[16px_14px_minmax(0,1fr)_46px_72px_18px] items-center gap-x-2 px-1 py-2 text-[9.5px] uppercase tracking-wide text-[#8794ab] border-b border-[#eef2f7]">
              <span></span>
              <span>Rank</span>
              <span>Market</span>
              <span>Type</span>
              <span>Score</span>
              <span className="text-right">Tier</span>
            </div>
            {filtered.slice(0, 8).map((c, i) => {
              const isSel = c.id === selectedId;
              const isCmp = selectedForCompare.includes(c.id);
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`grid grid-cols-[16px_14px_minmax(0,1fr)_46px_72px_18px] items-center gap-x-2 px-1 py-3 text-[11px] cursor-pointer border-b border-[#f3f5f9] last:border-0 ${isSel ? "bg-[#eaf0ff]" : "hover:bg-[#f7faff]"}`}
                >
                  <span className={compareMode ? "rounded ring-2 ring-[#174be8] ring-offset-1 ring-offset-white" : ""}>
                    <Checkbox checked={isCmp} onCheckedChange={() => toggleCompare(c.id)} onClick={(e) => e.stopPropagation()} />
                  </span>
                  <span className="text-[#526078]">{i + 1}</span>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-[#07142f]">{c.city}, {c.state === "Texas" ? "TX" : c.state === "Florida" ? "FL" : c.state}</div>
                    <div className="truncate text-[10px] text-[#8794ab]">{c.population > 200000 ? "Travis County" : "Collin County"}</div>
                  </div>
                  <span className="inline-block self-center w-fit rounded-full bg-[#eaf0ff] text-[#174be8] text-[9.5px] font-medium px-1.5 py-0.5">
                    {c.population > 200000 ? "Metro" : "Suburb"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#07142f] font-semibold tabular-nums">{c.compositeScore}</span>
                    <div className="h-1.5 flex-1 rounded-full bg-[#eef2f7]">
                      <div className="h-full rounded-full bg-[#0ea66e]" style={{ width: `${c.compositeScore}%` }} />
                    </div>
                  </div>
                  <span className={`justify-self-end flex items-center justify-center rounded-full text-[10px] font-bold text-white`} style={{ width: 20, height: 20, backgroundColor: c.tier === "A" ? "#0ea66e" : c.tier === "B" ? "#174be8" : c.tier === "C" ? "#b8860b" : "#ea580c" }}>{c.tier}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-[#8794ab]">
            <span>Showing 1 to {Math.min(filtered.length, 8)} of 238 results</span>
            <div className="flex items-center gap-1">
              <button className="px-1.5 h-6 rounded border border-[#eef2f7] text-[#526078]">‹</button>
              <button className="px-2 h-6 rounded bg-[#174be8] text-white font-medium">1</button>
              <button className="px-2 h-6 rounded border border-[#eef2f7] text-[#14233b]">2</button>
              <button className="px-2 h-6 rounded border border-[#eef2f7] text-[#14233b]">3</button>
              <span className="px-1 text-[#8794ab]">…</span>
              <button className="px-2 h-6 rounded border border-[#eef2f7] text-[#14233b]">30</button>
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

          <div className="grid grid-cols-[150px_1fr] gap-3 items-start">
            <div className="flex flex-col items-center text-center pt-1">
              <p className="mb-1.5 text-[12px] font-semibold text-[#3a4c72]">Overall Score</p>
              <svg viewBox="0 0 200 120" className="h-[100px] w-[150px] max-w-full">
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
              <p className="-mt-1 text-[12px] font-semibold text-[#0ea66e]">Excellent Opportunity</p>
            </div>

            <div className="space-y-2.5 pt-1 min-w-0">
              <div className="text-[11px] space-y-1.5 min-w-0">
                <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-[#6b7a96]">Tier</span>
                    <span className="rounded-full bg-[#e6f7ef] px-2 py-0.5 text-[10.5px] font-semibold leading-tight text-[#0ea66e]">{selected.tier} (Tier 1)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#6b7a96]">Market Type</span>
                    <span className="rounded-full bg-[#eef3ff] px-2 py-0.5 text-[10.5px] font-medium leading-tight text-[#174be8]">Suburb</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[#6b7a96] w-[78px] flex-shrink-0">Metro Area</span>
                  <span className="font-semibold text-[#07142f]">Dallas-Fort Worth, TX</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[#6b7a96] w-[78px] flex-shrink-0">County</span>
                  <span className="font-semibold text-[#07142f]">Collin County</span>
                </div>
              </div>

              <div>
                <p className="mb-0.5 text-[12px] font-semibold text-[#3a4c72]">Market Summary</p>
                <p className="text-[11.5px] leading-snug text-[#14233b]">Affluent, rapidly growing suburb with strong demand for premium youth education and enrichment programs.</p>
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

            <div className="min-w-0 border-l border-[#eef2f7] pl-4">
              <p className="mb-2.5 text-[13px] font-semibold text-[#07142f]">Key Market Signals</p>
              <div className="flex flex-col gap-y-2.5 min-w-0">
                {sigRows.map((r) => {
                  const Icon = r.icon;
                  return (
                    <div key={r.label} className="flex items-start gap-2 text-[10.5px] min-w-0">
                      <Icon size={12} className="text-[#3160ff] flex-shrink-0 mt-0.5" />
                      <span className="text-[#526078] leading-tight flex-1 min-w-0 truncate">{r.label}</span>
                      <div className="flex flex-col items-end flex-shrink-0 leading-tight">
                        <span className="font-semibold text-[#07142f] tabular-nums">{r.value}</span>
                        <span className={`text-[9.5px] font-medium ${r.deltaClass}`}>{r.delta}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={handleFindTeachers} className="h-9 flex-1 min-w-0 bg-[#174be8] hover:bg-[#1240c9] text-white gap-1.5 px-3 font-medium text-[11px]">
              <span className="truncate">Find Teachers in This Market</span> <ArrowRight size={12} className="flex-shrink-0" />
            </Button>
            <Button variant="outline" onClick={openCompare} className="h-9 min-w-0 border-[#dbe4f2] text-[#2250eb] gap-1 px-2.5 font-medium text-[11px]">
              <GitCompare size={12} /> Compare
            </Button>
            <Button variant="outline" onClick={() => setReportOpen(true)} className="h-9 min-w-0 border-[#dbe4f2] text-[#2250eb] gap-1 px-2.5 font-medium text-[11px]">
              <FileText size={12} /> Report
            </Button>
            <Button variant="outline" className="h-9 min-w-0 border-[#dbe4f2] text-[#2250eb] gap-1 px-2.5 font-medium text-[11px]" onClick={() => setDetailDrawerOpen(true)}>
              <Eye size={12} /> Details
            </Button>
          </div>
        </div>

        {/* Right column */}
        <div className="min-w-0 space-y-3 flex flex-col">
          {showNearby && (
            <div className="rounded-lg bg-white border border-[#eef2f7] p-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-[13px] font-semibold text-[#07142f]">Nearby Markets</h4>
                <button className="text-[10px] font-medium text-[#174be8] hover:underline">View All</button>
              </div>
              <div className="space-y-2">
                {NEARBY_MARKETS.map((m) => (
                  <div key={m.name} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="flex min-w-0 items-center gap-1.5 text-[#14233b]"><MapPin size={11} className="flex-shrink-0 text-[#8794ab]" /> <span className="truncate">{m.name}</span></span>
                    <span className="inline-flex items-center justify-center min-w-[28px] h-5 rounded-md bg-[#e6f7ef] text-[#0ea66e] text-[10.5px] font-bold px-1.5">{m.score}</span>
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
            <Button variant="outline" className="w-full h-8 border-[#dbe4f2] text-[#2250eb] text-[11px] font-medium" onClick={() => setReportOpen(true)}>
              Generate PDF Report
            </Button>
          </div>

          <div className="rounded-lg bg-white border border-[#eef2f7] p-3 flex-1">
            <h4 className="text-xs font-bold text-[#07142f] mb-2">Market Snapshot</h4>
            <div className="grid grid-cols-[1fr_auto] gap-3 items-center">
              <div
                className="relative h-24 rounded border border-[#eef2f7] overflow-hidden"
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
              <div className="space-y-1.5 text-[10px] text-[#14233b] whitespace-nowrap">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#174be8]" /> Selected Market</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#0ea66e]" /> Nearby Markets</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#e11d48]" /> Higher Competition</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddCriteriaDrawer
        open={addCritOpen}
        onClose={() => setAddCritOpen(false)}
        onSave={(c) => setCustomCriteria((prev) => [...prev, c])}
      />

      <MarketDetailDrawer
        market={selected}
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        categoryScores={detailCategoryScores}
        customCriteria={customCriteria}
        onFindTeachers={() => { setDetailDrawerOpen(false); handleFindTeachers(); }}
        onGenerateReport={() => { setDetailDrawerOpen(false); setReportOpen(true); }}
        onExport={buildCsvDownload}
      />

      <MarketCompareModal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        markets={sampleCities.filter((c) => selectedForCompare.includes(c.id)).slice(0, 4)}
      />

      <MarketReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        market={selected}
        categoryScores={detailCategoryScores}
      />
    </div>
  );
};

export default CityScoring;
