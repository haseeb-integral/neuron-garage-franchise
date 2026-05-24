// Tier cutoffs for the ranked-markets list.
//
// As of May 24, 2026 (Brett): tiers are assigned by ABSOLUTE DISPLAY SCORE,
// not by percentile rank. This is what every teacher already knows from
// school: A = 90–100, B = 80–89, C = 70–79, D = below 70. The benefit over
// percentile tiers is that tier COUNTS now respond to weight changes — if a
// preset boosts ten cities above 90, you actually see "+10 Tier A" in the
// Weighting Preview pills, instead of the counts being frozen at the fixed
// 5/15/30/50 split.
//
// The display-score cutoffs map cleanly through the monotonic calibration
// curve (src/lib/marketView.ts) to raw-composite cutoffs, which is what we
// actually compare against because every market carries its RAW composite.

import { calibrateCompositeForDisplay } from "@/lib/marketView";

export type TierLetter = "A" | "B" | "C" | "D";

// Public, user-facing cutoffs on the displayed Total Score.
export const DISPLAY_TIER_CUTOFFS = {
  A: 90,
  B: 80,
  C: 70,
  // D is "everything else" (display < 70).
} as const;

// ─── Narrative thresholds ──────────────────────────────────────────────────
// Single source of truth for prose/verdict bands across all panels. Aligned
// with display-score tier cutoffs so every UI surface that grades a pillar or
// composite reads the SAME school-grade scale (no raw 0-74 sneaking in).
//   strong   → Tier A territory (≥90)
//   moderate → Tier B/C territory (70-89)
//   weak     → Tier D territory (<70)
// Origin: May 24, 2026 audit — multiple panels had drifted to raw-scale
// thresholds (70/40), labeling almost every market "weak".
export const NARRATIVE_BANDS = {
  strong: DISPLAY_TIER_CUTOFFS.A,    // 90
  moderate: DISPLAY_TIER_CUTOFFS.C,  // 70
} as const;

export type NarrativeBand = "strong" | "moderate" | "weak";

export function bandFromDisplayScore(display: number): NarrativeBand {
  if (display >= NARRATIVE_BANDS.strong) return "strong";
  if (display >= NARRATIVE_BANDS.moderate) return "moderate";
  return "weak";
}

export function tierFromDisplayScore(display: number): TierLetter {
  if (display >= DISPLAY_TIER_CUTOFFS.A) return "A";
  if (display >= DISPLAY_TIER_CUTOFFS.B) return "B";
  if (display >= DISPLAY_TIER_CUTOFFS.C) return "C";
  return "D";
}

export function tierFromRawComposite(raw: number): TierLetter {
  return tierFromDisplayScore(calibrateCompositeForDisplay(raw));
}

export function assignDisplayScoreTiers<
  T extends { hasLiveData?: boolean | null; compositeScore?: number | null },
>(markets: T[]): Array<T & { tier: TierLetter }> {
  return markets.map((market) => {
    if (!market.hasLiveData) return { ...market, tier: "D" as const };
    const raw = Number(market.compositeScore ?? 0);
    return { ...market, tier: tierFromRawComposite(raw) };
  });
}

// ─── Legacy aliases ────────────────────────────────────────────────────────
// Older surfaces import `assignPercentileTiers` / `percentileTierCutoffs`.
// They now resolve to the score-based implementation so behavior is consistent
// everywhere; existing imports keep working without a sweeping refactor.
export const assignPercentileTiers = assignDisplayScoreTiers;

export function percentileTierCutoffs(_n: number) {
  // Kept only for legacy callers that still destructure { aCut, bCut, cCut }.
  // Score-based tiers don't have rank cutoffs; return zeros so any caller that
  // still uses these values produces a no-op rather than wrong rank math.
  return { aCut: 0, bCut: 0, cCut: 0 };
}
