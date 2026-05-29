// Phase D — single source of truth for candidate qualification scores.
// Reads optional override columns and falls back to raw values.
// Composite is always recomputed from the effective pillar scores.

import type { QualificationScores } from "@/data/pipelineData";

export const PILLAR_KEYS = [
  "teaching",
  "leadership",
  "financial",
  "marketFit",
  "cultureFit",
] as const;
export type PillarKey = typeof PILLAR_KEYS[number];

// DB column names for each pillar
export const PILLAR_DB_COL: Record<PillarKey, string> = {
  teaching: "teaching_experience",
  leadership: "leadership",
  financial: "financial_readiness",
  marketFit: "market_fit",
  cultureFit: "culture_fit",
};

export const PILLAR_OVERRIDE_COL: Record<PillarKey, string> = {
  teaching: "teaching_experience_override",
  leadership: "leadership_override",
  financial: "financial_readiness_override",
  marketFit: "market_fit_override",
  cultureFit: "culture_fit_override",
};

export const PILLAR_LABEL: Record<PillarKey, string> = {
  teaching: "Teaching Experience",
  leadership: "Leadership",
  financial: "Ability to Invest",
  marketFit: "Market Fit",
  cultureFit: "Culture Fit",
};

export function computeComposite(scores: QualificationScores): number {
  const total = Object.values(scores).reduce((a, b) => a + (b || 0), 0);
  return Math.round((total / 25) * 100);
}

export interface EffectiveScores {
  raw: QualificationScores;
  effective: QualificationScores;
  composite: number;
  isAdjusted: boolean;
  adjustedKeys: PillarKey[];
}

// Pull raw + override values out of a candidate_qualification row.
export function getEffectivePillarScores(row: Record<string, any> | null | undefined): EffectiveScores {
  const raw: QualificationScores = {
    teaching: row?.teaching_experience ?? 0,
    leadership: row?.leadership ?? 0,
    financial: row?.financial_readiness ?? 0,
    marketFit: row?.market_fit ?? 0,
    cultureFit: row?.culture_fit ?? 0,
  };
  const effective: QualificationScores = { ...raw };
  const adjustedKeys: PillarKey[] = [];

  for (const k of PILLAR_KEYS) {
    const ov = row?.[PILLAR_OVERRIDE_COL[k]];
    if (ov !== null && ov !== undefined) {
      effective[k] = ov as number;
      if (ov !== raw[k]) adjustedKeys.push(k);
    }
  }

  return {
    raw,
    effective,
    composite: computeComposite(effective),
    isAdjusted: adjustedKeys.length > 0,
    adjustedKeys,
  };
}
