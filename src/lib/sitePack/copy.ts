// Pure copy / formatting helpers shared by the Site Analysis PDF and any
// future surface that needs to reuse the same wording. No React, no jsPDF.

import type { SasPillarScores } from "@/lib/sasMath";
import type { SiteVerdict } from "@/hooks/useSiteDecisions";

export const VERDICT_LABEL: Record<SiteVerdict, string> = {
  strong: "Strong",
  high: "High",
  medium: "Medium",
  low: "Low",
  undecided: "Undecided",
};

export const PILLAR_ORDER: { key: keyof SasPillarScores; label: string; weight: string }[] = [
  { key: "schoolProfile", label: "School Profile", weight: "25%" },
  { key: "affluence", label: "Neighborhood Affluence", weight: "25%" },
  { key: "familyDensity", label: "Family Density", weight: "20%" },
  { key: "ecosystem", label: "School Ecosystem", weight: "15%" },
  { key: "accessibility", label: "Accessibility", weight: "15%" },
];

export function fmtMoney(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}k`;
  return `$${Math.round(v)}`;
}
export function fmtPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const pct = v > 1 ? v : v * 100;
  return `${Math.round(pct)}%`;
}
export function fmtCount(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000).toLocaleString()}k`;
  return Math.round(v).toLocaleString();
}
export function fmtMi(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${v.toFixed(1)} mi`;
}

export const TIER_COLOR = {
  strong: "#1d6b32",
  high: "#2f7a3f",
  medium: "#7a5800",
  low: "#a3142b",
} as const;

export function tierColor(tier: string): string {
  if (tier === "Strong") return TIER_COLOR.strong;
  if (tier === "High") return TIER_COLOR.high;
  if (tier === "Medium") return TIER_COLOR.medium;
  return TIER_COLOR.low;
}

export interface VerdictArgs {
  schoolName: string;
  composite: number;
  tierLabel: string;
}

export function verdictSentence(c: VerdictArgs): string {
  if (c.tierLabel === "Strong") {
    return `${c.schoolName} scores SAS ${c.composite} on Sam's 25/25/20/15/15 weighting — Strong confidence band. Worth advancing to deeper diligence.`;
  }
  if (c.tierLabel === "High") {
    return `${c.schoolName} scores SAS ${c.composite} on Sam's 25/25/20/15/15 weighting — High confidence band. Promising; verify open items before advancing.`;
  }
  if (c.tierLabel === "Medium") {
    return `${c.schoolName} scores SAS ${c.composite} on Sam's 25/25/20/15/15 weighting — Medium confidence band. Mixed signals; review pillar detail before deciding.`;
  }
  return `${c.schoolName} scores SAS ${c.composite} on Sam's 25/25/20/15/15 weighting — Low confidence band. Significant gaps versus the comparison set.`;
}

export function strengthsBullets(pillars: SasPillarScores): string[] {
  const out: string[] = [];
  for (const p of PILLAR_ORDER) {
    const v = pillars[p.key];
    if (v >= 70) out.push(`${p.label} is strong (${v}/100, weight ${p.weight}).`);
  }
  if (!out.length) out.push("No pillar scored above 70 — this site has no standout strength under Sam's weighting.");
  return out;
}

export function risksBullets(pillars: SasPillarScores): string[] {
  const out: string[] = [];
  for (const p of PILLAR_ORDER) {
    const v = pillars[p.key];
    if (v < 50) out.push(`${p.label} is weak (${v}/100, weight ${p.weight}). Drags ${(parseFloat(p.weight) * v / 100).toFixed(1)} pt off composite.`);
  }
  if (!out.length) out.push("No pillar below 50 — no headline risks under the calibrated bands.");
  return out;
}

export function opportunitiesBullets(pillars: SasPillarScores): string[] {
  const out: string[] = [];
  for (const p of PILLAR_ORDER) {
    const v = pillars[p.key];
    if (v >= 50 && v < 70) out.push(`${p.label} is mid-band (${v}/100) — a +10 lift here would move composite by ${(parseFloat(p.weight) * 0.1).toFixed(1)} pt.`);
  }
  if (!out.length) out.push("No mid-band pillars to optimize — site reads either strongly positive or strongly negative.");
  return out;
}

export interface RecommendationsArgs {
  tierLabel: string;
  verdict?: SiteVerdict;
  notes?: string | null;
}

export function recommendationsBullets(c: RecommendationsArgs): string[] {
  const out: string[] = [];
  if (c.tierLabel === "Strong") {
    out.push("Scores in the Strong confidence band. Worth advancing to deeper diligence.");
    out.push("Confirm enrollment, lease terms, and competing-provider activity before committing.");
  } else if (c.tierLabel === "High") {
    out.push("Scores in the High confidence band. Promising; verify open items before advancing.");
    out.push("Stress-test the weakest pillar in person before issuing an LOI.");
  } else if (c.tierLabel === "Medium") {
    out.push("Scores in the Medium confidence band. Mixed signals; review pillar detail.");
    out.push("Compare against a known-good anchor in the same MSA before deciding.");
  } else {
    out.push("Scores in the Low confidence band. Significant gaps versus the comparison set.");
    out.push("Consider re-directing search to addresses scoring higher in the same MSA.");
  }
  if (c.verdict && c.verdict !== "undecided") {
    out.push(`User confidence recorded: ${VERDICT_LABEL[c.verdict]}.`);
  }
  if (c.notes) out.push(`Notes: ${c.notes}`);
  return out;
}
