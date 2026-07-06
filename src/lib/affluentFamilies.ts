// Affluent Families with Children — shared constants + helpers.
// Used by the Demand pillar sub-metric that replaces raw Median Income
// as the primary "premium fit" signal.
//
// Data source: Census ACS 5-yr table B19131 (Family Income by Family Type
// by Presence of Own Children Under 18).
//
// Pipeline (see supabase/functions/_shared/metricFetchers.ts):
//   1. effective_threshold = AFFLUENCE_THRESHOLD_BASE × (city RPP / 100)
//   2. snap effective_threshold to nearest B19131 bracket boundary
//   3. count / share of families-with-own-children-under-18 above snapped bracket
//   4. sub-score = 50/50 blend of normalize(count) + normalize(share)

// PLACEHOLDER — pending enrollee income calibration.
// We are validating this threshold against enrolled-family data. Update the
// constant when calibration finishes; no other code needs to change.
export const AFFLUENCE_THRESHOLD_BASE = 150000;

// B19131 income bracket lower bounds (dollars). "$200,000 or more" is 200000.
// Ordered ascending. Do not reorder — snap logic depends on order.
export const B19131_BRACKET_BOUNDARIES: readonly number[] = [
  10000, 15000, 20000, 25000, 30000, 35000, 40000, 45000,
  50000, 60000, 75000, 100000, 125000, 150000, 200000,
];

// Snap the effective threshold to the nearest bracket boundary.
// Deterministic: ties resolve DOWN (more inclusive of the affluent tail).
export function snapToBracket(effectiveThreshold: number): number {
  const boundaries = B19131_BRACKET_BOUNDARIES;
  let best = boundaries[0];
  let bestDist = Math.abs(effectiveThreshold - best);
  for (const b of boundaries) {
    const d = Math.abs(effectiveThreshold - b);
    if (d < bestDist || (d === bestDist && b < best)) {
      best = b;
      bestDist = d;
    }
  }
  return best;
}

// Convenience: given a city RPP (national = 100), return the snapped bracket
// and the raw effective threshold (rounded to nearest dollar).
export function computeAffluenceBracket(rpp: number | null | undefined): {
  effectiveThreshold: number;
  snappedBracket: number;
  rppUsed: number | null;
} {
  const rppUsed = rpp && Number.isFinite(rpp) ? rpp : null;
  const effective = rppUsed === null
    ? AFFLUENCE_THRESHOLD_BASE
    : Math.round(AFFLUENCE_THRESHOLD_BASE * (rppUsed / 100));
  return {
    effectiveThreshold: effective,
    snappedBracket: snapToBracket(effective),
    rppUsed,
  };
}
