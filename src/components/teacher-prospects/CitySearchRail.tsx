import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, MapPin, Loader2, Info, Send, Star, Trophy, Filter } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// A market tile can come from one of four sources. The badge on each tile
// explains *why* it's shown so the user is never guessing.
type RailSource = "active" | "watchlist" | "outreach" | "tier_a";

export interface RailCity {
  city: string;
  state: string | null;
  composite: number | null;
  total: number;        // teacher_prospects in this city
  enriched: number;
  inOutreach: number;   // teachers currently in outreach_queue
  source: RailSource;
  active: boolean;
}

interface Props {
  cityFilters: string[];
  onPick: (city: string, state: string | null) => void;
  onAddMore: () => void;
}

const SOURCE_META: Record<RailSource, { label: string; color: string; icon: typeof Filter }> = {
  active:    { label: "Active filter", color: "#174be8", icon: Filter },
  outreach:  { label: "In Outreach",   color: "#b7791f", icon: Send },
  watchlist: { label: "Watchlist",     color: "#7c3aed", icon: Star },
  tier_a:    { label: "Top Tier-A",    color: "#0a8f5a", icon: Trophy },
};

export function CitySearchRail({ cityFilters, onPick, onAddMore }: Props) {
  const [items, setItems] = useState<RailCity[] | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setItems(null);
      // 1. Gather candidate cities and remember WHY each one was picked.
      const candidates = new Map<string, { city: string; state: string | null; composite: number | null; source: RailSource }>();
      const setIfNew = (key: string, val: { city: string; state: string | null; composite: number | null; source: RailSource }) => {
        if (!candidates.has(key)) candidates.set(key, val);
      };

      // a) current filters
      if (cityFilters.length > 0) {
        const { data } = await supabase
          .from("us_cities_scored")
          .select("city_name, state_abbr, composite_score_default")
          .in("city_name", cityFilters);
        const byCity = new Map((data ?? []).map((r) => [r.city_name, r] as const));
        for (const c of cityFilters) {
          const row = byCity.get(c);
          setIfNew(c, { city: c, state: row?.state_abbr ?? null, composite: row?.composite_score_default ?? null, source: "active" });
        }
      }

      // b) cities with teachers already in the outreach queue — bridges Email Outreach
      const { data: oqRows } = await supabase
        .from("outreach_queue")
        .select("teacher_prospects!inner(city, state)")
        .in("state", ["queued", "assigned", "sending", "sent"])
        .limit(500);
      const outreachCityCount = new Map<string, number>();
      for (const r of (oqRows ?? []) as Array<{ teacher_prospects: { city: string; state: string | null } | null }>) {
        const c = r.teacher_prospects?.city;
        if (!c) continue;
        outreachCityCount.set(c, (outreachCityCount.get(c) ?? 0) + 1);
      }
      const outreachCities = Array.from(outreachCityCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([city]) => city);
      if (outreachCities.length > 0) {
        const { data: ocScored } = await supabase
          .from("us_cities_scored")
          .select("city_name, state_abbr, composite_score_default")
          .in("city_name", outreachCities);
        const byCity = new Map((ocScored ?? []).map((r) => [r.city_name, r] as const));
        for (const c of outreachCities) {
          const row = byCity.get(c);
          setIfNew(c, { city: c, state: row?.state_abbr ?? null, composite: row?.composite_score_default ?? null, source: "outreach" });
        }
      }

      // c) watchlist
      const { data: wl } = await supabase.from("watchlist_items").select("city_id").limit(20);
      const watchlistIds = (wl ?? []).map((w) => (w as { city_id: string }).city_id);
      if (watchlistIds.length > 0) {
        const { data: wlCities } = await supabase
          .from("us_cities_scored")
          .select("city_name, state_abbr, composite_score_default")
          .in("id", watchlistIds);
        for (const u of (wlCities ?? []) as Array<{ city_name: string; state_abbr: string; composite_score_default: number | null }>) {
          setIfNew(u.city_name, { city: u.city_name, state: u.state_abbr, composite: u.composite_score_default, source: "watchlist" });
        }
      }

      // d) fill up to 8 with top Tier-A cities
      if (candidates.size < 8) {
        const { data: topCities } = await supabase
          .from("us_cities_scored")
          .select("city_name, state_abbr, composite_score_default")
          .order("composite_score_default", { ascending: false, nullsFirst: false })
          .limit(50);
        for (const c of topCities ?? []) {
          if (candidates.size >= 8) break;
          setIfNew(c.city_name, { city: c.city_name, state: c.state_abbr, composite: c.composite_score_default, source: "tier_a" });
        }
      }

      const cityNames = Array.from(candidates.keys());
      if (cityNames.length === 0) { if (!cancel) setItems([]); return; }

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
          inOutreach: outreachCityCount.get(name) ?? 0,
          source: cand.source,
          active: cityFilters.includes(name),
        };
      });

      // Sort: active first → in-outreach → has teachers → composite
      const sourceRank: Record<RailSource, number> = { active: 0, outreach: 1, watchlist: 2, tier_a: 3 };
      out.sort((a, b) =>
        Number(b.active) - Number(a.active) ||
        sourceRank[a.source] - sourceRank[b.source] ||
        b.inOutreach - a.inOutreach ||
        b.total - a.total ||
        (b.composite ?? 0) - (a.composite ?? 0),
      );

      if (!cancel) setItems(out);
    })();
    return () => { cancel = true; };
  }, [cityFilters]);

  if (items !== null && items.length === 0) return null;

  return (
    <div className="mb-3 rounded-xl border border-[#e7edf5] bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-[#66728a]">Markets</div>
          <Popover>
            <PopoverTrigger className="text-[#8794ab] hover:text-[#174be8]" aria-label="How markets are chosen">
              <Info size={12} />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 bg-white p-3 text-xs text-[#34445f]">
              <div className="mb-2 font-bold text-[#07142f]">Why these markets?</div>
              <p className="mb-2 text-[#526078]">
                Up to 8 tiles, chosen in this priority order:
              </p>
              <ul className="space-y-1.5">
                {(Object.keys(SOURCE_META) as RailSource[]).map((k) => {
                  const m = SOURCE_META[k];
                  const Icon = m.icon;
                  const desc: Record<RailSource, string> = {
                    active: "Cities you're currently filtering on.",
                    outreach: "Cities with teachers already in the Email Outreach queue (queued, sending, or sent in SmartLead).",
                    watchlist: "Cities you saved from City Search.",
                    tier_a: "Highest composite scores — used to fill remaining slots.",
                  };
                  return (
                    <li key={k} className="flex gap-2">
                      <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded" style={{ backgroundColor: `${m.color}1a`, color: m.color }}>
                        <Icon size={9} />
                      </span>
                      <span><b style={{ color: m.color }}>{m.label}</b> — {desc[k]}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-[10.5px] text-[#8794ab]">"In Outreach" counts come from outreach_queue, not raw SmartLead campaign size.</p>
            </PopoverContent>
          </Popover>
        </div>
        <span className="text-[10.5px] text-[#8794ab]">tap a tile to focus the list</span>
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {items === null ? (
          <div className="flex items-center gap-2 px-3 py-4 text-xs text-[#8794ab]">
            <Loader2 size={14} className="animate-spin" /> Loading markets…
          </div>
        ) : (
          items.map((it) => {
            const meta = SOURCE_META[it.source];
            const Icon = meta.icon;
            return (
              <button
                key={`${it.city}-${it.state}`}
                onClick={() => onPick(it.city, it.state)}
                title={`${meta.label} · ${it.city}${it.state ? `, ${it.state}` : ""}`}
                className={`shrink-0 min-w-[172px] rounded-lg border p-2.5 text-left transition ${
                  it.active
                    ? "border-[#174be8] bg-[#eef4ff] ring-1 ring-[#174be8]/20"
                    : "border-[#e7edf5] bg-white hover:border-[#bfd0f0] hover:bg-[#f4f7ff]"
                }`}
              >
                <div className="mb-1 flex items-center gap-1">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide"
                    style={{ backgroundColor: `${meta.color}14`, color: meta.color }}
                  >
                    <Icon size={9} /> {meta.label}
                  </span>
                  {typeof it.composite === "number" && (
                    <span className="ml-auto rounded-full bg-[#f0f4fb] px-1.5 py-0.5 text-[10px] font-bold text-[#34445f]">{it.composite}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-[#66728a]">
                  <MapPin size={10} />
                  <span className="truncate">{it.state ?? "—"}</span>
                </div>
                <div className="mt-0.5 truncate text-[13px] font-bold text-[#07142f]">{it.city}</div>
                <div className="mt-1 flex items-baseline gap-2 text-[11px]">
                  <span className="font-bold text-[#07142f]">{it.total.toLocaleString()}</span>
                  <span className="text-[#66728a]">teachers</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[10.5px]">
                  <span className="text-[#0a8f5a]">
                    {it.total > 0 ? `${Math.round((it.enriched / it.total) * 100)}% enriched` : "no teachers yet"}
                  </span>
                  {it.inOutreach > 0 && (
                    <span className="inline-flex items-center gap-0.5 font-medium text-[#b7791f]">
                      <Send size={9} /> {it.inOutreach} in outreach
                    </span>
                  )}
                </div>
              </button>
            );
          })
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
