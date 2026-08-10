/**
 * Single source of truth for candidate / prospect fit tags.
 * Tags are chosen manually by a recruiter — nothing derives them automatically.
 * Used by:
 *  - New Candidate modal
 *  - Candidate detail → Overview tag picker
 *  - Candidate Pipeline tag filters
 *  - TagBadge styling
 */
export const FIT_TAGS = [
  "High Potential",
  "Interested",
  "Meeting Requested",
  "Follow-Up",
  "Not a Fit",
] as const;

export type FitTag = (typeof FIT_TAGS)[number];

/** Default tag used when no tag has been assigned yet. */
export const DEFAULT_FIT_TAG: FitTag = "Follow-Up";

export const isFitTag = (v: unknown): v is FitTag =>
  typeof v === "string" && (FIT_TAGS as readonly string[]).includes(v);

/** Coerce any incoming string (e.g. legacy "Untagged"/"Active"/"Qualified") into a valid FitTag. */
export const coerceFitTag = (v: unknown): FitTag =>
  isFitTag(v) ? v : DEFAULT_FIT_TAG;
