/**
 * Site Analysis (SAS) shared config — confidence thresholds and the documented
 * school-profile factor table. Read by the live SAS engine display layer and
 * by the SAS Methodology documentation page. No demo data, no fake scores.
 */

// Confidence-band thresholds applied to live composite scores from `compute-sas`.
// Single source of truth for the SAS Methodology page, the PDF brief, and the
// Site Analysis UI tier badges.
export const SITE_CONFIDENCE_THRESHOLDS = {
  strong: 75,
  high: 60,
  medium: 45,
} as const;

// School-profile factor table used by the live engine and rendered verbatim on
// the SAS Methodology page so the documented formula and the engine math stay
// in lockstep. All factors are on a 0–100 scale.
export const SCHOOL_PROFILE_FACTORS = {
  schoolType: [
    { type: "Private elementary", factor: 100 },
    { type: "Montessori elementary", factor: 85 },
    { type: "Charter elementary", factor: 75 },
    { type: "Public elementary", factor: 70 },
    { type: "Other K-8", factor: 50 },
    { type: "Montessori pre-school", factor: 30 },
    { type: "Other (incl. daycare)", factor: 30 },
  ],
  enrollmentRange: "150–800",
  gradeAlignment: [
    { label: "K-5 or K-6", factor: 100 },
    { label: "Pre-K through 5", factor: 95 },
    { label: "K-8", factor: 80 },
    { label: "Other", factor: 20 },
  ],
} as const;
