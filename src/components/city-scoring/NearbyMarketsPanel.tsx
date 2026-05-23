import { useEffect, useState } from "react";
import { getNearbyMarkets, type NearbyMarket } from "@/lib/cityScoringLiveData";

interface Props {
  cityId: string | null | undefined;
  state: string;
  metroArea: string | null | undefined;
  refreshKey?: number;
  onSelect: (m: NearbyMarket) => void;
}

const TIER_BG: Record<string, string> = {
  A: "#0ea66e",
  B: "#174be8",
  C: "#b8860b",
  D: "#ea580c",
};

export function NearbyMarketsPanel({ cityId, state, metroArea, refreshKey = 0, onSelect }: Props) {
  const [rows, setRows] = useState<NearbyMarket[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cityId) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getNearbyMarkets({ cityId, state, metroArea: metroArea ?? null, limit: 5 })
      .then((r) => { if (!cancelled) setRows(r); })
      .catch((e) => console.error("getNearbyMarkets error", e))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [cityId, state, metroArea, refreshKey]);

  return (
    <div className="rounded-lg bg-white border border-[#eef2f7] p-3 flex-1">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-bold text-[#07142f]">Nearby Markets</h4>
        {metroArea && (
          <span className="text-[9.5px] text-[#8794ab] truncate ml-2 max-w-[140px]" title={metroArea}>{metroArea}</span>
        )}
      </div>
      {loading && rows.length === 0 ? (
        <div className="py-6 text-center text-[11px] text-[#8794ab]">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-[#dbe4f2] bg-[#f7faff] px-3 py-4 text-center">
          <p className="text-[11px] text-[#526078]">No nearby markets with data yet.</p>
          <p className="mt-1 text-[10px] text-[#8794ab]">Refresh other cities in {state} to populate this list.</p>
        </div>
      ) : (
        <ul className="space-y-1">
          {rows.map((m, i) => (
            <li key={m.cityId}>
              <button
                type="button"
                onClick={() => onSelect(m)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#f7faff] text-left"
              >
                <span className="text-[10px] text-[#8794ab] w-3 tabular-nums">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11.5px] font-semibold text-[#07142f]">
                    {m.city}, {m.state === "Texas" ? "TX" : m.state === "Florida" ? "FL" : m.state}
                  </div>
                  {m.county && (
                    <div className="truncate text-[9.5px] text-[#8794ab]">{m.county}</div>
                  )}
                </div>
                <span className="text-[11px] font-bold text-[#07142f] tabular-nums">{buildMarketView(m).compositeFormatted}</span>
                <span
                  className="flex items-center justify-center rounded-full text-[9px] font-bold text-white flex-shrink-0"
                  style={{ width: 16, height: 16, backgroundColor: TIER_BG[m.tier] ?? "#8794ab" }}
                >
                  {m.tier}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
