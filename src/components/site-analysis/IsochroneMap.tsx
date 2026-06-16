import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapboxToken } from "@/hooks/useMapboxToken";

const NAVY = "#07142f";
const MUTED = "#526078";
const BORDER = "#eef2f7";
const SOFT = "#f7faff";
const BLUE = "#174be8";

interface IsochroneMapProps {
  /** Pin centerpoint (lng/lat). */
  center: { lat: number; lng: number };
  /** 10-min drive polygon (Mapbox GeoJSON Polygon). */
  iso10?: GeoJSON.Polygon | null;
  /** 15-min drive polygon. */
  iso15?: GeoJSON.Polygon | null;
  /** Optional place label rendered below the map. */
  place?: string;
  height?: number;
}

/**
 * Real Mapbox map with 10-min / 15-min drive isochrone overlays. Replaces the
 * schematic SVG ring that shipped in v0.3. The map is keyed to the center so
 * panning to a different candidate re-fits cleanly.
 */
export function IsochroneMap({
  center,
  iso10,
  iso15,
  place,
  height = 220,
}: IsochroneMapProps) {
  const token = useMapboxToken();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !containerRef.current) return;

    if (!mapboxgl.supported()) {
      setMapError("Map preview unavailable in this browser (WebGL disabled).");
      return;
    }

    mapboxgl.accessToken = token;

    let map: mapboxgl.Map | null = null;
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [center.lng, center.lat],
        zoom: 11.5,
        attributionControl: false,
        interactive: true,
      });
      mapRef.current = map;
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new mapboxgl.AttributionControl({ compact: true }));

      map.on("load", () => {
        // 15-min ring (outer, lighter).
        if (iso15) {
          map!.addSource("iso15", { type: "geojson", data: iso15 });
          map!.addLayer({
            id: "iso15-fill",
            type: "fill",
            source: "iso15",
            paint: { "fill-color": BLUE, "fill-opacity": 0.08 },
          });
          map!.addLayer({
            id: "iso15-line",
            type: "line",
            source: "iso15",
            paint: { "line-color": BLUE, "line-opacity": 0.45, "line-width": 1, "line-dasharray": [2, 2] },
          });
        }
        // 10-min ring (inner, stronger).
        if (iso10) {
          map!.addSource("iso10", { type: "geojson", data: iso10 });
          map!.addLayer({
            id: "iso10-fill",
            type: "fill",
            source: "iso10",
            paint: { "fill-color": BLUE, "fill-opacity": 0.18 },
          });
          map!.addLayer({
            id: "iso10-line",
            type: "line",
            source: "iso10",
            paint: { "line-color": BLUE, "line-opacity": 0.85, "line-width": 1.4 },
          });
        }
        // Fit to whichever ring we have.
        const bounds = new mapboxgl.LngLatBounds();
        const accumulate = (poly?: GeoJSON.Polygon | null) => {
          if (!poly?.coordinates?.[0]) return;
          for (const [x, y] of poly.coordinates[0]) bounds.extend([x, y]);
        };
        accumulate(iso15);
        accumulate(iso10);
        if (!bounds.isEmpty()) map!.fitBounds(bounds, { padding: 18, duration: 0 });
      });

      // Pin marker.
      new mapboxgl.Marker({ color: BLUE })
        .setLngLat([center.lng, center.lat])
        .addTo(map);
    } catch (err) {
      console.error("[IsochroneMap] Mapbox init failed:", err);
      setMapError("Map preview unavailable (error loading map).");
      if (map) {
        try { map.remove(); } catch (_) { /* noop */ }
      }
      mapRef.current = null;
      return;
    }

    return () => {
      map?.remove();
      mapRef.current = null;
    };
  }, [token, center.lat, center.lng, iso10, iso15]);

  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between text-[11px]" style={{ color: BLUE }}>
        <span className="font-semibold">10-min · 15-min drive isochrones</span>
        <span
          className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
          style={{ backgroundColor: "#dde7ff", color: BLUE }}
          title="Mapbox driving isochrones, rendered live"
        >
          Live Map
        </span>
      </div>
      {!token ? (
        <FallbackBox height={height} message="Loading map…" />
      ) : (
        <div
          ref={containerRef}
          className="overflow-hidden rounded-md border"
          style={{ borderColor: BORDER, height }}
        />
      )}
      {place && (
        <p className="mt-1 text-[10px]" style={{ color: MUTED }}>
          Centered on {place}
        </p>
      )}
    </div>
  );
}

function FallbackBox({ height, message }: { height: number; message: string }) {
  return (
    <div
      className="flex items-center justify-center overflow-hidden rounded-md border text-[11px]"
      style={{ borderColor: BORDER, backgroundColor: SOFT, color: MUTED, height }}
    >
      <span style={{ color: NAVY }}>{message}</span>
    </div>
  );
}
