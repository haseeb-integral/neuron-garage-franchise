import { useState } from "react";
import { useMapboxToken } from "@/hooks/useMapboxToken";

const NAVY = "#07142f";
const MUTED = "#526078";
const BORDER = "#eef2f7";
const SOFT = "#f7faff";
const BLUE = "#174be8";

interface IsochroneMapProps {
  center: { lat: number; lng: number };
  iso10?: GeoJSON.Polygon | null;
  iso15?: GeoJSON.Polygon | null;
  place?: string;
  height?: number;
}

/**
 * Static Mapbox image preview with 10-min / 15-min drive isochrone overlays.
 * Uses the Mapbox Static Images API (plain PNG) — no WebGL required, so it
 * renders reliably in locked-down browsers, mobile, and the Lovable preview.
 */
export function IsochroneMap({
  center,
  iso10,
  iso15,
  place,
  height = 220,
}: IsochroneMapProps) {
  const token = useMapboxToken();
  const [imgError, setImgError] = useState(false);

  const url = token ? buildStaticUrl({ center, iso10, iso15, token }) : null;

  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between text-[11px]" style={{ color: BLUE }}>
        <span className="font-semibold">10-min · 15-min drive isochrones</span>
        <span
          className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
          style={{ backgroundColor: "#dde7ff", color: BLUE }}
          title="Mapbox static map with drive-time overlays"
        >
          Map
        </span>
      </div>
      {!token ? (
        <FallbackBox height={height} message="Loading map…" />
      ) : imgError || !url ? (
        <FallbackBox height={height} message="Map preview unavailable." />
      ) : (
        <img
          src={url}
          alt={place ? `Drive-time map for ${place}` : "Drive-time map"}
          onError={() => setImgError(true)}
          className="block w-full overflow-hidden rounded-md border object-cover"
          style={{ borderColor: BORDER, height }}
          loading="lazy"
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

/** Downsample a ring so the resulting Static API URL stays under the ~8KB limit. */
function simplifyRing(ring: number[][], maxPoints: number): number[][] {
  if (ring.length <= maxPoints) return ring;
  const step = Math.ceil(ring.length / maxPoints);
  const out: number[][] = [];
  for (let i = 0; i < ring.length; i += step) out.push(ring[i]);
  // Ensure closed ring.
  if (out[0] && out[out.length - 1] && (out[0][0] !== out[out.length - 1][0] || out[0][1] !== out[out.length - 1][1])) {
    out.push(out[0]);
  }
  return out;
}

function round(n: number, p = 4): number {
  const f = Math.pow(10, p);
  return Math.round(n * f) / f;
}

export function buildStaticUrl({
  center,
  iso10,
  iso15,
  token,
}: {
  center: { lat: number; lng: number };
  iso10?: GeoJSON.Polygon | null;
  iso15?: GeoJSON.Polygon | null;
  token: string;
}): string | null {
  const overlays: string[] = [];

  const toFeature = (
    poly: GeoJSON.Polygon,
    stroke: string,
    strokeOpacity: number,
    fill: string,
    fillOpacity: number,
    strokeWidth: number,
  ): string => {
    const ring = simplifyRing(poly.coordinates?.[0] ?? [], 40).map(([x, y]) => [round(x), round(y)]);
    const feature = {
      type: "Feature",
      properties: {
        stroke,
        "stroke-width": strokeWidth,
        "stroke-opacity": strokeOpacity,
        fill,
        "fill-opacity": fillOpacity,
      },
      geometry: { type: "Polygon", coordinates: [ring] },
    };
    return `geojson(${encodeURIComponent(JSON.stringify(feature))})`;
  };

  if (iso15?.coordinates?.[0]) {
    overlays.push(toFeature(iso15, BLUE, 0.5, BLUE, 0.08, 1));
  }
  if (iso10?.coordinates?.[0]) {
    overlays.push(toFeature(iso10, BLUE, 0.9, BLUE, 0.18, 1.4));
  }
  // Pin marker last so it sits on top.
  overlays.push(`pin-s+174be8(${round(center.lng, 5)},${round(center.lat, 5)})`);

  const path = overlays.join(",");
  const viewport = iso15 || iso10 ? "auto" : `${round(center.lng, 5)},${round(center.lat, 5)},11.5`;
  const url = `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/${path}/${viewport}/600x300@2x?access_token=${token}&attribution=false&logo=false`;

  // Static Images API rejects URLs > ~8192 chars. If we blew the budget, drop iso15 then iso10.
  if (url.length <= 8000) return url;
  if (iso10 && iso15) return buildStaticUrl({ center, iso10, iso15: null, token });
  if (iso10) return buildStaticUrl({ center, iso10: null, iso15: null, token });
  return url;
}
