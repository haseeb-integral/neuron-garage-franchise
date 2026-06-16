// Pure copy / formatting helpers shared by the Site Analysis PDF and any
// future surface that needs to reuse the same wording. No React, no jsPDF.

import type { SasPillarScores } from "@/lib/sasMath";
import type { SiteVerdict } from "@/hooks/useSiteDecisions";

export const VERDICT_LABEL: Record<SiteVerdict, string> = {
  recommend: "Recommend",
  worth_a_look: "Worth a look",
  dont_recommend: "Don't recommend",
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
  recommend: "#1d6b32",
  worth: "#7a5800",
  dont: "#a3142b",
} as const;

export function tierColor(tier: string): string {
  if (tier === "Recommend") return TIER_COLOR.recommend;
  if (tier === "Worth a look") return TIER_COLOR.worth;
  return TIER_COLOR.dont;
}

export interface VerdictArgs {
  schoolName: string;
  composite: number;
  tierLabel: string;
}

export function verdictSentence(c: VerdictArgs): string {
  if (c.tierLabel === "Recommend") {
    return `${c.schoolName} clears the Recommend threshold (SAS ${c.composite}) on Sam's 25/25/20/15/15 weighting — proceed to LOI diligence.`;
  }
  if (c.tierLabel === "Worth a look") {
    return `${c.schoolName} lands in the Worth-a-Look band (SAS ${c.composite}). Validate weakest pillar before committing.`;
  }
  return `${c.schoolName} scores SAS ${c.composite}, below the Recommend threshold on Sam's 25/25/20/15/15 weighting. Do not pursue.`;
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
  isWinner?: boolean | null;
}

export function recommendationsBullets(c: RecommendationsArgs): string[] {
  const out: string[] = [];
  if (c.tierLabel === "Recommend") {
    out.push("Advance to LOI. Confirm enrollment and lease terms with school admin.");
    out.push("Lock site in pipeline; begin teacher-search for this geography.");
  } else if (c.tierLabel === "Worth a look") {
    out.push("Run a second-anchor stress test before committing capital.");
    out.push("Investigate weakest pillar in-person before issuing LOI.");
  } else {
    out.push("Do not pursue. Composite is below the Recommend bar on Sam's weighting.");
    out.push("Re-direct search to addresses scoring ≥ 60 in the same MSA.");
  }
  if (c.verdict && c.verdict !== "undecided") {
    out.push(`User decision recorded: ${VERDICT_LABEL[c.verdict]}.`);
  }
  if (c.notes) out.push(`Decision notes: ${c.notes}`);
  if (c.isWinner) out.push("★ Marked as winner — this site ships in the recommendation pack.");
  return out;
}
