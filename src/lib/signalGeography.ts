// Maps a city_market_signals row to the geography level its value
// actually represents. Drives the geography badge in the Data Sources
// audit view. Source field is the primary signal; signal_key overrides
// handle edge cases (e.g. weather indices that are city-level even when
// pulled from a metro feed).
//
// Keep this conservative: when in doubt, return 'unknown' rather than
// mislabel a metric, since wrong geography labels actively reduce trust.

export type GeoLevel = "city" | "metro" | "city_radius" | "nearby" | "unknown";

export interface GeoInfo {
  level: GeoLevel;
  short: string; // badge text, e.g. "City"
  full: string;  // tooltip text, e.g. "City · Census Place"
}

const SOURCE_MAP: Record<string, GeoInfo> = {
  census: { level: "city", short: "City", full: "City · Census Place (FIPS)" },
  bls: { level: "metro", short: "Metro", full: "Metro · MSA-level (BLS)" },
  apify: { level: "city_radius", short: "City + Radius", full: "City + Radius (Apify / Google Maps, ~10–25 mi)" },
  firecrawl: { level: "nearby", short: "Nearby", full: "Nearby market (Firecrawl scrape, source-dependent)" },
};

// Per signal_key overrides for cases where the source label doesn't
// match the actual geography of the value.
const SIGNAL_KEY_OVERRIDES: Record<string, GeoInfo> = {
  // Climate / weather signals are typically reported for the metro/airport,
  // not the city proper.
  summer_weather_index: { level: "metro", short: "Metro", full: "Metro · weather station" },
  avg_peak_summer_temperature: { level: "metro", short: "Metro", full: "Metro · weather station" },
  days_above_100f: { level: "metro", short: "Metro", full: "Metro · weather station" },
  // State-level regulatory data
  state_camp_regulation_complexity: { level: "metro", short: "State", full: "State-level regulation index" },
};

const UNKNOWN: GeoInfo = { level: "unknown", short: "Source-dep.", full: "Source-dependent" };

export function getSignalGeography(source?: string | null, signalKey?: string | null): GeoInfo {
  if (signalKey && SIGNAL_KEY_OVERRIDES[signalKey]) return SIGNAL_KEY_OVERRIDES[signalKey];
  if (!source) return UNKNOWN;
  const key = source.toLowerCase().trim();
  return SOURCE_MAP[key] ?? UNKNOWN;
}

export const GEO_BADGE_CLASS: Record<GeoLevel, string> = {
  city: "bg-[#e6f0ff] text-[#1d4ed8] border-[#cbd8ff]",
  metro: "bg-[#fef3c7] text-[#92400e] border-[#fde68a]",
  city_radius: "bg-[#ecfccb] text-[#3f6212] border-[#d9f99d]",
  nearby: "bg-[#fce7f3] text-[#9d174d] border-[#fbcfe8]",
  unknown: "bg-[#f3f4f6] text-[#52525b] border-[#e5e7eb]",
};
