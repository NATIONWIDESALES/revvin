import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MockListing } from "@/hooks/useMockListings";

interface Props {
  listings: MockListing[];
  onSelect?: (slug: string) => void;
  height?: number;
  center?: [number, number];
  zoom?: number;
}

export default function MarketplaceMap({ listings, onSelect, height = 540, center, zoom = 3 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, { scrollWheelZoom: false }).setView(
      center ?? [42, -95],
      zoom,
    );
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      maxZoom: 18,
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layer = L.layerGroup().addTo(map);
    const bounds: [number, number][] = [];

    for (const l of listings) {
      if (l.lat == null || l.lng == null) continue;
      bounds.push([l.lat, l.lng]);
      const icon = L.divIcon({
        className: "",
        iconSize: [80, 28],
        iconAnchor: [40, 14],
        html: `<div style="display:inline-flex;align-items:center;gap:4px;background:hsl(142 64% 24%);color:#fff;font:600 11px Inter,system-ui,sans-serif;padding:4px 10px;border-radius:9999px;box-shadow:0 2px 8px rgba(0,0,0,0.18);white-space:nowrap;">$${l.referral_fee.toLocaleString()}</div>`,
      });
      const marker = L.marker([l.lat, l.lng], { icon }).addTo(layer);
      marker.bindPopup(
        `<div style="font-family:Inter,system-ui,sans-serif;max-width:220px;">
          <img src="${l.hero_image}" alt="" style="width:100%;height:90px;object-fit:cover;border-radius:8px;margin-bottom:8px;" />
          <div style="font-weight:700;font-size:13px;color:#0F172A;">${l.name}</div>
          <div style="font-size:11px;color:#64748B;margin-top:2px;">${l.city}, ${l.region} · ${l.category}</div>
          <div style="margin-top:6px;font-size:11px;color:hsl(142 64% 24%);font-weight:600;">Referral $${l.referral_fee.toLocaleString()}</div>
         </div>`,
      );
      marker.on("click", () => onSelect?.(l.slug));
      marker.on("popupopen", (e) => {
        const node = (e.popup.getElement() as HTMLElement | null)?.querySelector("img");
        if (node) node.style.cursor = "pointer";
      });
    }

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 9);
    }

    return () => {
      layer.remove();
    };
  }, [listings, onSelect]);

  return (
    <div
      ref={ref}
      className="w-full overflow-hidden rounded-2xl border border-border"
      style={{ height }}
    />
  );
}