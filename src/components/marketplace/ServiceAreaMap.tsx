import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  lat: number;
  lng: number;
  city: string;
  radiusKm?: number;
  height?: number;
}

export default function ServiceAreaMap({ lat, lng, city, radiusKm = 25, height = 240 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const map = L.map(ref.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
    }).setView([lat, lng], 9);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { maxZoom: 18 }).addTo(map);
    L.circle([lat, lng], {
      radius: radiusKm * 1000,
      color: "hsl(142 64% 24%)",
      weight: 1.5,
      fillColor: "hsl(142 64% 24%)",
      fillOpacity: 0.12,
    }).addTo(map);
    L.marker([lat, lng]).addTo(map).bindTooltip(city, { permanent: true, direction: "top", offset: [-15, -10] });
    return () => { map.remove(); };
  }, [lat, lng, city, radiusKm]);

  return <div ref={ref} className="w-full overflow-hidden rounded-xl border border-border" style={{ height }} />;
}