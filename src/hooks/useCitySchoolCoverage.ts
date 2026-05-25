// ============================================================================
// useCitySchoolCoverage
//
// Single-query aggregator that returns, per (city, state), how many teacher
// prospects we have, how many carry a free-text school name, and how many are
// linked to a row in `public_schools` via `school_nces_id`.
//
// Used in two places:
//   - /observability Advanced Mode → per-city school coverage panel.
//   - /city-scoring CityTable     → small "school match" badge on each row.
//
// One fetch covers every city the user has touched; we keep it client-side
// joined since the data is tiny (one row per city with teachers, ~dozens).
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CitySchoolCoverage {
  city: string;
  state: string;
  totalTeachers: number;
  withSchoolName: number;
  linkedToSchool: number;
}

export interface CitySchoolCoverageMap {
  byKey: Map<string, CitySchoolCoverage>;          // `${cityLower}|${stateLower}`
  byCityLower: Map<string, CitySchoolCoverage>;    // fallback when state is unknown
  list: CitySchoolCoverage[];
  loading: boolean;
  error: string | null;
}

function keyOf(city: string, state: string) {
  return `${city.trim().toLowerCase()}|${state.trim().toLowerCase()}`;
}

export function useCitySchoolCoverage(): CitySchoolCoverageMap {
  const [list, setList] = useState<CitySchoolCoverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      // We pull only the three columns we need. Supabase has a 1000-row default
      // cap on SELECT, so we page through until exhausted. In practice the
      // teacher_prospects table is ~170K rows but we only need to aggregate.
      const PAGE = 1000;
      let from = 0;
      const agg = new Map<string, CitySchoolCoverage>();
      while (true) {
        const { data, error } = await supabase
          .from("teacher_prospects")
          .select("city,state,school,school_nces_id")
          .range(from, from + PAGE - 1);
        if (error) {
          if (!cancelled) {
            setError(error.message);
            setLoading(false);
          }
          return;
        }
        if (!data || data.length === 0) break;
        for (const r of data) {
          const city = (r.city ?? "").trim();
          const state = (r.state ?? "").trim();
          if (!city) continue;
          const k = keyOf(city, state);
          const cur = agg.get(k) ?? {
            city,
            state,
            totalTeachers: 0,
            withSchoolName: 0,
            linkedToSchool: 0,
          };
          cur.totalTeachers += 1;
          if (r.school && String(r.school).trim() !== "") cur.withSchoolName += 1;
          if (r.school_nces_id) cur.linkedToSchool += 1;
          agg.set(k, cur);
        }
        if (data.length < PAGE) break;
        from += PAGE;
      }
      if (cancelled) return;
      setList(Array.from(agg.values()).sort((a, b) => b.totalTeachers - a.totalTeachers));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    const byKey = new Map<string, CitySchoolCoverage>();
    const byCityLower = new Map<string, CitySchoolCoverage>();
    for (const c of list) {
      byKey.set(keyOf(c.city, c.state), c);
      // If two states share a city name the first wins for the fallback map;
      // that's fine because CityTable always has a state to disambiguate.
      if (!byCityLower.has(c.city.toLowerCase())) {
        byCityLower.set(c.city.toLowerCase(), c);
      }
    }
    return { byKey, byCityLower, list, loading, error };
  }, [list, loading, error]);
}

export function lookupCoverage(
  map: CitySchoolCoverageMap,
  city: string,
  state: string,
): CitySchoolCoverage | undefined {
  if (!city) return undefined;
  return (
    map.byKey.get(keyOf(city, state)) ??
    map.byCityLower.get(city.trim().toLowerCase())
  );
}
