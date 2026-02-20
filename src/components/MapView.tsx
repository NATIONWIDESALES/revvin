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

    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) map.removeLayer(layer);
    });

    offers.forEach((offer) => {
      if (!offer.latitude || !offer.longitude) return;

      const payoutLabel = offer.payoutType === "flat" ? `$${offer.payout}` : `${offer.payout}%`;
      const radius = Math.max(10, Math.min(22, offer.payout / 25));
      
      const marker = L.circleMarker([offer.latitude, offer.longitude], {
        radius,
        fillColor: "hsl(160, 84%, 22%)",
        color: "hsl(160, 84%, 30%)",
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.7,
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: 'DM Sans', sans-serif; min-width: 220px; padding: 4px;">
          <div style="font-size: 15px; font-weight: 700; margin-bottom: 2px;">${offer.title}</div>
          <div style="font-size: 12px; color: #666; margin-bottom: 6px;">${offer.business} • ${offer.category}</div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="background: linear-gradient(135deg, hsl(160, 72%, 40%), hsl(160, 84%, 30%)); color: white; padding: 4px 14px; border-radius: 999px; font-weight: 700; font-size: 14px;">
              ${payoutLabel}
            </span>
            <span style="font-size: 11px; color: #999;">${offer.location}</span>
          </div>
          ${offer.dealSizeMin && offer.dealSizeMax ? `<div style="font-size: 11px; color: #888; margin-bottom: 4px;">Deal size: $${offer.dealSizeMin.toLocaleString()} – $${offer.dealSizeMax.toLocaleString()}</div>` : ""}
          ${offer.closeTimeDays ? `<div style="font-size: 11px; color: #888;">Avg close: ${offer.closeTimeDays} days</div>` : ""}
          <div style="margin-top: 8px; text-align: center;">
            <span style="font-size: 11px; color: hsl(160, 84%, 22%); cursor: pointer; font-weight: 600;">View Details →</span>
          </div>
        </div>
      `);

      marker.on("click", () => navigate(`/offer/${offer.id}`));
    });
  }, [offers, navigate]);

  return (
    <div ref={mapRef} className="h-[550px] w-full rounded-xl border border-border overflow-hidden" />
  );
};

export default MapView;
