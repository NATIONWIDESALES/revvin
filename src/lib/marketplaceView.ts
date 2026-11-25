import { DEFAULT_VIEW, type Bounds } from "@/lib/directory";

export type MarketplaceView = { bounds: Bounds; zoom: number; center: { lat: number; lng: number } };
const mercatorY = (lat: number) => {
  const sin = Math.sin(Math.max(-85.051129, Math.min(85.051129, lat)) * Math.PI / 180);
  return 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
};
const latitude = (y: number) => Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180 / Math.PI;

/** MapLibre uses a 512px world at zoom zero, not the raster tile size. */
export function centerZoomBounds(lat: number, lng: number, zoom: number, width: number, height: number): Bounds {
  const world = 512 * 2 ** zoom;
  const halfLng = Math.max(1, width) / world * 180;
  const halfY = Math.max(1, height) / world / 2;
  const y = mercatorY(lat);
  return {
    minLng: Math.max(-180, lng - halfLng), maxLng: Math.min(180, lng + halfLng),
    minLat: latitude(Math.min(1, y + halfY)), maxLat: latitude(Math.max(0, y - halfY)),
  };
}

/** Unknown time zones retain the map's padded continental opening, still bounded. */
export function startingMapView(start: { lat: number; lng: number; z: number } | null, width: number, height: number): MarketplaceView {
  if (start) return { center: { lat: start.lat, lng: start.lng }, zoom: start.z, bounds: centerZoomBounds(start.lat, start.lng, start.z, width, height) };
  const [[west, south], [east, north]] = DEFAULT_VIEW.bounds;
  const y = (mercatorY(south) + mercatorY(north)) / 2;
  const center = { lat: latitude(y), lng: (west + east) / 2 };
  const zoom = Math.log2(Math.min(Math.max(1, width - 32) / (512 * (east - west) / 360), Math.max(1, height - 32) / (512 * (mercatorY(south) - mercatorY(north)))));
  return { center, zoom, bounds: centerZoomBounds(center.lat, center.lng, zoom, width, height) };
}

/** Compare each edge against the previous viewport's span, not absolute coordinates. */
export function boundsDiffer(a: Bounds, b: Bounds, tolerance = 0.05): boolean {
  const lat = Math.max(0.000001, a.maxLat - a.minLat), lng = Math.max(0.000001, a.maxLng - a.minLng);
  return Math.abs(a.minLat - b.minLat) > lat * tolerance || Math.abs(a.maxLat - b.maxLat) > lat * tolerance
    || Math.abs(a.minLng - b.minLng) > lng * tolerance || Math.abs(a.maxLng - b.maxLng) > lng * tolerance;
}