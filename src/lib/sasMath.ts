// UI-side mirror of supabase/functions/_shared/sas-math.ts.
// Keep these two files in lockstep — the engine and the UI MUST compute
// the same numbers from the same inputs (Brett: "one calibrated number everywhere").

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

/**
 * Map legacy stored school-type strings (before the Montessori split) onto
 * the current SchoolType union. Old saved rows written as `"montessori"`
 * get treated as Montessori elementary — the safer default. Unknown strings
 * pass through as-is so the engine still throws loudly on true garbage.
 */
export function normalizeSchoolType(raw: string | null | undefined): SchoolType {
  if (raw === "montessori") return "montessori_elementary";
  return (raw ?? "other") as SchoolType;
}

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

/**
 * Single source of truth for any UI surface that displays SAS pillar or
 * composite scores (cards, banners, summary table, exported decision pack,
 * live engine card). Brett's rule: "one calibrated number everywhere".
 *
 * Accepts pillars in any shape the codebase uses (live engine result OR
 * the demo `SiteAnalysisDemoSite.subScores` shape with `{value, weight,
 * formula}`). Returns the normalized pillar set AND the recomputed
 * composite. Display code must read both from this helper — never from a
 * stored `composite` field on the input object.
 */
type PillarLike = number | { value: number };
type SiteScoresInput = {
  schoolProfile?: PillarLike;
  affluence?: PillarLike;
  neighborhoodAffluence?: PillarLike;
  familyDensity?: PillarLike;
  ecosystem?: PillarLike;
  schoolEcosystem?: PillarLike;
  accessibility?: PillarLike;
};

function pillarValue(p: PillarLike | undefined): number {
  if (p == null) return 0;
  if (typeof p === "number") return p;
  return typeof p.value === "number" ? p.value : 0;
}

export interface RecomputedSiteScores {
  pillars: SasPillarScores;
  composite: number;
}

export function recomputeSiteScores(input: SiteScoresInput): RecomputedSiteScores {
  const raw: SasPillarScores = {
    schoolProfile: pillarValue(input.schoolProfile),
    affluence: pillarValue(input.affluence ?? input.neighborhoodAffluence),
    familyDensity: pillarValue(input.familyDensity),
    ecosystem: pillarValue(input.ecosystem ?? input.schoolEcosystem),
    accessibility: pillarValue(input.accessibility),
  };
  return {
    pillars: {
      schoolProfile: round2(raw.schoolProfile),
      affluence: round2(raw.affluence),
      familyDensity: round2(raw.familyDensity),
      ecosystem: round2(raw.ecosystem),
      accessibility: round2(raw.accessibility),
    },
    composite: round2(compositeSas(raw)),
  };
}

/** Convenience for callers that just need the composite from a site-shaped object. */
export function siteComposite(
  site: { subScores?: SiteScoresInput } | SiteScoresInput,
): number {
  const input = "subScores" in site && site.subScores ? site.subScores : (site as SiteScoresInput);
  return recomputeSiteScores(input).composite;
}
