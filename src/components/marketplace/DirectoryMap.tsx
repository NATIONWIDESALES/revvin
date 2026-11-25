import { useEffect, useRef } from "react";
import type { Map as MlMap, GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { DEFAULT_VIEW, PIN_ZOOM, type Bounds, type DirectoryCluster, type DirectoryEntry } from "@/lib/directory";

// Free, keyless vector style. Its own attribution is kept and the credit below added.
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const CREDIT = '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a>';

const token = (name: string) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `hsl(${v.split(/\s+/).join(", ")})` : "#0F4A2A";
};

interface Props {
  clusters: DirectoryCluster[];
  pins: DirectoryEntry[];
  selected: string | null;
  /** initial is true for the default view right after load, before anyone moves the map. */
  onMove: (bounds: Bounds, zoom: number, initial: boolean) => void;
  onSelect: (slug: string) => void;
  onFail: () => void;
  /** Single-point mode for a profile page: no clusters, no moving events. */
  point?: { lat: number; lng: number } | null;
  className?: string;
}

export default function DirectoryMap({ clusters, pins, selected, onMove, onSelect, onFail, point, className }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const ready = useRef(false);
  const cb = useRef({ onMove, onSelect, onFail });
  cb.current = { onMove, onSelect, onFail };
  const data = useRef({ clusters, pins, selected });
  data.current = { clusters, pins, selected };

  const sync = () => {
    const m = map.current;
    if (!m || !ready.current) return;
    const { clusters: c, pins: p, selected: s } = data.current;
    (m.getSource("clusters") as GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: c.map((k) => ({ type: "Feature", properties: { count: Number(k.count), label: String(k.count) }, geometry: { type: "Point", coordinates: [k.lng, k.lat] } })),
    });
    (m.getSource("pins") as GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: p.filter((e) => e.lat != null && e.lng != null).map((e) => ({
        type: "Feature", properties: { slug: e.slug, selected: e.slug === s ? 1 : 0, pro: e.is_pro ? 1 : 0 },
        geometry: { type: "Point", coordinates: [e.lng as number, e.lat as number] },
      })),
    });
  };

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      try {
        const ml = (await import("maplibre-gl")).default;
        if (cancelled || !el.current) return;
        const m = new ml.Map({
          container: el.current,
          style: MAP_STYLE_URL,
          ...(point ? { center: [point.lng, point.lat] as [number, number], zoom: 10 } : { bounds: DEFAULT_VIEW.bounds, fitBoundsOptions: { padding: 16 } }),
          attributionControl: { compact: false, customAttribution: CREDIT },
          interactive: !point,
        });
        map.current = m;
        if (!point) m.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
        timer = setTimeout(() => { if (!ready.current) cb.current.onFail(); }, 15000);
        m.on("error", (e) => { if (!ready.current) { console.warn("map failed", e?.error?.message); cb.current.onFail(); } });
        m.on("load", () => {
          ready.current = true;
          clearTimeout(timer);
          const forest = token("--forest"), sign = token("--sign"), green = token("--green");
          m.addSource("clusters", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
          m.addSource("pins", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
          m.addLayer({ id: "cluster-circles", type: "circle", source: "clusters", paint: {
            "circle-color": forest, "circle-opacity": 0.9, "circle-stroke-color": "#fff", "circle-stroke-width": 2,
            "circle-radius": ["interpolate", ["linear"], ["get", "count"], 1, 14, 10, 18, 100, 26, 1000, 34],
          } });
          m.addLayer({ id: "cluster-labels", type: "symbol", source: "clusters", layout: {
            "text-field": ["get", "label"], "text-size": 13, "text-font": ["Noto Sans Bold"], "text-allow-overlap": true,
          }, paint: { "text-color": "#fff" } });
          m.addLayer({ id: "pin-circles", type: "circle", source: "pins", paint: {
            "circle-color": ["case", ["==", ["get", "selected"], 1], sign, ["==", ["get", "pro"], 1], forest, green],
            "circle-radius": ["case", ["==", ["get", "selected"], 1], 11, 8],
            "circle-stroke-color": forest, "circle-stroke-width": ["case", ["==", ["get", "selected"], 1], 3, 2],
          } });
          if (point) {
            (m.getSource("pins") as GeoJSONSource).setData({ type: "FeatureCollection", features: [{ type: "Feature", properties: { selected: 1, pro: 0 }, geometry: { type: "Point", coordinates: [point.lng, point.lat] } }] });
            return;
          }
          m.on("click", "cluster-circles", (e) => {
            const f = e.features?.[0];
            if (f?.geometry.type === "Point") m.easeTo({ center: f.geometry.coordinates as [number, number], zoom: Math.min(m.getZoom() + 2.5, PIN_ZOOM + 1) });
          });
          m.on("click", "pin-circles", (e) => { const s = e.features?.[0]?.properties?.slug; if (typeof s === "string") cb.current.onSelect(s); });
          for (const id of ["cluster-circles", "pin-circles"]) {
            m.on("mouseenter", id, () => { m.getCanvas().style.cursor = "pointer"; });
            m.on("mouseleave", id, () => { m.getCanvas().style.cursor = ""; });
          }
          const emit = (initial = false) => {
            const b = m.getBounds();
            cb.current.onMove({
              minLat: Math.max(-90, b.getSouth()), maxLat: Math.min(90, b.getNorth()),
              minLng: Math.max(-180, b.getWest()), maxLng: Math.min(180, b.getEast()),
            }, m.getZoom(), initial);
          };
          m.on("moveend", () => emit());
          emit(true);
          sync();
        });
      } catch (e) {
        console.warn("map failed", e);
        if (!cancelled) cb.current.onFail();
      }
    })();
    return () => { cancelled = true; clearTimeout(timer); map.current?.remove(); map.current = null; ready.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(sync, [clusters, pins, selected]);

  return <div ref={el} className={className} role="region" aria-label="Map of listed businesses" />;
}
