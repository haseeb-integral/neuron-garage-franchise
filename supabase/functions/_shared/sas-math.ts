// Shared SAS (Site Analysis Score) math.
// Mirrors the formulas in .lovable/phase-2/phase-2-sow.md Item 2 (lines 389-475).
// Keep this file and src/lib/sasMath.ts byte-identical in logic.

export type SchoolType =
  | "private_elementary"
  | "public_elementary"
  | "charter_elementary"
  | "montessori_elementary"
  | "montessori_preschool"
  | "daycare"
  | "other_k8"
  | "other";

export type GradeBand = "k5_k6" | "k8" | "prek_5" | "other";

const SCHOOL_TYPE_FACTOR: Record<SchoolType, number> = {
  private_elementary: 100,
  public_elementary: 70,
  charter_elementary: 75,
  montessori_elementary: 85,
  montessori_preschool: 30,
  daycare: 30,
  other_k8: 50,
  other: 30,
};

const GRADE_ALIGN_FACTOR: Record<GradeBand, number> = {
  k5_k6: 100,
  prek_5: 95,
  k8: 80,
  other: 20,
};

export function normalize(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  if (max === min) return 0;
  const v = (value - min) / (max - min);
  return Math.max(0, Math.min(1, v)) * 100;
}

// 60/40 blend of 10-min vs 15-min isochrones for the affluence + density pillars.
export function blend10_15(v10: number, v15: number): number {
  return 0.6 * v10 + 0.4 * v15;
}

export interface SchoolProfileInputs {
  schoolType: SchoolType;
  enrollment: number | null;
  gradeBand: GradeBand;
}

// v0.2: no synthetic constants. Every input must be a real, mapped value.
// Missing enrollment / unknown schoolType / unknown gradeBand → throw, so the
// engine fails loudly instead of producing a fabricated score.
export function schoolProfileScore(i: SchoolProfileInputs): number {
  const typeFactor = SCHOOL_TYPE_FACTOR[i.schoolType];
  if (typeFactor == null) {
    throw new Error(`schoolProfileScore: unknown schoolType "${i.schoolType}" — refusing to fabricate a score`);
  }
  if (i.enrollment == null || !Number.isFinite(i.enrollment)) {
    throw new Error("schoolProfileScore: enrollment missing — refusing to fabricate a score");
  }
  const gradeFactor = GRADE_ALIGN_FACTOR[i.gradeBand];
  if (gradeFactor == null) {
    throw new Error(`schoolProfileScore: unknown gradeBand "${i.gradeBand}" — refusing to fabricate a score`);
  }
  const enrollFactor = normalize(i.enrollment, 150, 800);
  return 0.5 * typeFactor + 0.25 * enrollFactor + 0.25 * gradeFactor;
}

export interface AffluenceInputs {
  medianHhi10: number;
  pctAbove150k10: number; // 0-100
  pctDualIncome10: number; // 0-100
  medianHhi15: number;
  pctAbove150k15: number;
  pctDualIncome15: number;
}

function affluenceForRing(hhi: number, above150: number, dual: number): number {
  return (
    0.4 * normalize(hhi, 80_000, 200_000) +
    0.35 * normalize(above150, 10, 50) +
    0.25 * normalize(dual, 40, 80)
  );
}

export function affluenceScore(i: AffluenceInputs): number {
  const ring10 = affluenceForRing(i.medianHhi10, i.pctAbove150k10, i.pctDualIncome10);
  const ring15 = affluenceForRing(i.medianHhi15, i.pctAbove150k15, i.pctDualIncome15);
  return blend10_15(ring10, ring15);
}

export interface FamilyDensityInputs {
  children5to12_10: number;
  children5to12_15: number;
  familiesWithKids5to12_10: number;
}

export function familyDensityScore(i: FamilyDensityInputs): number {
  return (
    0.5 * normalize(i.children5to12_10, 1_000, 15_000) +
    0.3 * normalize(i.children5to12_15, 3_000, 40_000) +
    0.2 * normalize(i.familiesWithKids5to12_10, 500, 8_000)
  );
}

export interface EcosystemInputs {
  elementaryCount: number;
  privateCount: number;
  nearbyStudentPop: number;
}

// Bug-3 fix (Manus 1B calibration analysis): ranges widened from the original
// 3–25 / 1–10 / 2k–25k spec because dense metro markets (DFW, Austin, etc.)
// saturate every site at 100, eliminating ecosystem as a differentiator
// between strong and weak candidates. Widened ranges restore separation:
// strong-ecosystem metros land mid-80s, school-deserts land in the 20s,
// matching the reference Trinity 84 / LeafSpring 35 in the SAS methodology.
export function ecosystemScore(i: EcosystemInputs): number {
  return (
    0.4 * normalize(i.elementaryCount, 10, 100) +
    0.3 * normalize(i.privateCount, 5, 50) +
    0.3 * normalize(i.nearbyStudentPop, 5_000, 75_000)
  );
}

export interface AccessibilityInputs {
  roadDistanceMi: number; // required — caller must measure real driving miles
  highwayDistanceMi: number; // required — caller must measure real driving miles
  popReachable15: number;
}

function roadFactor(d: number): number {
  if (d < 0.5) return 100;
  if (d < 1) return 80;
  if (d < 2) return 60;
  return 30;
}

function highwayFactor(d: number): number {
  if (d < 2) return 100;
  if (d < 4) return 80;
  if (d < 7) return 50;
  return 30;
}

// v0.2: real driving miles required. Engine must fail loudly when the road
// or highway lookup is unavailable — never substitute a synthetic constant.
export function accessibilityScore(i: AccessibilityInputs): number {
  if (i.roadDistanceMi == null || !Number.isFinite(i.roadDistanceMi)) {
    throw new Error("accessibilityScore: roadDistanceMi missing — refusing to fabricate a score");
  }
  if (i.highwayDistanceMi == null || !Number.isFinite(i.highwayDistanceMi)) {
    throw new Error("accessibilityScore: highwayDistanceMi missing — refusing to fabricate a score");
  }
  return (
    0.3 * roadFactor(i.roadDistanceMi) +
    0.3 * highwayFactor(i.highwayDistanceMi) +
    0.4 * normalize(i.popReachable15, 50_000, 500_000)
  );
}

export interface SasPillarScores {
  schoolProfile: number;
  affluence: number;
  familyDensity: number;
  ecosystem: number;
  accessibility: number;
}

export function compositeSas(p: SasPillarScores): number {
  return (
    0.25 * p.schoolProfile +
    0.25 * p.affluence +
    0.2 * p.familyDensity +
    0.15 * p.ecosystem +
    0.15 * p.accessibility
  );
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
