import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  city: string;
  state?: string | null;
  totalInMarket: number | null;
  emailReadyInMarket: number | null;
  inOutreachInMarket: number | null;
  onClear: () => void;
}

type CityMeta = {
  composite: number | null;
  tier: "A" | "B" | "C" | null;
  population: number | null;
  state_abbr: string | null;
};

function tierFromComposite(c: number | null): "A" | "B" | "C" | null {
  if (c == null) return null;
  if (c >= 80) return "A";
  if (c >= 60) return "B";
  return "C";
}

const tierColors: Record<"A" | "B" | "C", string> = {
  A: "bg-emerald-100 text-emerald-700 border-emerald-200",
  B: "bg-amber-100 text-amber-700 border-amber-200",
  C: "bg-slate-100 text-slate-700 border-slate-200",
};

export function MarketContextBanner({ city, state, totalInMarket, emailReadyInMarket, inOutreachInMarket, onClear }: Props) {
  const navigate = useNavigate();
  const [meta, setMeta] = useState<CityMeta | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let q = supabase
        .from("us_cities_scored")
        .select("composite_score_default, population, state_abbr, state_name")
        .ilike("city_name", city)
        .limit(1);
      if (state) {
        // match either abbr or full name
        q = q.or(`state_abbr.ilike.${state},state_name.ilike.${state}`);
      }
      const { data } = await q;
      if (cancelled) return;
      const row = data?.[0] as { composite_score_default: number | null; population: number | null; state_abbr: string | null } | undefined;
      if (row) {
        setMeta({
          composite: row.composite_score_default,
          tier: tierFromComposite(row.composite_score_default),
          population: row.population,
          state_abbr: row.state_abbr,
        });
      } else {
        setMeta({ composite: null, tier: null, population: null, state_abbr: null });
      }
    })();
    return () => { cancelled = true; };
  }, [city, state]);

  const stateLabel = meta?.state_abbr ?? state ?? "";

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-[#cfe0ff] bg-gradient-to-r from-[#eef4ff] to-[#f7faff] px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <button
        onClick={() => navigate("/city-scoring")}
        className="inline-flex items-center gap-1 rounded-md border border-[#cfe0ff] bg-white px-2 py-1 text-[11px] font-semibold text-[#174be8] hover:bg-[#f4f7ff]"
      >
        <ArrowLeft size={12} /> City Search
      </button>

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#07142f]">
          <MapPin size={14} className="text-[#174be8]" />
          {city}{stateLabel ? `, ${stateLabel}` : ""}
        </span>

        {meta?.tier && (
          <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tierColors[meta.tier]}`}>
            Tier {meta.tier}
          </span>
        )}
        {meta?.composite != null && (
          <span className="text-[11px] text-[#526078]">Composite <strong className="text-[#07142f]">{meta.composite}</strong></span>
        )}
        {meta?.population != null && (
          <span className="text-[11px] text-[#526078]">Pop <strong className="text-[#07142f]">{meta.population.toLocaleString()}</strong></span>
        )}
      </div>

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
          onClick={onClear}
          className="ml-1 inline-flex items-center gap-1 rounded-md border border-[#dbe4f2] bg-white px-2 py-1 text-[11px] font-medium text-[#526078] hover:bg-[#f4f7ff] hover:text-[#07142f]"
          title="Clear market filter and show all teachers"
        >
          <X size={11} /> Clear
        </button>
      </div>
    </div>
  );
}
