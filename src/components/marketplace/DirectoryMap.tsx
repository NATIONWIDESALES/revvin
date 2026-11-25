import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { Map as MlMap, GeoJSONSource, Marker, Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  DEFAULT_VIEW, PIN_ZOOM, cardRewardAmount, clusterLabel, initials, placeLine, rewardPinLabel, tradePlace, realTrade,
  type Bounds, type DirectoryCluster, type DirectoryEntry,
} from "@/lib/directory";

// Free, keyless vector style. Its own attribution is kept and the credit below added.
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const CREDIT = '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a> <a href="https://overturemaps.org" target="_blank" rel="noopener">Overture Maps Foundation</a>';

const token = (name: string) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `hsl(${v.split(/\s+/).join(", ")})` : "#0F4A2A";
};
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export interface DirectoryMapHandle {
  flyTo: (lat: number, lng: number, zoom: number) => void;
  fitBounds: (b: Bounds) => void;
  resize: () => void;
}

interface Props {
  clusters: DirectoryCluster[];
  pins: DirectoryEntry[];
  selected: string | null;
  /** initial is true for the first view right after load, before anyone moves the map. */
  onMove: (bounds: Bounds, zoom: number, initial: boolean, center?: { lat: number; lng: number }) => void;
  onSelect: (slug: string) => void;
  onFail: () => void;
  /** Single-point mode for a profile page: no clusters, no moving events. */
  point?: { lat: number; lng: number } | null;
  /** Opening center and zoom; otherwise the continental view. */
  initialView?: { lat: number; lng: number; z: number } | null;
  /** Link for "View profile" in the pin popup. */
  hrefFor?: (e: DirectoryEntry) => string;
  /** Called when "View profile" is used, so the page can navigate without a reload. */
  onOpen?: (e: DirectoryEntry) => void;
  className?: string;
}

