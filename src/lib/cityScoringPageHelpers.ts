// Page-level constants and pure helpers extracted from CityScoring.tsx.
// First slice of the long-overdue split of that 3300-line page component.
// Anything stateless that the page imported from itself belongs here so the
// page file can shrink toward a pure composition.
//
// Future moves (separate session): the three render columns
//   - RankedMarketsColumn
//   - SelectedMarketColumn
//   - ExecutiveSummaryColumn
// each currently live as inline JSX inside CityScoring.tsx.

import { Building2, FileText, GraduationCap, Home as HomeIcon, MapPin, Search, Trophy, UserCheck, Users } from "lucide-react";
import type { CityData } from "@/data/cityData";
import type { CategoryKey } from "@/stores/cityScoringStore";

export interface Category {
  key: CategoryKey;
  label: string;
  icon: typeof Users;
  color: string;
  bg: string;
  description: string;
  defaultWeight: number;
}

export const CATEGORIES: Category[] = [
  { key: "demand", label: "Demand", icon: Users, color: "#174be8", bg: "#eaf0ff",
    description: "Size of the target-family market and signal strength of program demand — kids in the right age band, household income, parent intent.", defaultWeight: 40 },
  { key: "franchiseeSupply", label: "TAM Teachers", icon: UserCheck, color: "#7c3aed", bg: "#f1ebff",
    description: "Pool of teachers available locally to recruit as franchise operators — credentialed, in-area, plausible to convert into owners.", defaultWeight: 30 },
  { key: "competitiveLandscape", label: "Competitive Opportunity", icon: Trophy, color: "#b8860b", bg: "#fff6dc",
    description: "How wide-open the market is — fewer national-brand competitors, less saturation, more room for a new operator to win share.", defaultWeight: 30 },
];

// Alias for code that previously filtered out retired categories. After the
// May 21, 2026 final purge, every entry in CATEGORIES is visible.
export const VISIBLE_CATEGORIES = CATEGORIES;

// Map mock data scoreBreakdown into our 3 category scores deterministically.
export function categoryScoresFromSample(c: CityData): Record<CategoryKey, number> {
  const b = c.scoreBreakdown;
  return {
    demand: b.summerCampDemand,
    competitiveLandscape: b.competitionScore,
    franchiseeSupply: Math.round((b.stemJobs + b.schoolDensity) / 2),
  };
}

export const SOURCES: { name: string; icon: typeof Building2; status: "connected" | "planned" }[] = [
  { name: "U.S. Census Bureau", icon: Building2, status: "connected" },
  { name: "BLS (Occupational Data)", icon: Building2, status: "connected" },
  { name: "Yelp / Google Maps / Apify", icon: MapPin, status: "connected" },
  { name: "Firecrawl", icon: FileText, status: "connected" },
  { name: "Google Trends", icon: Search, status: "planned" },
  { name: "GreatSchools.org", icon: GraduationCap, status: "planned" },
  { name: "State Education Databases", icon: GraduationCap, status: "planned" },
  { name: "ACA Camp Regulations", icon: FileText, status: "planned" },
  { name: "Internal Franchise Data", icon: HomeIcon, status: "planned" },
];

export const normalizeMarketState = (state?: string | null): string => {
  if (!state) return "";
  if (state === "TX") return "Texas";
  if (state === "FL") return "Florida";
  return state;
};

export const sameMarket = (
  cityA?: string | null,
  stateA?: string | null,
  cityB?: string | null,
  stateB?: string | null,
): boolean =>
  (cityA ?? "").trim().toLowerCase() === (cityB ?? "").trim().toLowerCase() &&
  normalizeMarketState(stateA).toLowerCase() === normalizeMarketState(stateB).toLowerCase();
