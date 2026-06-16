// Mapbox adapter for Site Analysis (1B). Isolated so swapping vendors only
// touches this file.
const MAPBOX_TOKEN = Deno.env.get("MAPBOX_TOKEN");

if (!MAPBOX_TOKEN) {
  console.warn("[sas] MAPBOX_TOKEN missing — Mapbox calls will fail");
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  placeName: string;
  stateCode: string | null; // 2-letter, e.g. "TX"
}

export async function geocode(address: string): Promise<GeocodeResult> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?limit=1&country=us&access_token=${MAPBOX_TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mapbox geocode ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const f = data?.features?.[0];
  if (!f) throw new Error(`Mapbox geocode: no result for "${address}"`);
  const [lng, lat] = f.center;
  // Pull state from context (e.g. short_code "US-TX") or top-level if region.
  let stateCode: string | null = null;
  const ctx: Array<{ id?: string; short_code?: string }> = f.context ?? [];
  for (const c of ctx) {
    if (c.id?.startsWith("region") && typeof c.short_code === "string") {
      const m = c.short_code.match(/US-([A-Z]{2})/);
      if (m) { stateCode = m[1]; break; }
    }
  }
  if (!stateCode && f.id?.startsWith("region") && typeof f.properties?.short_code === "string") {
    const m = f.properties.short_code.match(/US-([A-Z]{2})/);
    if (m) stateCode = m[1];
  }
  return { lat, lng, placeName: f.place_name, stateCode };
}

export async function isochrone(
  lat: number,
  lng: number,
  minutes: 10 | 15,
): Promise<GeoJSON.Polygon> {
  const url = `https://api.mapbox.com/isochrone/v1/mapbox/driving/${lng},${lat}?contours_minutes=${minutes}&polygons=true&denoise=1&access_token=${MAPBOX_TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mapbox isochrone ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const f = data?.features?.[0];
  if (!f?.geometry) throw new Error("Mapbox isochrone: no polygon returned");
  return f.geometry as GeoJSON.Polygon;
}

// Sample evenly-spaced perimeter points + centroid for tract lookups.
export function samplePoints(poly: GeoJSON.Polygon, n = 5): Array<{ lat: number; lng: number }> {
  const ring = poly.coordinates?.[0] ?? [];
  if (ring.length === 0) return [];
  // centroid
  let cx = 0, cy = 0;
  for (const [x, y] of ring) {
    cx += x;
    cy += y;
  }
  cx /= ring.length;
  cy /= ring.length;
  const out: Array<{ lat: number; lng: number }> = [{ lat: cy, lng: cx }];
  const step = Math.max(1, Math.floor(ring.length / n));
  for (let i = 0; i < ring.length && out.length < n + 1; i += step) {
    const [x, y] = ring[i];
    out.push({ lat: y, lng: x });
  }
  return out;
}

export function haversineMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function polygonHash(poly: GeoJSON.Polygon): string {
  // Cheap stable hash of the outer ring (rounded) so repeat polygons cache-hit.
  const ring = poly.coordinates?.[0] ?? [];
  const s = ring.map(([x, y]) => `${x.toFixed(4)},${y.toFixed(4)}`).join("|");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return `p${h}`;
}

// ---------------------------------------------------------------------------
// Accessibility v0.2 — nearest road / highway via OSM Overpass (multi-mirror)
// + Mapbox Directions for the drive distance. No synthetic distances anywhere.
// ---------------------------------------------------------------------------

type LngLat = { lat: number; lng: number };

// Mirrors in priority order. maps.mail.ru is currently the most reliable for
// our volume; overpass-api.de + kumi are kept as additional fallbacks. Every
// mirror is called with form-urlencoded body + a real User-Agent — sending
// raw text/plain without a UA is what triggered the 406s we saw earlier.
const OVERPASS_ENDPOINTS = [
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const OVERPASS_UA = "neuron-garage-sas/0.2 (site-analysis engine)";

function bboxAround(lat: number, lng: number, radiusMi: number): [number, number, number, number] {
  const dLat = radiusMi / 69;
  const dLng = radiusMi / (Math.cos((lat * Math.PI) / 180) * 69);
  return [lat - dLat, lng - dLng, lat + dLat, lng + dLng];
}

async function overpassNearestNode(
  origin: LngLat,
  highwayClasses: string[],
  radiusMi: number,
): Promise<LngLat | null> {
  const [s, w, n, e] = bboxAround(origin.lat, origin.lng, radiusMi);
  const regex = highwayClasses.join("|");
  const query = `[out:json][timeout:15];
way["highway"~"^(${regex})$"](${s},${w},${n},${e});
node(w);
out 200;`;
  const body = `data=${encodeURIComponent(query)}`;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 18_000);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": OVERPASS_UA,
          "Accept": "application/json",
        },
        body,
        signal: controller.signal,
      });
      clearTimeout(t);
      if (!res.ok) {
        console.warn(`[sas] Overpass ${endpoint} ${res.status}`);
        continue;
      }
      const data = await res.json();
      const elements: Array<{ type: string; lat?: number; lon?: number }> = data?.elements ?? [];
      let best: LngLat | null = null;
      let bestD = Infinity;
      for (const el of elements) {
        if (el.type !== "node" || typeof el.lat !== "number" || typeof el.lon !== "number") continue;
        const d = haversineMiles(origin, { lat: el.lat, lng: el.lon });
        if (d < bestD) {
          bestD = d;
          best = { lat: el.lat, lng: el.lon };
        }
      }
      console.log(
        `[sas] Overpass ${endpoint} → ${elements.length} nodes, best=${
          best ? bestD.toFixed(2) + "mi" : "none"
        } (classes=${highwayClasses.join("|")})`,
      );
      return best;
    } catch (err) {
      console.warn(`[sas] Overpass ${endpoint} failed:`, (err as Error).message);
    }
  }
  return null;
}

export function nearestHighwayNode(lat: number, lng: number, radiusMi = 12): Promise<LngLat | null> {
  return overpassNearestNode(
    { lat, lng },
    ["motorway", "trunk", "motorway_link", "trunk_link"],
    radiusMi,
  );
}

export function nearestMajorRoadNode(lat: number, lng: number, radiusMi = 3): Promise<LngLat | null> {
  return overpassNearestNode({ lat, lng }, ["primary", "secondary"], radiusMi);
}

export async function drivingDistanceMiles(from: LngLat, to: LngLat): Promise<number | null> {
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false&access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[sas] Mapbox Directions ${res.status}`);
      return null;
    }
    const data = await res.json();
    const meters = data?.routes?.[0]?.distance;
    if (typeof meters === "number" && Number.isFinite(meters)) return meters / 1609.34;
    return null;
  } catch (err) {
    console.warn("[sas] Mapbox Directions threw:", (err as Error).message);
    return null;
  }
}

