// Feature flags for Tier 3 rollouts.
// Flip to false to instantly hide a feature surface without a code revert.
export const FEATURE_FLAGS = {
  FF_DOCUMENTS: true,        // T3-01 Documents tab + dropzone
  FF_STEP2_UPLOADS: true,    // T3-02 background/credit uploads (Phase B1)
  FF_STEP4_UPLOADS: true,    // T3-03 immersion uploads (Phase B2)
  FF_COMPLIANCE: true,       // T3-05 compliance audit log (Phase C1)
  FF_FDD_GATE: true,         // T3-06 16-day FDD hard-block (Phase C2)

  FF_SCORE_OVERRIDE: false,  // T3-04 manual score override (Phase D)
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export const isEnabled = (flag: FeatureFlag): boolean => FEATURE_FLAGS[flag];
