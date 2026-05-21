import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, MapPin, Loader2 } from "lucide-react";

export interface RailCity {
  city: string;
  state: string | null;
  composite: number | null;
  total: number;        // teacher_prospects in this city
  enriched: number;
  active: boolean;
}

interface Props {
  cityFilters: string[];
  onPick: (city: string, state: string | null) => void;
  onAddMore: () => void;
}

export function CitySearchRail({ cityFilters, onPick, onAddMore }: Props) {
  const [items, setItems] = useState<RailCity[] | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setItems(null);
      // 1. Gather candidate cities: current filters + user's watchlist + top scored seeded with teacher rows.
      const candidates = new Map<string, { city: string; state: string | null; composite: number | null }>();

      // a) current filters — resolve to state via us_cities_scored
      if (cityFilters.length > 0) {
        const { data } = await supabase
          .from("us_cities_scored")
          .select("city_name, state_abbr, composite_score_default")
          .in("city_name", cityFilters);
        const byCity = new Map((data ?? []).map((r) => [r.city_name, r] as const));
        for (const c of cityFilters) {
          const row = byCity.get(c);
          candidates.set(c, {
            city: c,
            state: row?.state_abbr ?? null,
            composite: row?.composite_score_default ?? null,
          });
        }
      }

      // b) watchlist
      const { data: wl } = await supabase
        .from("watchlist_items")
        .select("city_id, us_cities_scored:city_id ( city_name, state_abbr, composite_score_default )")
        .limit(20);
      for (const w of (wl ?? []) as Array<{ us_cities_scored: { city_name: string; state_abbr: string; composite_score_default: number | null } | null }>) {
        const u = w.us_cities_scored;
        if (u && !candidates.has(u.city_name)) {
          candidates.set(u.city_name, { city: u.city_name, state: u.state_abbr, composite: u.composite_score_default });
        }
      }

      // c) top Tier-A cities that have teachers
      if (candidates.size < 8) {
        const { data: topCities } = await supabase
          .from("us_cities_scored")
          .select("city_name, state_abbr, composite_score_default")
          .order("composite_score_default", { ascending: false, nullsFirst: false })
          .limit(50);
        for (const c of topCities ?? []) {
          if (candidates.size >= 8) break;
          if (!candidates.has(c.city_name)) {
            candidates.set(c.city_name, { city: c.city_name, state: c.state_abbr, composite: c.composite_score_default });
          }
        }
      }

      const cityNames = Array.from(candidates.keys());
      if (cityNames.length === 0) {
        if (!cancel) setItems([]);
        return;
      }

      // 2. Pull teacher counts for those cities.
      const { data: tp } = await supabase
        .from("teacher_prospects")
        .select("city, email, verification_status, needs_email_enrichment")
        .in("city", cityNames)
        .limit(5000);

      const agg = new Map<string, { total: number; enriched: number }>();
      for (const t of (tp ?? []) as Array<{ city: string; email: string | null; verification_status: string | null; needs_email_enrichment: boolean | null }>) {
        const cur = agg.get(t.city) ?? { total: 0, enriched: 0 };
        cur.total += 1;
        if (!t.needs_email_enrichment && (t.email ?? "").length > 0) cur.enriched += 1;
        agg.set(t.city, cur);
      }

      const out: RailCity[] = cityNames.map((name) => {
        const cand = candidates.get(name)!;
        const a = agg.get(name) ?? { total: 0, enriched: 0 };
        return {
          city: cand.city,
          state: cand.state,
          composite: cand.composite,
          total: a.total,
          enriched: a.enriched,
          active: cityFilters.includes(name),
        };
      });

      // Sort: active first, then by teacher count desc, then composite desc.
      out.sort((a, b) => Number(b.active) - Number(a.active) || b.total - a.total || (b.composite ?? 0) - (a.composite ?? 0));

      if (!cancel) setItems(out);
    })();
    return () => { cancel = true; };
  }, [cityFilters]);

  if (items !== null && items.length === 0) return null;

  return (
    <div className="mb-3 rounded-xl border border-[#e7edf5] bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="text-[11px] font-bold uppercase tracking-wide text-[#66728a]">Markets</div>
        <span className="text-[10.5px] text-[#8794ab]">tap a tile to focus the list</span>
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {items === null ? (
          <div className="flex items-center gap-2 px-3 py-4 text-xs text-[#8794ab]">
            <Loader2 size={14} className="animate-spin" /> Loading markets…
          </div>
        ) : (
          items.map((it) => (
            <button
              key={`${it.city}-${it.state}`}
              onClick={() => onPick(it.city, it.state)}
              className={`shrink-0 min-w-[160px] rounded-lg border p-2.5 text-left transition ${
                it.active
                  ? "border-[#174be8] bg-[#eef4ff] ring-1 ring-[#174be8]/20"
                  : "border-[#e7edf5] bg-white hover:border-[#bfd0f0] hover:bg-[#f4f7ff]"
              }`}
            >
              <div className="flex items-center gap-1 text-[11px] text-[#66728a]">
                <MapPin size={10} />
                <span className="truncate">{it.state ?? "—"}</span>
                {typeof it.composite === "number" && (
                  <span className="ml-auto rounded-full bg-[#f0f4fb] px-1.5 py-0.5 text-[10px] font-bold text-[#34445f]">{it.composite}</span>
                )}
              </div>
              <div className="mt-0.5 truncate text-[13px] font-bold text-[#07142f]">{it.city}</div>
              <div className="mt-1 flex items-baseline gap-2 text-[11px]">
                <span className="font-bold text-[#07142f]">{it.total.toLocaleString()}</span>
                <span className="text-[#66728a]">teachers</span>
              </div>
              <div className="mt-0.5 text-[10.5px] text-[#0a8f5a]">
                {it.total > 0 ? `${Math.round((it.enriched / it.total) * 100)}% enriched` : "no teachers yet"}
              </div>
            </button>
          ))
        )}
        <button
          onClick={onAddMore}
          className="shrink-0 min-w-[120px] rounded-lg border border-dashed border-[#bfd0f0] bg-white p-2.5 text-left text-[12px] font-medium text-[#174be8] hover:bg-[#f4f7ff]"
        >
          <Plus size={14} className="mb-1" />
          Add market
        </button>
      </div>
    </div>
  );
}