const DirectoryMap = forwardRef<DirectoryMapHandle, Props>(function DirectoryMap(
  { clusters, pins, selected, onMove, onSelect, onFail, point, initialView, hrefFor, onOpen, className }, handle) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const lib = useRef<typeof import("maplibre-gl") | null>(null);
  const ready = useRef(false);
  const markers = useRef(new Map<string, { marker: Marker; node: HTMLButtonElement; entry: DirectoryEntry }>());
  const popup = useRef<Popup | null>(null);
  const cb = useRef({ onMove, onSelect, onFail, hrefFor, onOpen });
  cb.current = { onMove, onSelect, onFail, hrefFor, onOpen };
  const data = useRef({ clusters, pins, selected });
  data.current = { clusters, pins, selected };

  useImperativeHandle(handle, () => ({
    flyTo: (lat, lng, zoom) => {
      const m = map.current; if (!m) return;
      if (reducedMotion()) m.jumpTo({ center: [lng, lat], zoom }); else m.flyTo({ center: [lng, lat], zoom, speed: 1.6 });
    },
    fitBounds: (b) => {
      const m = map.current; if (!m) return;
      const pad = 0.05;
      m.fitBounds([[b.minLng - pad, b.minLat - pad], [b.maxLng + pad, b.maxLat + pad]], { padding: 48, maxZoom: 12, animate: !reducedMotion() });
    },
    resize: () => map.current?.resize(),
  }), []);

  const showPopup = (entry: DirectoryEntry) => {
    const m = map.current, ml = lib.current;
    if (!m || !ml || entry.lat == null || entry.lng == null) return;
    const reward = cardRewardAmount(entry);
    const href = cb.current.hrefFor?.(entry) ?? "#";
    const refer = reward ? `/r/${encodeURIComponent(entry.slug)}` : null;
    const html = refer
      ? `<div class="dir-pop"><p class="dir-pop-reward dir-pop-reward-lead">Earn ${esc(reward!)} per referral</p><p class="dir-pop-name">${esc(entry.name)}</p><p class="dir-pop-meta">${esc(tradePlace(entry))}</p><p class="dir-pop-meta">Paid by the business when the job closes.</p><div class="dir-pop-actions"><a class="dir-pop-btn" href="${refer}">Refer someone</a><a class="dir-pop-link" href="${esc(href)}">View profile</a></div></div>`
      : `<div class="dir-pop"><p class="dir-pop-name">${esc(entry.name)}</p><p class="dir-pop-meta">${esc(tradePlace(entry))}</p>${entry.is_pro && entry.extra && entry.extra.review_count > 0 && entry.extra.rating_avg !== null ? `<p class="dir-pop-meta">${"★".repeat(Math.round(entry.extra.rating_avg))}${"☆".repeat(5 - Math.round(entry.extra.rating_avg))} ${entry.extra.rating_avg.toFixed(1)} (${entry.extra.review_count})</p>` : ""}${reward ? `<p class="dir-pop-reward">Pays ${esc(reward)} per referral</p>` : ""}<a class="dir-pop-link" href="${esc(href)}">View profile</a></div>`;
    popup.current?.remove();
    const p = new ml.Popup({ closeButton: true, closeOnClick: true, offset: 14, maxWidth: "260px", focusAfterOpen: false })
      .setLngLat([entry.lng, entry.lat]).setHTML(html).addTo(m);
    p.getElement()?.querySelector("a.dir-pop-link")?.addEventListener("click", (ev) => {
      if (cb.current.onOpen) { ev.preventDefault(); cb.current.onOpen(entry); }
    });
    popup.current = p;
  };

  const syncMarkers = () => {
    const m = map.current, ml = lib.current;
    if (!m || !ml || !ready.current || point) return;
    const { pins: p, selected: s } = data.current;
    const keep = new Set<string>();
    for (const e of p) {
      if (e.lat == null || e.lng == null) continue;
      const key = `${e.kind}:${e.slug}`;
      keep.add(key);
      let rec = markers.current.get(key);
      if (!rec) {
        const node = document.createElement("button");
        node.type = "button";
        const rewarded = Boolean(cardRewardAmount(e));
        const tier = e.kind === "listing" ? "unclaimed" : rewarded ? "reward" : e.is_pro ? "pro" : "claimed";
        node.className = `dir-pin dir-pin-${tier}`;
        node.setAttribute("aria-label", [e.name, realTrade(e.category)].filter(Boolean).join(", "));
        if (tier === "reward") { node.textContent = rewardPinLabel(e.reward_text); node.setAttribute("aria-label", `${e.name}, reward ${rewardPinLabel(e.reward_text)}`); }
        if (tier === "pro") {
          if (e.logo_url) { const img = document.createElement("img"); img.src = e.logo_url; img.alt = ""; img.loading = "lazy"; node.appendChild(img); }
          else node.textContent = initials(e.name);
        }
        node.addEventListener("mouseenter", () => showPopup(rec!.entry));
        node.addEventListener("focus", () => showPopup(rec!.entry));
        node.addEventListener("click", (ev) => { ev.stopPropagation(); showPopup(rec!.entry); cb.current.onSelect(rec!.entry.slug); });
        // MapLibre positions the outer element with a transform, so scaling happens on the inner button.
        const wrap = document.createElement("div");
        wrap.appendChild(node);
        const marker = new ml.Marker({ element: wrap, anchor: "center" }).setLngLat([e.lng, e.lat]).addTo(m);
        rec = { marker, node, entry: e };
        markers.current.set(key, rec);
      }
      rec.entry = e;
      rec.node.classList.toggle("is-active", e.slug === s);
      rec.marker.getElement().style.zIndex = rec.node.classList.contains("dir-pin-reward") ? (e.slug === s ? "7" : "6") : e.slug === s ? "5" : e.is_pro ? "3" : e.kind === "business" ? "2" : "1";
    }
    for (const [key, rec] of markers.current) {
      if (!keep.has(key)) { rec.marker.remove(); markers.current.delete(key); }
    }
  };

  const sync = () => {
    const m = map.current;
    if (!m || !ready.current) return;
    (m.getSource("clusters") as GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: data.current.clusters.map((k) => ({ type: "Feature", properties: { count: Number(k.count), label: clusterLabel(Number(k.count)), reward: Boolean(k.reward) }, geometry: { type: "Point", coordinates: [k.lng, k.lat] } })),
    });
    syncMarkers();
  };

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let ro: ResizeObserver | undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") popup.current?.remove(); };
    (async () => {
      try {
        const ml = (await import("maplibre-gl")).default;
        if (cancelled || !el.current) return;
        lib.current = ml as unknown as typeof import("maplibre-gl");
        const start = point ? { center: [point.lng, point.lat] as [number, number], zoom: 10 }
          : initialView ? { center: [initialView.lng, initialView.lat] as [number, number], zoom: initialView.z }
          : { bounds: DEFAULT_VIEW.bounds, fitBoundsOptions: { padding: 16 } };
        const m = new ml.Map({
          container: el.current,
          style: MAP_STYLE_URL,
          ...start,
          attributionControl: { compact: false, customAttribution: CREDIT },
          interactive: !point,
        });
        map.current = m;
        if (!point) {
          m.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
          // Asks for the browser location only when the button is pressed.
          m.addControl(new ml.GeolocateControl({ positionOptions: { enableHighAccuracy: false }, trackUserLocation: false, fitBoundsOptions: { maxZoom: 11 } }), "top-right");
          document.addEventListener("keydown", onKey);
        }
        if (typeof ResizeObserver !== "undefined" && el.current) {
          ro = new ResizeObserver(() => m.resize());
          ro.observe(el.current);
        }
        timer = setTimeout(() => { if (!ready.current && !cancelled) cb.current.onFail(); }, 10000);
        // Tile/glyph errors may be transient. The bounded list is already usable.
        m.on("error", (e) => { if (!ready.current) console.warn("map resource failed", e?.error?.message); });
        const activate = () => {
          if (cancelled || ready.current) return;
          ready.current = true;
          clearTimeout(timer);
          const forest = token("--forest");
          m.addSource("clusters", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
          m.addSource("pins", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
          m.addLayer({ id: "cluster-circles", type: "circle", source: "clusters", paint: {
            "circle-color": forest, "circle-opacity": 0.9, "circle-stroke-color": "#fff", "circle-stroke-width": 2,
            "circle-radius": ["interpolate", ["linear"], ["get", "count"], 1, 14, 10, 18, 100, 24, 1000, 30, 10000, 36],
          } });
          // Small yellow dot on clusters that hold at least one reward-paying business.
          m.addLayer({ id: "cluster-reward-dot", type: "circle", source: "clusters", filter: ["==", ["get", "reward"], true], paint: {
            "circle-color": token("--sign"), "circle-radius": 5, "circle-stroke-color": forest, "circle-stroke-width": 1.5,
            "circle-translate": [13, -13],
          } });
          m.addLayer({ id: "cluster-labels", type: "symbol", source: "clusters", layout: {
            "text-field": ["get", "label"], "text-size": 12, "text-font": ["Noto Sans Bold"], "text-allow-overlap": true,
          }, paint: { "text-color": "#fff" } });
          if (point) {
            m.addLayer({ id: "pin-circles", type: "circle", source: "pins", paint: { "circle-color": token("--sign"), "circle-radius": 10, "circle-stroke-color": forest, "circle-stroke-width": 3 } });
            (m.getSource("pins") as GeoJSONSource).setData({ type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [point.lng, point.lat] } }] });
            return;
          }
          m.on("click", "cluster-circles", (e) => {
            const f = e.features?.[0];
            if (f?.geometry.type === "Point") m.easeTo({ center: f.geometry.coordinates as [number, number], zoom: Math.min(m.getZoom() + 2.5, PIN_ZOOM + 1), animate: !reducedMotion() });
          });
          m.on("mouseenter", "cluster-circles", () => { m.getCanvas().style.cursor = "pointer"; });
          m.on("mouseleave", "cluster-circles", () => { m.getCanvas().style.cursor = ""; });
          const emit = (initial = false) => {
            const b = m.getBounds();
            const c = m.getCenter();
            cb.current.onMove({
              minLat: Math.max(-90, b.getSouth()), maxLat: Math.min(90, b.getNorth()),
              minLng: Math.max(-180, b.getWest()), maxLng: Math.min(180, b.getEast()),
            }, m.getZoom(), initial, { lat: c.lat, lng: c.lng });
          };
          m.on("moveend", () => emit());
          emit(true);
          sync();
        };
        m.once("style.load", activate);
        m.once("idle", activate);
        m.once("load", activate);
      } catch (e) {
        console.warn("map failed", e);
        if (!cancelled) cb.current.onFail();
      }
    })();
    return () => {
      cancelled = true; clearTimeout(timer); ro?.disconnect();
      document.removeEventListener("keydown", onKey);
      popup.current?.remove();
      for (const r of markers.current.values()) r.marker.remove();
      markers.current.clear();
      map.current?.remove(); map.current = null; ready.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(sync, [clusters, pins, selected]);

  return <div ref={el} className={className} role="region" aria-label="Map of listed businesses" />;
});

export default DirectoryMap;
