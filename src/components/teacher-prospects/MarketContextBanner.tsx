import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { calibrateCompositeForDisplay } from "@/lib/marketView";
import { tierFromDisplayScore, type TierLetter } from "@/lib/cityTiers";

interface Props {
  /** Active city filter. 1 = single-market layout. ≥2 = multi-market chip layout. */
  cities: { city: string; state?: string | null }[];
  totalInMarket: number | null;
  emailReadyInMarket: number | null;
  inOutreachInMarket: number | null;
  onRemoveCity: (city: string) => void;
  onClearAll: () => void;
}

type CityMeta = {
  city: string;
  composite: number | null; // calibrated display score (0-100, school-grade scale)
  tier: TierLetter | null;
  population: number | null;
  state_abbr: string | null;
};

const tierColors: Record<TierLetter, string> = {
  A: "bg-emerald-100 text-emerald-700 border-emerald-200",
  B: "bg-amber-100 text-amber-700 border-amber-200",
  C: "bg-sky-100 text-sky-700 border-sky-200",
  D: "bg-slate-100 text-slate-600 border-slate-200",
};

export function MarketContextBanner({
  cities,
  totalInMarket,
  emailReadyInMarket,
  inOutreachInMarket,
  onRemoveCity,
  onClearAll,
}: Props) {
  const navigate = useNavigate();
  const [metas, setMetas] = useState<CityMeta[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (cities.length === 0) { setMetas([]); return; }
    (async () => {
      const cityNames = cities.map((c) => c.city);
      const { data } = await supabase
        .from("us_cities_scored")
        .select("city_name, composite_score_default, population, state_abbr, state_name")
        .in("city_name", cityNames);
      if (cancelled) return;
      const byCity = new Map<string, { composite_score_default: number | null; population: number | null; state_abbr: string | null }>();
      for (const row of (data ?? []) as Array<{ city_name: string; composite_score_default: number | null; population: number | null; state_abbr: string | null }>) {
        // first-match wins (avoid clobber across states)
        if (!byCity.has(row.city_name)) byCity.set(row.city_name, row);
      }
      setMetas(cities.map((c) => {
        const row = byCity.get(c.city);
        return {
          city: c.city,
          composite: row?.composite_score_default ?? null,
          tier: tierFromComposite(row?.composite_score_default ?? null),
          population: row?.population ?? null,
          state_abbr: row?.state_abbr ?? c.state ?? null,
        };
      }));
    })();
    return () => { cancelled = true; };
  }, [cities]);

  if (cities.length === 0) return null;

  const isSingle = cities.length === 1;
  const single = isSingle ? metas[0] : null;
  const composites = metas.map((m) => m.composite).filter((n): n is number => typeof n === "number");
  const compMin = composites.length ? Math.min(...composites) : null;
  const compMax = composites.length ? Math.max(...composites) : null;
  const popSum = metas.reduce((acc, m) => acc + (m.population ?? 0), 0);

  return (
    <div className="mb-3 rounded-xl border border-[#cfe0ff] bg-gradient-to-r from-[#eef4ff] to-[#f7faff] px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => navigate("/city-scoring")}
          className="inline-flex items-center gap-1 rounded-md border border-[#cfe0ff] bg-white px-2 py-1 text-[11px] font-semibold text-[#174be8] hover:bg-[#f4f7ff]"
        >
          <ArrowLeft size={12} /> City Search
        </button>

        {isSingle && single ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#07142f]">
              <MapPin size={14} className="text-[#174be8]" />
              {single.city}{single.state_abbr ? `, ${single.state_abbr}` : ""}
            </span>
            {single.tier && (
              <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tierColors[single.tier]}`}>
                Tier {single.tier}
              </span>
            )}
            {single.composite != null && (
              <span className="text-[11px] text-[#526078]">Composite <strong className="text-[#07142f]">{single.composite}</strong></span>
            )}
            {single.population != null && (
              <span className="text-[11px] text-[#526078]">Pop <strong className="text-[#07142f]">{single.population.toLocaleString()}</strong></span>
            )}
          </div>
        ) : (
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 pr-1 text-sm font-bold text-[#07142f]">
              <MapPin size={14} className="text-[#174be8]" />
              {cities.length} markets
            </span>
            {metas.map((m) => (
              <span
                key={m.city}
                className="inline-flex items-center gap-1 rounded-full border border-[#cfe0ff] bg-white px-2 py-0.5 text-[11px] font-medium text-[#07142f]"
              >
                {m.city}{m.state_abbr ? `, ${m.state_abbr}` : ""}
                <button
                  onClick={() => onRemoveCity(m.city)}
                  className="ml-0.5 text-[#8794ab] hover:text-[#07142f]"
                  title={`Remove ${m.city}`}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
            {compMin != null && compMax != null && (
              <span className="ml-1 text-[11px] text-[#526078]">
                Composite <strong className="text-[#07142f]">{compMin === compMax ? compMin : `${compMin}–${compMax}`}</strong>
              </span>
            )}
            {popSum > 0 && (
              <span className="text-[11px] text-[#526078]">· Pop <strong className="text-[#07142f]">{popSum.toLocaleString()}</strong></span>
            )}
          </div>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2 text-[11px] text-[#34445f]">
          {totalInMarket !== null && (
            <span><strong className="text-[#07142f]">{totalInMarket.toLocaleString()}</strong> teachers</span>
          )}
          {emailReadyInMarket !== null && (
            <span>· <strong className="text-emerald-700">{emailReadyInMarket.toLocaleString()}</strong> email-ready</span>
          )}
          {inOutreachInMarket !== null && inOutreachInMarket > 0 && (
            <span>· <strong className="text-[#174be8]">{inOutreachInMarket.toLocaleString()}</strong> in outreach</span>
          )}
          <button
            onClick={onClearAll}
            className="ml-1 inline-flex items-center gap-1 rounded-md border border-[#dbe4f2] bg-white px-2 py-1 text-[11px] font-medium text-[#526078] hover:bg-[#f4f7ff] hover:text-[#07142f]"
            title="Clear market filter and show all teachers"
          >
            <X size={11} /> Clear all
          </button>
        </div>
      </div>
    </div>
  );
}
