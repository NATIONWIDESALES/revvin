import { useEffect, useRef } from "react";
import { Offer } from "@/types/offer";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCountry } from "@/contexts/CountryContext";
import { cityJumpsCA, cityJumpsUS } from "@/data/mockOffers";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapViewProps {
  offers: Offer[];
}

const MapView = ({ offers }: MapViewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const navigate = useNavigate();
  const { country, formatPayout } = useCountry();

  const cityJumps = country === "CA" ? cityJumpsCA
    : country === "US" ? cityJumpsUS
    : [...cityJumpsCA.slice(0, 3), ...cityJumpsUS.slice(0, 3)];

  // Default center: North America
  const defaultCenter: [number, number] = country === "CA" ? [51.5, -106.3] : country === "US" ? [39.8, -98.6] : [45.0, -100.0];
  const defaultZoom = country === "ALL" ? 3 : 4;

  useEffect(() => {
    if (!mapRef.current) return;

    // Destroy old map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current).setView(defaultCenter, defaultZoom);
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [country]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove old markers
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker || layer instanceof L.Marker) {
        if (!(layer instanceof L.TileLayer)) map.removeLayer(layer);
      }
    });

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
        const payoutLabel = offer.payoutType === "flat" ? formatPayout(offer.payout, offer.currency) : `${offer.payout}%`;
        const radius = Math.max(10, Math.min(22, offer.payout / 25));
        const isSecured = !!offer.fundSecured;
        const fillColor = isSecured ? "hsl(160, 84%, 22%)" : "hsl(220, 10%, 55%)";
        const borderColor = isSecured ? "hsl(160, 84%, 30%)" : "hsl(220, 10%, 65%)";
        const countryFlag = offer.country === "CA" ? "🇨🇦" : "🇺🇸";

        const marker = L.circleMarker([offer.latitude!, offer.longitude!], {
          radius,
          fillColor,
          color: borderColor,
          weight: isSecured ? 3 : 2,
          opacity: 0.9,
          fillOpacity: 0.7,
        }).addTo(map);

        const securedBadge = isSecured
          ? `<div style="display:flex;align-items:center;gap:4px;font-size:11px;color:hsl(160,84%,22%);font-weight:600;margin-bottom:6px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Funds Secured
            </div>`
          : "";

        marker.bindPopup(`
          <div style="font-family: 'DM Sans', sans-serif; min-width: 220px; padding: 4px;">
            <div style="font-size: 15px; font-weight: 700; margin-bottom: 2px;">${offer.title}</div>
            <div style="font-size: 12px; color: #666; margin-bottom: 6px;">${countryFlag} ${offer.business} • ${offer.category}</div>
            ${securedBadge}
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="background: linear-gradient(135deg, ${fillColor}, ${borderColor}); color: white; padding: 4px 14px; border-radius: 999px; font-weight: 700; font-size: 14px;">
                ${payoutLabel} <span style="font-size:10px;opacity:0.8">${offer.currency}</span>
              </span>
              <span style="font-size: 11px; color: #999;">${offer.location}</span>
            </div>
            ${offer.serviceRadius ? `<div style="font-size: 11px; color: #888; margin-bottom: 4px;">Service radius: ${offer.serviceRadius}</div>` : ""}
            ${offer.dealSizeMin && offer.dealSizeMax ? `<div style="font-size: 11px; color: #888; margin-bottom: 4px;">Deal size: ${offer.currency === "CAD" ? "CA" : ""}$${offer.dealSizeMin.toLocaleString()} – $${offer.dealSizeMax.toLocaleString()}</div>` : ""}
            <div style="margin-top: 10px; display: flex; gap: 6px;">
              <a href="/offer/${offer.id}" style="flex: 1; text-align: center; padding: 6px; background: hsl(160, 84%, 22%); color: white; border-radius: 8px; font-size: 12px; font-weight: 600; text-decoration: none; display: block;">Submit Referral</a>
              <a href="/offer/${offer.id}" style="flex: 1; text-align: center; padding: 6px; border: 1px solid #ddd; border-radius: 8px; font-size: 12px; font-weight: 500; text-decoration: none; color: #333; display: block;">View Details</a>
            </div>
          </div>
        `);
      } else {
        const avgPayout = Math.round(cluster.offers.reduce((s, o) => s + o.payout, 0) / cluster.offers.length);
        const count = cluster.offers.length;
        const hasCA = cluster.offers.some(o => o.country === "CA");
        const hasUS = cluster.offers.some(o => o.country === "US");
        const flags = hasCA && hasUS ? "🇨🇦🇺🇸" : hasCA ? "🇨🇦" : "🇺🇸";

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
          const pl = o.payoutType === "flat" ? formatPayout(o.payout, o.currency) : `${o.payout}%`;
          const flag = o.country === "CA" ? "🇨🇦" : "🇺🇸";
          return `<div style="margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid #eee;">
            <div style="font-weight: 600; font-size: 13px;">${flag} ${o.title}</div>
            <div style="font-size: 11px; color: #888;">${o.business} • <strong style="color: hsl(160, 84%, 22%);">${pl}</strong> ${o.currency}</div>
          </div>`;
        }).join("");

        clusterMarker.bindPopup(`
          <div style="font-family: 'DM Sans', sans-serif; min-width: 200px; padding: 4px;">
            <div style="font-size: 13px; font-weight: 700; margin-bottom: 8px;">${flags} ${count} offers in this area</div>
            ${popupContent}
            ${count > 3 ? `<div style="font-size: 11px; color: #999;">+${count - 3} more</div>` : ""}
          </div>
        `);

        clusterMarker.on("click", () => {
          map.setView([cluster.lat, cluster.lng], Math.min(map.getZoom() + 3, 13));
        });
      }
    });
  }, [offers, navigate, formatPayout]);

  const jumpToCity = (lat: number, lng: number) => {
    mapInstanceRef.current?.setView([lat, lng], 10, { animate: true });
  };

  return (
    <div>
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
