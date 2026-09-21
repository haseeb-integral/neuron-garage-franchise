/**
 * Shared plain-English labels and prospect tiering for Manus enrichment signals.
 *
 * Tiers follow the Neuron Garage enrichment methodology (v4.1):
 *  Tier 1 — entrepreneurial signal (second professional licence / side business)
 *  Tier 2 — outreach hook (funded project, grant, award, leadership)
 *  Tier 3 — verified contact only
 */

export type ProspectTier = 1 | 2 | 3;

export interface TierInfo {
  tier: ProspectTier;
  label: string;
  short: string;
  blurb: string;
  /** Tailwind-ish token-free palette used by the teacher screens. */
  bg: string;
  fg: string;
}

/** Fact labels that count as an outreach hook rather than plain identity data. */
const HOOK_FACTS = new Set([
  "teacher_project_lead",
  "recognition_award",
  "teacher_grant_recipient",
  "teacher_award_finalist",
  "teacher_grant_author",
  "teacher_of_year",
  "teacher_program_lead",
  "teacher_team_lead",
]);

const FACT_LABELS: Record<string, string> = {
  current_role_and_grade: "Role and grade confirmed by district directory",
  teacher_project_lead: "Ran a funded classroom project (DonorsChoose)",
  recognition_award: "Award or recognition",
  teacher_grant_recipient: "Received a classroom grant",
  teacher_award_finalist: "Award finalist",
  teacher_grant_author: "Wrote a classroom grant",
  teacher_of_year: "Teacher of the Year honouree",
  teacher_program_lead: "Built and ran a school programme",
  teacher_team_lead: "Grade-level team lead",
  creator_signal: "Sells or publishes their own teaching material",
};

const SECONDARY_LABELS: Record<string, string> = {
  real_estate_license: "Holds a real-estate licence",
  insurance_license: "Holds an insurance licence",
  occupational_license: "Holds an occupational licence",
  side_business_signal: "Side-business signal",
};

/** Turn a raw Manus signal code into a sentence a recruiter can read. */
export function signalLabel(code: string | null | undefined): string {
  if (!code) return "Signal";
  return (
    FACT_LABELS[code] ??
    SECONDARY_LABELS[code] ??
    code.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
  );
}

/** True when a verified fact is a usable outreach hook (not just identity data). */
export function isHookFact(code: string | null | undefined): boolean {
  return !!code && HOOK_FACTS.has(code);
}

export function hookFacts(types: string[] | null | undefined): string[] {
  return (types ?? []).filter(isHookFact);
}

export interface TierInput {
  secondarySignalCount?: number | null;
  creatorSignalCount?: number | null;
  verifiedSignalTypes?: string[] | null;
}

export const TIERS: Record<ProspectTier, TierInfo> = {
  1: {
    tier: 1,
    label: "Tier 1 — Entrepreneurial signal",
    short: "Tier 1",
    blurb: "Already building something on the side. Call these teachers first.",
    bg: "#fef3c7",
    fg: "#92400e",
  },
  2: {
    tier: 2,
    label: "Tier 2 — Outreach hook",
    short: "Tier 2",
    blurb: "Has a specific project, grant or award you can open the email with.",
    bg: "#dcfce7",
    fg: "#0a8f5a",
  },
  3: {
    tier: 3,
    label: "Tier 3 — Verified contact",
    short: "Tier 3",
    blurb: "Name, email, school and district confirmed. No personal hook yet.",
    bg: "#eef2f7",
    fg: "#34445f",
  },
};

export function prospectTier(p: TierInput): TierInfo {
  if ((p.secondarySignalCount ?? 0) > 0 || (p.creatorSignalCount ?? 0) > 0) return TIERS[1];
  if (hookFacts(p.verifiedSignalTypes).length > 0) return TIERS[2];
  return TIERS[3];
}

/** Plain-English meaning of a Manus confidence grade. */
export function confidenceBlurb(conf: string | null | undefined): string | null {
  switch ((conf ?? "").toUpperCase()) {
    case "HIGH":
      return "Confirmed by an official source.";
    case "MEDIUM":
      return "Name and city match a public record. Likely the same person.";
    case "LOW":
      return "Common surname. Check the person before you call.";
    default:
      return null;
  }
}
