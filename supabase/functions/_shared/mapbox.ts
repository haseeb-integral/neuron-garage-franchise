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
