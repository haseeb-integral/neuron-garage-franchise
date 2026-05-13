// Frontend mirror of supabase/functions/_shared/scoring.ts SOW_METRIC_REGISTRY.
// Duplicated intentionally so the frontend doesn't bundle edge-function code.
// Keep in sync if the backend registry changes.

import type { CategoryKey } from "@/stores/cityScoringStore";

export type MetricStatus = "live" | "proxy" | "missing" | "blocked";
export type RegistryCategory =
  | "demand"
  | "pricing_power"
  | "competitive_landscape"
  | "franchisee_supply"
  | "ease_of_operations"
  | "parent_mindset";

export type SowMetricEntry = {
  key: string;
  category: RegistryCategory;
  label: string;
  enabled: boolean;
  weight_within_category: number;
  status: MetricStatus;
};

export const CATEGORY_KEY_MAP: Record<RegistryCategory, CategoryKey> = {
  demand: "demand",
  pricing_power: "pricingPower",
  competitive_landscape: "competitiveLandscape",
  franchisee_supply: "franchiseeSupply",
  ease_of_operations: "easeOfOperations",
  parent_mindset: "parentMindset",
};

export const SOW_METRIC_REGISTRY: readonly SowMetricEntry[] = [
  // Demand
  { key: "children_5_12_count",                 category: "demand", label: "Children Ages 5–12",                     enabled: true,  weight_within_category: 0.20, status: "proxy" },
  { key: "children_5_12_pct",                   category: "demand", label: "% Population Ages 5–12",                  enabled: true,  weight_within_category: 0.10, status: "proxy" },
  { key: "households_with_children_under_13",   category: "demand", label: "Households With Children Under 13",       enabled: true,  weight_within_category: 0.10, status: "proxy" },
  { key: "median_household_income",             category: "demand", label: "Median Household Income",                 enabled: true,  weight_within_category: 0.15, status: "live"  },
  { key: "income_100k_plus_pct",                category: "demand", label: "Households Earning $100k+",               enabled: true,  weight_within_category: 0.10, status: "live"  },
  { key: "income_150k_plus_pct",                category: "demand", label: "Households Earning $150k+",               enabled: true,  weight_within_category: 0.10, status: "live"  },
  { key: "young_family_growth_rate",            category: "demand", label: "Growth Rate of Young Families",           enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "dual_income_household_pct",           category: "demand", label: "% Dual-Income Households",                enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "education_bachelors_plus_pct",        category: "demand", label: "Parent Education / Bachelor's+",          enabled: true,  weight_within_category: 0.10, status: "live"  },
  { key: "summer_weather_index",                category: "demand", label: "Summer Weather Index",                    enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "avg_peak_summer_temperature",         category: "demand", label: "Avg Peak Summer Temperature",             enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "days_above_100f",                     category: "demand", label: "Number of 100°+ Days",                    enabled: false, weight_within_category: 0,    status: "missing" },

  // Pricing Power
  { key: "avg_weekly_camp_tuition",             category: "pricing_power", label: "Average Weekly Camp Tuition",                       enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "avg_hourly_camp_pricing",             category: "pricing_power", label: "Average Hourly Camp Pricing",                       enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "premium_stem_camp_pricing",           category: "pricing_power", label: "Premium STEM / Maker / Enrichment Camp Pricing",    enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "private_school_tuition_proxy",        category: "pricing_power", label: "Private Elementary School Tuition Levels",          enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "private_school_student_count",        category: "pricing_power", label: "Number of Private School Students",                 enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "childcare_nanny_hourly_rate_proxy",   category: "pricing_power", label: "Childcare / Nanny Hourly Rate Proxy",               enabled: true,  weight_within_category: 0.40, status: "proxy" },
  { key: "household_discretionary_income_proxy",category: "pricing_power", label: "Household Discretionary Income Estimate",           enabled: true,  weight_within_category: 0.20, status: "proxy" },

  // Competitive Landscape
  { key: "summer_camps_per_10k_children",       category: "competitive_landscape", label: "Summer Camps per 10,000 Children",          enabled: true,  weight_within_category: 0.30, status: "proxy" },
  { key: "stem_robotics_maker_camp_count",      category: "competitive_landscape", label: "STEM / Robotics / Maker Camps",             enabled: true,  weight_within_category: 0.20, status: "proxy" },
  { key: "school_based_summer_camp_count",      category: "competitive_landscape", label: "School-Based Summer Camps",                 enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "national_brand_presence",             category: "competitive_landscape", label: "National Brand Presence",                   enabled: false, weight_within_category: 0,    status: "proxy" },
  { key: "google_search_demand_summer_camp",    category: "competitive_landscape", label: "Google Search Demand: summer camp [city]",  enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "google_search_demand_summer_day_camp",category: "competitive_landscape", label: "Google Search Demand: summer day camp",     enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "google_search_demand_summer_day_camps_year", category: "competitive_landscape", label: "Google Search Demand: Day Camps [Year]", enabled: false, weight_within_category: 0, status: "missing" },
  { key: "waitlist_sold_out_signal_count",      category: "competitive_landscape", label: "Waitlist / Sold-Out Signals",               enabled: false, weight_within_category: 0,    status: "missing" },

  // Franchisee Supply
  { key: "public_elementary_teacher_count",     category: "franchisee_supply", label: "Public Elementary Teachers",                    enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "private_charter_montessori_teacher_count", category: "franchisee_supply", label: "Private / Charter / Montessori Teachers", enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "elementary_school_count",             category: "franchisee_supply", label: "Elementary Schools",                            enabled: true,  weight_within_category: 0.40, status: "proxy" },
  { key: "teacher_salary_proxy",                category: "franchisee_supply", label: "Average Teacher Salary Proxy",                  enabled: true,  weight_within_category: 0.30, status: "proxy" },
  { key: "cost_of_living_index",                category: "franchisee_supply", label: "Cost of Living Index",                          enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "summer_income_need_ratio",            category: "franchisee_supply", label: "Summer Income Need Ratio",                      enabled: false, weight_within_category: 0,    status: "missing" },

  // Ease of Operations
  { key: "rental_venue_count",                  category: "ease_of_operations", label: "Rental Venues (Schools / Churches / Rec)",     enabled: true,  weight_within_category: 0.50, status: "proxy" },
  { key: "classroom_rental_cost_weekly",        category: "ease_of_operations", label: "Typical Classroom Rental Cost per Week",       enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "commute_sprawl_index",                category: "ease_of_operations", label: "Commute Times / Geographic Sprawl",            enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "state_camp_regulation_complexity",    category: "ease_of_operations", label: "State Camp Regulation Complexity",             enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "guide_wage_proxy",                    category: "ease_of_operations", label: "Estimated Guide Wage Proxy",                   enabled: true,  weight_within_category: 0.30, status: "proxy" },

  // Parent Mindset
  { key: "homeschool_population_proxy",         category: "parent_mindset", label: "Homeschool Population Proxy",                      enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "montessori_school_density",           category: "parent_mindset", label: "Elementary Montessori School Density",             enabled: true,  weight_within_category: 0.30, status: "proxy" },
  { key: "childrens_museum_signal",             category: "parent_mindset", label: "Children's Museum Signal",                         enabled: false, weight_within_category: 0,    status: "proxy" },
  { key: "robotics_maker_space_count",          category: "parent_mindset", label: "Robotics Clubs / Maker Spaces",                    enabled: true,  weight_within_category: 0.30, status: "proxy" },
  { key: "library_children_program_signal",     category: "parent_mindset", label: "Library Program Engagement",                       enabled: false, weight_within_category: 0,    status: "missing" },
  { key: "parenting_facebook_group_activity",   category: "parent_mindset", label: "Parenting Facebook Group Activity",                enabled: false, weight_within_category: 0,    status: "blocked" },
  { key: "parent_community_activity_proxy",     category: "parent_mindset", label: "Other Parent Communities Activity",                enabled: false, weight_within_category: 0,    status: "blocked" },
];

export const METRICS_BY_CATEGORY: Record<CategoryKey, SowMetricEntry[]> = (() => {
  const out: Record<CategoryKey, SowMetricEntry[]> = {
    demand: [], pricingPower: [], competitiveLandscape: [],
    franchiseeSupply: [], easeOfOperations: [], parentMindset: [],
  };
  for (const m of SOW_METRIC_REGISTRY) out[CATEGORY_KEY_MAP[m.category]].push(m);
  return out;
})();

export const DEFAULT_SUB_WEIGHTS: Record<CategoryKey, Record<string, number>> = (() => {
  const out: Record<CategoryKey, Record<string, number>> = {
    demand: {}, pricingPower: {}, competitiveLandscape: {},
    franchiseeSupply: {}, easeOfOperations: {}, parentMindset: {},
  };
  for (const m of SOW_METRIC_REGISTRY) {
    out[CATEGORY_KEY_MAP[m.category]][m.key] = Math.round(m.weight_within_category * 100);
  }
  return out;
})();
