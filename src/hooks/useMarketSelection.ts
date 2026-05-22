// Centralizes the City Search "which market is selected?" logic so the page
// component doesn't have to repeat the same 3-line ritual at every click site
// (set market key + sample id + userPicked flag), and so URL deep-linking
// stays in one place.
//
// Behavior:
//   - While the user has NOT explicitly picked a market, the columns auto-
//     follow whatever sits at the top of the ranked list. Reset whenever
//     applied weights / sub-weights change (preset switch, slider apply).
//   - `pickMarket()` sets the explicit selection, stops auto-follow, and
//     writes `?city=…&state=…` to the URL so the view is shareable.
//   - On mount, hydrates the selection from the URL when present. Accepts
//     either the legacy `?city=<sampleId>` deep-link from global search OR
//     the new `?city=<name>&state=<ST>` shape.
//
// Reading the URL is intentionally one-shot (mount only) — once the user
// is interacting we own the truth and just write changes back.

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useCityScoringStore } from "@/stores/cityScoringStore";
import { sampleCities } from "@/data/cityData";

type MarketKey = { city: string; state: string };
type RankedLike = { city: string; state: string; id?: number };

export interface UseMarketSelectionArgs {
  topRanked: RankedLike | undefined;
  appliedWeights: unknown;
  appliedSubWeights: unknown;
}

export interface UseMarketSelectionResult {
  selectedMarketKey: MarketKey;
  effectiveMarketKey: MarketKey;
  userPickedMarket: boolean;
  autoFollowTop: boolean;
  pickMarket: (m: { city: string; state: string; id?: number | null }) => void;
  resetAutoFollow: () => void;
}

export function useMarketSelection(
  { topRanked, appliedWeights, appliedSubWeights }: UseMarketSelectionArgs,
): UseMarketSelectionResult {
  const selectedMarketKey = useCityScoringStore((s) => s.selectedMarketKey);
  const setSelectedMarketKey = useCityScoringStore((s) => s.setSelectedMarketKey);
  const setSelectedId = useCityScoringStore((s) => s.setSelectedId);

  const [userPickedMarket, setUserPickedMarket] = useState(false);
  const flip = useCallback((v: boolean) => setUserPickedMarket(v), []);

  const [searchParams, setSearchParams] = useSearchParams();

  // Mount hydration: read URL → pick market if present.
  useEffect(() => {
    const cityParam = searchParams.get("city");
    const stateParam = searchParams.get("state");
    if (cityParam) {
      // Legacy global-search deep link: numeric sample id.
      const asNum = Number(cityParam);
      if (Number.isFinite(asNum) && asNum > 0 && !stateParam) {
        const found = sampleCities.find((c) => c.id === asNum);
        if (found) {
          setSelectedId(found.id);
          setSelectedMarketKey({ city: found.city, state: found.state });
          flip(true);
          // Rewrite to the canonical shape so the URL is stable.
          const next = new URLSearchParams(searchParams);
          next.delete("city");
          next.set("city", found.city);
          next.set("state", found.state);
          setSearchParams(next, { replace: true });
          return;
        }
      }
      // Canonical shape: ?city=Houston&state=TX
      if (stateParam) {
        setSelectedMarketKey({ city: cityParam, state: stateParam });
        const sample = sampleCities.find((c) => c.city === cityParam && c.state === stateParam);
        if (sample) setSelectedId(sample.id);
        flip(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset auto-follow whenever the user re-applies weights.
  useEffect(() => {
    flip(false);
  }, [appliedWeights, appliedSubWeights, flip]);

  const pickMarket = useCallback(
    ({ city, state, id }: { city: string; state: string; id?: number | null }) => {
      setSelectedMarketKey({ city, state });
      if (typeof id === "number") setSelectedId(id);
      flip(true);
      const next = new URLSearchParams(searchParams);
      next.set("city", city);
      next.set("state", state);
      setSearchParams(next, { replace: true });
    },
    [setSelectedMarketKey, setSelectedId, flip, searchParams, setSearchParams],
  );

  const autoFollowTop = !userPickedMarket && !!topRanked;
  const effectiveMarketKey: MarketKey = autoFollowTop
    ? { city: topRanked!.city, state: topRanked!.state }
    : selectedMarketKey;

  return {
    selectedMarketKey,
    effectiveMarketKey,
    userPickedMarket,
    autoFollowTop,
    pickMarket,
    resetAutoFollow: () => flip(false),
  };
}
