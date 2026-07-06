// Feature flags for Tier 3 rollouts.
// Flip to false to instantly hide a feature surface without a code revert.
export const FEATURE_FLAGS = {
  FF_DOCUMENTS: true,        // T3-01 Documents tab + dropzone
  FF_STEP2_UPLOADS: true,    // T3-02 background/credit uploads (Phase B1)
  FF_STEP4_UPLOADS: true,    // T3-03 immersion uploads (Phase B2)
  FF_COMPLIANCE: true,       // T3-05 compliance audit log (Phase C1)
  FF_FDD_GATE: true,         // T3-06 16-day FDD hard-block (Phase C2)

  FF_SCORE_OVERRIDE: true,   // T3-04 manual score override (Phase D)
  FF_MANUAL_VOTES: true,     // T2-03 record committee votes for members without accounts
  FF_CANDIDATE_PROCESS_V1: true, // 7-step franchisee interview process tab

  // Demand pillar: Affluent Families with Children sub-metric (B19131).
  // OFF by default in Phase 1 — flag flips ON in Phase 3 after backfill.
  // Flip to false at any time to instantly revert to the old 4-metric Demand math.
  FEATURE_AFFLUENT_FAMILIES: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export const isEnabled = (flag: FeatureFlag): boolean => FEATURE_FLAGS[flag];
