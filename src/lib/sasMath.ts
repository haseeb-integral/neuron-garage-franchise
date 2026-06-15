// UI-side mirror of supabase/functions/_shared/sas-math.ts.
// Keep these two files in lockstep — the engine and the UI MUST compute
// the same numbers from the same inputs (Brett: "one calibrated number everywhere").

export type SchoolType =
  | "private_elementary"
  | "public_elementary"
  | "charter_elementary"
  | "montessori"
  | "daycare"
  | "other_k8"
  | "other";

export type GradeBand = "k5_k6" | "k8" | "prek_5" | "other";

const SCHOOL_TYPE_FACTOR: Record<SchoolType, number> = {
  private_elementary: 100,
  public_elementary: 70,
  charter_elementary: 75,
  montessori: 85,
  daycare: 30,
  other_k8: 50,
  other: 30,
};

const GRADE_ALIGN_FACTOR: Record<GradeBand, number> = {
  k5_k6: 100,
  prek_5: 95,
  k8: 80,
  other: 50,
};

export function normalize(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  if (max === min) return 0;
  const v = (value - min) / (max - min);
  return Math.max(0, Math.min(1, v)) * 100;
}

export function blend10_15(v10: number, v15: number): number {
  return 0.6 * v10 + 0.4 * v15;
}

export function schoolProfileScore(i: {
  schoolType: SchoolType;
  enrollment: number | null;
  gradeBand: GradeBand;
}): number {
  const typeFactor = SCHOOL_TYPE_FACTOR[i.schoolType] ?? 30;
  const enrollFactor = i.enrollment == null ? 60 : normalize(i.enrollment, 150, 800);
  const gradeFactor = GRADE_ALIGN_FACTOR[i.gradeBand] ?? 50;
  return 0.5 * typeFactor + 0.25 * enrollFactor + 0.25 * gradeFactor;
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
