import { useEffect, useRef } from "react";
import { Offer } from "@/types/offer";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapViewProps {
  offers: Offer[];
}

const MapView = ({ offers }: MapViewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([39.8283, -98.5795], 4);
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) map.removeLayer(layer);
    });

    offers.forEach((offer) => {
      if (!offer.latitude || !offer.longitude) return;

      const radius = Math.max(8, Math.min(20, offer.payout / 30));
      const marker = L.circleMarker([offer.latitude, offer.longitude], {
        radius,
        fillColor: "hsl(160, 84%, 22%)",
        color: "hsl(160, 84%, 30%)",
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.7,
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: 'DM Sans', sans-serif; min-width: 200px;">
          <div style="font-size: 14px; font-weight: 700; margin-bottom: 4px;">${offer.title}</div>
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;">${offer.business}</div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="background: linear-gradient(135deg, hsl(160, 72%, 40%), hsl(160, 84%, 30%)); color: white; padding: 2px 10px; border-radius: 999px; font-weight: 700; font-size: 13px;">
              ${offer.payoutType === "flat" ? "$" + offer.payout : offer.payout + "%"}
            </span>
            <span style="font-size: 11px; color: #999;">${offer.location}</span>
          </div>
        </div>
      `);

      marker.on("click", () => navigate(`/offer/${offer.id}`));
    });
  }, [offers, navigate]);

  return (
    <div ref={mapRef} className="h-[500px] w-full rounded-xl border border-border overflow-hidden" />
  );
};

export default MapView;
