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
import type { TierCounts } from "@/components/city-scoring/TierCountsBar";

/**
 * Pure weight-rebalancer. When one slider moves, redistribute the remainder
 * across other keys proportional to their current share, then reconcile
 * rounding drift so the total is exactly 100.
 */
export function rebalanceWeights<K extends string>(
  prev: Record<K, number>,
  changedKey: K,
  rawValue: number,
): Record<K, number> {
  const newValue = Math.max(0, Math.min(100, Math.round(rawValue)));
  const keys = Object.keys(prev) as K[];
  const others = keys.filter((k) => k !== changedKey);
  const pool = others.reduce((s, k) => s + prev[k], 0);
  const remainder = 100 - newValue;

  const next = { ...prev };
  next[changedKey] = newValue;

  if (others.length === 0) return next;

  if (pool > 0) {
    others.forEach((k) => {
      next[k] = Math.max(0, (prev[k] / pool) * remainder);
    });
  } else {
    const equal = remainder / others.length;
    others.forEach((k) => {
      next[k] = Math.max(0, equal);
    });
  }

  keys.forEach((k) => {
    next[k] = Math.round(next[k]);
  });

  let diff = 100 - keys.reduce((s, k) => s + next[k], 0);
  while (diff !== 0 && others.length > 0) {
    const sorted = [...others].sort((a, b) => next[b] - next[a]);
    const target = diff > 0 ? sorted[sorted.length - 1] : sorted[0];
    const step = diff > 0 ? 1 : -1;
    if (next[target] + step < 0) break;
    next[target] = next[target] + step;
    diff -= step;
  }

  return next;
}

/**
 * Count how many live-data markets fall into each tier letter. Markets
 * without live data are excluded so counts reflect the trustable universe.
 */
export function countLiveTiers<T extends { hasLiveData?: boolean | null; tier?: string | null }>(
  markets: T[],
): TierCounts {
  const counts: TierCounts = { A: 0, B: 0, C: 0, D: 0 };
  markets.forEach((market) => {
    if (!market.hasLiveData) return;
    const tier = market.tier as keyof TierCounts;
    if (counts[tier] != null) counts[tier] += 1;
  });
  return counts;
}

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

// Composite categories — the ones that actually count toward the overall
// score. Tier 1 rework (Sam+Brett 2026-07-07) Phase 3: CSI-derived
// Competitive Opportunity is excluded here to match the composite math in
// `recomputeComposite`. Use this list for row popovers, the selected-market
// formula panel, the Category Scores bars, and the compare modal — anywhere
// the UI implies "these numbers add up to the score". Continue using
// VISIBLE_CATEGORIES only where the third category is genuinely still
// relevant (e.g. legacy Scoring Method sliders removed in Turn 3b).
export const COMPOSITE_CATEGORIES: Category[] = CATEGORIES.filter(
  (c) => c.key !== "competitiveLandscape",
);


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
