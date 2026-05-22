// Tier cutoffs for the ranked-markets list.
// Sam-tunable in one place — used to live as inline 0.05/0.15/0.30 magic
// numbers in CityScoring.tsx. Change here and the Tier Counts bar, the table
// badges, and any future export all stay in sync.
//
// Distribution (Brett+Haseeb, May 22, 2026): top 5% = A, next 15% = B,
// next 30% = C, remainder = D. Every live-scored city gets a letter.

export const TIER_DISTRIBUTION = {
  A: 0.05,
  B: 0.15,
  C: 0.30,
  // D is the implicit remainder.
} as const;

export type TierLetter = "A" | "B" | "C" | "D";

export function percentileTierCutoffs(n: number) {
  if (n <= 0) return { aCut: 0, bCut: 0, cCut: 0 };
  const aCut = Math.max(1, Math.ceil(n * TIER_DISTRIBUTION.A));
  const bCut = aCut + Math.max(1, Math.ceil(n * TIER_DISTRIBUTION.B));
  const cCut = bCut + Math.max(1, Math.ceil(n * TIER_DISTRIBUTION.C));
  return { aCut, bCut, cCut };
}

export function tierFromRank(rankIndex: number, totalLive: number): TierLetter {
  const { aCut, bCut, cCut } = percentileTierCutoffs(totalLive);
  if (rankIndex < aCut) return "A";
  if (rankIndex < bCut) return "B";
  if (rankIndex < cCut) return "C";
  return "D";
}

export function assignPercentileTiers<
  T extends { hasLiveData?: boolean | null; compositeScore?: number | null },
>(markets: T[]): Array<T & { tier: TierLetter }> {
  const withIndex = markets.map((market, index) => ({ market, index }));
  const liveScored = withIndex
    .filter(({ market }) => !!market.hasLiveData)
    .slice()
    .sort(
      (a, b) =>
        Number(b.market.compositeScore ?? 0) - Number(a.market.compositeScore ?? 0),
    );

  const tierByIndex = new Map<number, TierLetter>();
  liveScored.forEach(({ index }, i) => {
    tierByIndex.set(index, tierFromRank(i, liveScored.length));
  });

  return withIndex.map(({ market, index }) => {
    if (!market.hasLiveData) return { ...market, tier: "D" as const };
    return { ...market, tier: tierByIndex.get(index) ?? "D" };
  });
}
