import { useEffect, useRef, useState } from "react";
import { Offer } from "@/types/offer";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapViewProps {
  offers: Offer[];
}

const cityJumps = [
  { label: "LA", lat: 34.0522, lng: -118.2437 },
  { label: "NYC", lat: 40.7128, lng: -74.006 },
  { label: "Chicago", lat: 41.8781, lng: -87.6298 },
  { label: "Dallas", lat: 32.7767, lng: -96.797 },
  { label: "Miami", lat: 25.7617, lng: -80.1918 },
  { label: "Denver", lat: 39.7392, lng: -104.9903 },
  { label: "Boston", lat: 42.3601, lng: -71.0589 },
  { label: "SF", lat: 37.7749, lng: -122.4194 },
  { label: "Austin", lat: 30.2672, lng: -97.7431 },
  { label: "Phoenix", lat: 33.4484, lng: -112.074 },
];

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

    // Remove old markers
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker || layer instanceof L.Marker) {
        if (!(layer instanceof L.TileLayer)) map.removeLayer(layer);
      }
    });

    // Simple clustering: group offers within ~0.5 degree
    const clusters: { lat: number; lng: number; offers: Offer[] }[] = [];
    const clusterRadius = 1.5;

    offers.forEach((offer) => {
      if (!offer.latitude || !offer.longitude) return;
      const existing = clusters.find(
        (c) => Math.abs(c.lat - offer.latitude!) < clusterRadius && Math.abs(c.lng - offer.longitude!) < clusterRadius
      );
      if (existing) {
        existing.offers.push(offer);
        existing.lat = (existing.lat + offer.latitude) / 2;
        existing.lng = (existing.lng + offer.longitude) / 2;
      } else {
        clusters.push({ lat: offer.latitude, lng: offer.longitude, offers: [offer] });
      }
    });

    clusters.forEach((cluster) => {
      if (cluster.offers.length === 1) {
        const offer = cluster.offers[0];
        const payoutLabel = offer.payoutType === "flat" ? `$${offer.payout}` : `${offer.payout}%`;
        const radius = Math.max(10, Math.min(22, offer.payout / 25));

        const marker = L.circleMarker([offer.latitude!, offer.longitude!], {
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
            <div style="margin-top: 10px; display: flex; gap: 6px;">
              <a href="/offer/${offer.id}" style="flex: 1; text-align: center; padding: 6px; background: hsl(160, 84%, 22%); color: white; border-radius: 8px; font-size: 12px; font-weight: 600; text-decoration: none; display: block;">Submit Referral</a>
              <a href="/offer/${offer.id}" style="flex: 1; text-align: center; padding: 6px; border: 1px solid #ddd; border-radius: 8px; font-size: 12px; font-weight: 500; text-decoration: none; color: #333; display: block;">View Details</a>
            </div>
          </div>
        `);

        marker.on("click", () => {});
      } else {
        // Cluster marker
        const avgPayout = Math.round(cluster.offers.reduce((s, o) => s + o.payout, 0) / cluster.offers.length);
        const count = cluster.offers.length;

        const clusterIcon = L.divIcon({
          html: `<div style="background: hsl(160, 84%, 22%); color: white; border-radius: 50%; width: 44px; height: 44px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: 'DM Sans', sans-serif; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 2px solid hsl(160, 84%, 30%);">
            <span style="font-size: 14px; font-weight: 700;">${count}</span>
            <span style="font-size: 9px; opacity: 0.8;">~$${avgPayout}</span>
          </div>`,
          className: "",
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });

        const clusterMarker = L.marker([cluster.lat, cluster.lng], { icon: clusterIcon }).addTo(map);

        const popupContent = cluster.offers.slice(0, 3).map((o) => {
          const pl = o.payoutType === "flat" ? `$${o.payout}` : `${o.payout}%`;
          return `<div style="margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid #eee;">
            <div style="font-weight: 600; font-size: 13px;">${o.title}</div>
            <div style="font-size: 11px; color: #888;">${o.business} • <strong style="color: hsl(160, 84%, 22%);">${pl}</strong></div>
          </div>`;
        }).join("");

        clusterMarker.bindPopup(`
          <div style="font-family: 'DM Sans', sans-serif; min-width: 200px; padding: 4px;">
            <div style="font-size: 13px; font-weight: 700; margin-bottom: 8px;">${count} offers in this area</div>
            ${popupContent}
            ${count > 3 ? `<div style="font-size: 11px; color: #999;">+${count - 3} more</div>` : ""}
          </div>
        `);

        clusterMarker.on("click", () => {
          map.setView([cluster.lat, cluster.lng], Math.min(map.getZoom() + 3, 13));
        });
      }
    });
  }, [offers, navigate]);

  const jumpToCity = (lat: number, lng: number) => {
    mapInstanceRef.current?.setView([lat, lng], 10, { animate: true });
  };

  return (
    <div>
      {/* City quick-jump */}
      <div className="mb-3 flex flex-wrap gap-2">
        {cityJumps.map((city) => (
          <Button
            key={city.label}
            variant="outline"
            size="sm"
            className="text-xs h-7 px-2.5"
            onClick={() => jumpToCity(city.lat, city.lng)}
          >
            {city.label}
          </Button>
        ))}
      </div>
      <div ref={mapRef} className="h-[550px] w-full rounded-xl border border-border overflow-hidden" />
    </div>
  );
};

export default MapView;
