import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import type { RankedMarket } from "@/lib/cityScoringLiveData";

const TIER_COLOR: Record<string, string> = {
  A: "#0ea66e",
  B: "#174be8",
  C: "#b8860b",
  D: "#ea580c",
};

interface Props {
  markets: RankedMarket[];
  onSelect: (m: RankedMarket) => void;
}

type Coords = { lat: number; lng: number };

function FitBounds({ points }: { points: Coords[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 9);
      return;
    }
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    map.fitBounds(
      [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ],
      { padding: [30, 30] },
    );
  }, [points, map]);
  return null;
}

export function MarketsMap({ markets, onSelect }: Props) {
  const [coordsByCityId, setCoordsByCityId] = useState<Record<string, Coords>>({});
  const [loading, setLoading] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  const cityIds = useMemo(
    () => markets.map((m) => m.cityId).filter((x): x is string => !!x),
    [markets],
  );

  useEffect(() => {
    if (cityIds.length === 0) {
      setCoordsByCityId({});
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("cities")
      .select("id, latitude, longitude")
      .in("id", cityIds)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("MarketsMap coords load error", error);
          setLoading(false);
          return;
        }
        const map: Record<string, Coords> = {};
        (data ?? []).forEach((row: any) => {
          if (row.latitude != null && row.longitude != null) {
            map[row.id] = { lat: Number(row.latitude), lng: Number(row.longitude) };
          }
        });
        setCoordsByCityId(map);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [cityIds.join("|")]);

  const mapped = markets
    .map((m) => (m.cityId && coordsByCityId[m.cityId] ? { m, c: coordsByCityId[m.cityId] } : null))
    .filter((x): x is { m: RankedMarket; c: Coords } => !!x);

  const unmappedCount = markets.length - mapped.length;
  const points = mapped.map((x) => x.c);

  const handleBackfill = async () => {
    setBackfilling(true);
    try {
      // Edge function rate-limits to ~1.1s per city; keep batch small to avoid timeout.
      const { data, error } = await supabase.functions.invoke("backfill-city-coordinates", {
        body: { limit: 25 },
      });
      if (error) throw error;
      const updated = (data as any)?.updated ?? 0;
      const processed = (data as any)?.processed ?? 0;
      const failures = (data as any)?.failures ?? [];
      if (processed === 0) {
        toast.success("All cities already have coordinates.");
      } else {
        toast.success(`Geocoded ${updated}/${processed} cities${failures.length ? ` • ${failures.length} failed` : ""}. Run again for more.`);
        if (failures.length) console.warn("Backfill failures:", failures);
      }
      // Refetch coords for the cities currently in view.
      if (cityIds.length > 0) {
        const { data: refresh } = await supabase
          .from("cities")
          .select("id, latitude, longitude")
          .in("id", cityIds);
        const map: Record<string, Coords> = {};
        (refresh ?? []).forEach((row: any) => {
          if (row.latitude != null && row.longitude != null) {
            map[row.id] = { lat: Number(row.latitude), lng: Number(row.longitude) };
          }
        });
        setCoordsByCityId(map);
      }
    } catch (e) {
      console.error(e);
      toast.error("Backfill failed: " + (e as Error).message);
    } finally {
      setBackfilling(false);
    }
  };

  return (
    <div className="rounded-lg border border-[#eef2f7] bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#07142f]">Markets Map</h3>
          <p className="text-[11px] text-[#8794ab]">
            {mapped.length} of {markets.length} markets mapped
            {unmappedCount > 0 && ` • ${unmappedCount} missing coordinates`}
          </p>
        </div>
        {unmappedCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            disabled={backfilling}
            onClick={handleBackfill}
            className="h-8 border-[#dbe4f2] text-[#174be8] gap-1.5 text-[11px]"
          >
            <RefreshCw size={12} className={backfilling ? "animate-spin" : ""} />
            {backfilling ? "Geocoding…" : "Backfill Coordinates"}
          </Button>
        )}
      </div>

      <div className="h-[520px] w-full overflow-hidden rounded-md border border-[#eef2f7]">
        {loading && Object.keys(coordsByCityId).length === 0 ? (
          <div className="flex h-full items-center justify-center text-[12px] text-[#8794ab]">Loading map…</div>
        ) : mapped.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center px-6">
            <p className="text-[13px] font-semibold text-[#07142f] mb-1">No mapped cities yet</p>
            <p className="text-[11px] text-[#526078] mb-3">Click “Backfill Coordinates” to geocode this batch (~1s per city).</p>
            <Button onClick={handleBackfill} disabled={backfilling} className="bg-[#174be8] hover:bg-[#1240c9] text-white">
              {backfilling ? "Geocoding…" : "Backfill Coordinates"}
            </Button>
          </div>
        ) : (
          <MapContainer center={[39.5, -98.35]} zoom={4} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds points={points} />
            {mapped.map(({ m, c }) => {
              const color = m.hasLiveData ? (TIER_COLOR[m.tier] ?? "#8794ab") : "#cbd5e1";
              return (
                <CircleMarker
                  key={m.cityId}
                  center={[c.lat, c.lng]}
                  radius={m.hasLiveData ? 8 : 5}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.75, weight: 2 }}
                >
                  <Popup>
                    <div className="space-y-1 text-[12px]">
                      <div className="font-bold text-[#07142f]">{m.city}, {m.state}</div>
                      {m.metroArea && <div className="text-[10px] text-[#8794ab]">{m.metroArea}</div>}
                      <div className="flex items-center gap-2 pt-1">
                        <span className="font-bold text-[#07142f]">
                          {m.hasLiveData ? `${m.compositeScore}/100` : "No data"}
                        </span>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: color }}>
                          {m.hasLiveData ? `Tier ${m.tier}` : "—"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelect(m)}
                        className="mt-1 text-[11px] font-semibold text-[#174be8] hover:underline"
                      >
                        View details →
                      </button>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        )}
      </div>
    </div>
  );
}
