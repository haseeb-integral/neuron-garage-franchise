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

// Point-in-polygon test (ray-casting) on the outer ring. Sufficient for
// Mapbox isochrone polygons, which are simple (non-self-intersecting).
function pointInRing(x: number, y: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = (yi > y) !== (yj > y) &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Bug-1 fix: dense interior + perimeter sampling so demographic aggregation
// covers the full isochrone rather than centroid + 5 perimeter points (which
// systematically misses residential interior tracts in irregular metro
// polygons — see Manus_1B_Calibration_Analysis.md). Yields ~25–35 unique
// points inside the polygon, which downstream `aggregateAcs` dedupes by
// Census tract so the Census API call volume stays bounded.
//
// `n` is retained for API compatibility but is no longer the perimeter count;
// it now controls grid density (n=5 → 6x6 = 36 candidate cells before
// in-polygon filtering, matching the magnitude Manus recommended).
export function samplePoints(poly: GeoJSON.Polygon, n = 5): Array<{ lat: number; lng: number }> {
  const ring = poly.coordinates?.[0] ?? [];
  if (ring.length === 0) return [];

  // Bounding box of the outer ring.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  // Centroid.
  let cx = 0, cy = 0;
  for (const [x, y] of ring) { cx += x; cy += y; }
  cx /= ring.length;
  cy /= ring.length;

  const out: Array<{ lat: number; lng: number }> = [{ lat: cy, lng: cx }];

  // Interior grid. grid = max(6, n+1) → ~36+ candidate cells.
  const grid = Math.max(6, n + 1);
  for (let i = 1; i < grid; i++) {
    for (let j = 1; j < grid; j++) {
      const x = minX + ((maxX - minX) * i) / grid;
      const y = minY + ((maxY - minY) * j) / grid;
      if (pointInRing(x, y, ring)) out.push({ lat: y, lng: x });
    }
  }

  // Perimeter samples — preserves edge coverage (some tracts only touch the
  // ring at the boundary).
  const perimeterCount = Math.max(5, n);
  const step = Math.max(1, Math.floor(ring.length / perimeterCount));
  for (let i = 0; i < ring.length; i += step) {
    const [x, y] = ring[i];
    out.push({ lat: y, lng: x });
  }

  return out;
}

// Approximate polygon area in square miles using equirectangular projection
// at the polygon's centroid latitude. Accurate to within a few percent for
// drive-time isochrones (max ~15 mi extent), which is well below the
// precision needed for the popReachable15 extrapolation in compute-sas.
export function polygonAreaSqMi(poly: GeoJSON.Polygon): number {
  const ring = poly.coordinates?.[0] ?? [];
  if (ring.length < 3) return 0;
  // Centroid latitude for the cos(lat) correction.
  let cy = 0;
  for (const [, y] of ring) cy += y;
  cy /= ring.length;
  const cosLat = Math.cos((cy * Math.PI) / 180);
  // Shoelace in degree-space, then convert degrees² → mi² using
  // 1° lat ≈ 69 mi and 1° lng ≈ 69 × cos(lat) mi.
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    area += xj * yi - xi * yj;
  }
  area = Math.abs(area) / 2; // degrees²
  return area * 69 * 69 * cosLat;
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

// ---------------------------------------------------------------------------
// Parking signal v0.2 — Mapbox Tilequery against `mapbox.mapbox-streets-v8`
// `poi_label` layer within a small radius of the geocoded pin. Counts POIs
// whose maki icon is "parking". Informational only — does not feed the
// composite (client-locked weights per Sam brief v2.2 p.9).
// ---------------------------------------------------------------------------

export interface ParkingSignal {
  poiCount: number;
  bucket: "none" | "street_only" | "small_lot" | "large_lot";
  radiusMeters: number;
  error: string | null;
}

export async function parkingSignal(
  lat: number,
  lng: number,
  radiusMeters = 400,
): Promise<ParkingSignal> {
  const fallback = (error: string | null): ParkingSignal => ({
    poiCount: 0,
    bucket: "none",
    radiusMeters,
    error,
  });
  try {
    // Query POI labels + landuse polygons (parking lots are tagged as landuse).
    const url =
      `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/` +
      `${lng},${lat}.json?radius=${radiusMeters}&limit=50` +
      `&layers=poi_label,landuse&access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url);
    if (!res.ok) return fallback(`tilequery ${res.status}`);
    const data = await res.json();
    const features: Array<{ properties?: { maki?: string; class?: string; type?: string } }> =
      data?.features ?? [];
    const parking = features.filter((f) => {
      const maki = (f.properties?.maki ?? "").toLowerCase();
      const cls = (f.properties?.class ?? "").toLowerCase();
      const type = (f.properties?.type ?? "").toLowerCase();
      return (
        maki === "parking" ||
        cls === "parking" ||
        cls === "parking_lot" ||
        cls === "parking_garage" ||
        type.includes("parking")
      );
    });
    const n = parking.length;
    // Honest bucketing: 0 features = "none" (we can't tell — UI shows "Not
    // verified — confirm on site"). Only assert a lot when we actually see one.
    let bucket: ParkingSignal["bucket"] = "none";
    if (n >= 3) bucket = "large_lot";
    else if (n >= 1) bucket = "small_lot";
    return { poiCount: n, bucket, radiusMeters, error: null };
  } catch (err) {
    return fallback((err as Error).message);
  }
}

