import { FitTag } from "@/constants/fitTags";

/**
 * Derive a FitTag from a numeric fit score.
 *  >= 80  → "High Potential"
 *  50-79  → "Follow-Up"
 *  < 50   → "Not a Fit"
 */
export function deriveFitTag(score: number): FitTag {
  const s = Number.isFinite(score) ? score : 0;
  if (s >= 80) return "High Potential";
  if (s >= 50) return "Follow-Up";
  return "Not a Fit";
}
