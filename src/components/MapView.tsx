import { useEffect, useRef, useCallback } from "react";
import { Offer } from "@/types/offer";
import { Button } from "@/components/ui/button";
import { useCountry } from "@/contexts/CountryContext";
import { toSlug } from "@/lib/utils";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapViewProps {
  offers: Offer[];
  /** When set, the map pans to highlight this offer's marker */
  highlightOfferId?: string | null;
  /** Called when a user clicks a marker — parent can scroll to card */
  onMarkerClick?: (offerId: string) => void;
}

/* ── helpers ─────────────────────────────────────────────── */

/** Group nearby offers into visual clusters */
function clusterOffers(offers: Offer[], radiusDeg = 0.6) {
  const clusters: { lat: number; lng: number; offers: Offer[] }[] = [];
  for (const offer of offers) {
    if (offer.latitude == null || offer.longitude == null) continue;
    const match = clusters.find(
      (c) =>
        Math.abs(c.lat - offer.latitude!) < radiusDeg &&
        Math.abs(c.lng - offer.longitude!) < radiusDeg,
    );
    if (match) {
      match.offers.push(offer);
      // keep centroid stable — average all points
      match.lat =
        match.offers.reduce((s, o) => s + (o.latitude ?? 0), 0) /
        match.offers.length;
      match.lng =
        match.offers.reduce((s, o) => s + (o.longitude ?? 0), 0) /
        match.offers.length;
    } else {
      clusters.push({
        lat: offer.latitude,
        lng: offer.longitude,
        offers: [offer],
      });
    }
  }
  return clusters;
}

/** Derive city-jump chips from the actual visible offers */
function deriveCityChips(offers: Offer[]) {
  const seen = new Map<string, { label: string; lat: number; lng: number; count: number }>();
  for (const o of offers) {
    if (o.latitude == null || o.longitude == null) continue;
    const key = `${o.city}-${o.state}`;
    if (!seen.has(key)) {
      seen.set(key, {
        label: `${o.city}, ${o.state}`,
        lat: o.latitude,
        lng: o.longitude,
        count: 1,
      });
    } else {
      seen.get(key)!.count++;
    }
  }
  // Sort by count desc, then alphabetical
  return [...seen.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/* ── component ───────────────────────────────────────────── */

const MapView = ({ offers, highlightOfferId, onMarkerClick }: MapViewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker | L.Marker>>(new Map());
  const { formatPayout } = useCountry();

  const cityChips = deriveCityChips(offers);

  // Build / rebuild map once on mount
  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
      minZoom: 3,
      maxZoom: 16,
    }).setView([45, -100], 4);

    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Render markers whenever offers change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current.clear();

    // Remove any remaining non-tile layers
    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) map.removeLayer(layer);
    });

    const geoOffers = offers.filter(
      (o) => o.latitude != null && o.longitude != null,
    );

    if (geoOffers.length === 0) {
      map.setView([45, -100], 4);
      return;
    }

    // Fit bounds to visible offers
    const bounds = L.latLngBounds(
      geoOffers.map((o) => [o.latitude!, o.longitude!] as [number, number]),
    );
    map.fitBounds(bounds.pad(0.15), { maxZoom: 12 });

    const clusters = clusterOffers(geoOffers);

    clusters.forEach((cluster) => {
      if (cluster.offers.length === 1) {
        const offer = cluster.offers[0];
        const payoutLabel = formatPayout(offer.payout, offer.currency);
        const radius = Math.max(10, Math.min(20, offer.payout / 30));
        const isVerified = !!offer.verified;
        const fillColor = isVerified
          ? "hsl(160, 84%, 22%)"
          : "hsl(220, 10%, 55%)";
        const borderColor = isVerified
          ? "hsl(160, 84%, 30%)"
          : "hsl(220, 10%, 65%)";
        const flag = offer.country === "CA" ? "🇨🇦" : "🇺🇸";

        const marker = L.circleMarker(
          [offer.latitude!, offer.longitude!],
          {
            radius,
            fillColor,
            color: borderColor,
            weight: isVerified ? 3 : 2,
            opacity: 0.9,
            fillOpacity: 0.7,
          },
        ).addTo(map);

        markersRef.current.set(offer.id, marker);

        const verifiedHtml = isVerified
          ? `<div style="display:flex;align-items:center;gap:4px;font-size:11px;color:hsl(160,84%,22%);font-weight:600;margin-bottom:6px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Verified Business
            </div>`
          : "";

        marker.bindPopup(`
          <div style="font-family:Inter,system-ui,sans-serif;min-width:220px;padding:4px;">
            <div style="font-size:14px;font-weight:700;margin-bottom:2px;">${offer.title}</div>
            <div style="font-size:12px;color:#666;margin-bottom:6px;">${flag} ${offer.business} · ${offer.category}</div>
            ${verifiedHtml}
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="background:linear-gradient(135deg,${fillColor},${borderColor});color:white;padding:4px 14px;border-radius:999px;font-weight:700;font-size:14px;">
                ${payoutLabel} <span style="font-size:10px;opacity:0.8">${offer.currency}</span>
              </span>
              <span style="font-size:11px;color:#999;">${offer.location}</span>
            </div>
            ${offer.serviceRadius ? `<div style="font-size:11px;color:#888;margin-bottom:4px;">Service area: ${offer.serviceRadius}</div>` : ""}
            <div style="margin-top:10px;display:flex;gap:6px;">
              <a href="/offer/${toSlug(offer.business)}/${offer.id}" style="flex:1;text-align:center;padding:6px;background:hsl(160,84%,22%);color:white;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;">View Details</a>
            </div>
          </div>
        `);

        marker.on("click", () => onMarkerClick?.(offer.id));
      } else {
        // Cluster marker
        const count = cluster.offers.length;
        const avgPayout = Math.round(
          cluster.offers.reduce((s, o) => s + o.payout, 0) / count,
        );
        const hasCA = cluster.offers.some((o) => o.country === "CA");
        const hasUS = cluster.offers.some((o) => o.country === "US");
        const flags = hasCA && hasUS ? "🇨🇦🇺🇸" : hasCA ? "🇨🇦" : "🇺🇸";

        const icon = L.divIcon({
          html: `<div style="background:hsl(160,84%,22%);color:white;border-radius:50%;width:44px;height:44px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Inter,system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid hsl(160,84%,30%);">
            <span style="font-size:14px;font-weight:700;">${count}</span>
            <span style="font-size:9px;opacity:0.8;">~$${avgPayout}</span>
          </div>`,
          className: "",
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });

        const clusterMarker = L.marker([cluster.lat, cluster.lng], { icon }).addTo(map);

        // Store ref under first offer id for lookup
        cluster.offers.forEach((o) =>
          markersRef.current.set(o.id, clusterMarker as any),
        );

        const listHtml = cluster.offers
          .slice(0, 4)
          .map((o) => {
            const pl = formatPayout(o.payout, o.currency);
            const f = o.country === "CA" ? "🇨🇦" : "🇺🇸";
            return `<div style="margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid #eee;">
              <div style="font-weight:600;font-size:13px;">${f} ${o.title}</div>
              <div style="font-size:11px;color:#888;">${o.business} · <strong style="color:hsl(160,84%,22%);">${pl}</strong></div>
            </div>`;
          })
          .join("");

        clusterMarker.bindPopup(`
          <div style="font-family:Inter,system-ui,sans-serif;min-width:200px;padding:4px;">
            <div style="font-size:13px;font-weight:700;margin-bottom:8px;">${flags} ${count} offers in this area</div>
            ${listHtml}
            ${count > 4 ? `<div style="font-size:11px;color:#999;">+${count - 4} more</div>` : ""}
          </div>
        `);

        clusterMarker.on("click", () => {
          map.setView([cluster.lat, cluster.lng], Math.min(map.getZoom() + 3, 13));
        });
      }
    });
  }, [offers, formatPayout, onMarkerClick]);

  // Highlight a specific marker when card is hovered / clicked
  useEffect(() => {
    if (!highlightOfferId || !mapInstanceRef.current) return;
    const marker = markersRef.current.get(highlightOfferId);
    if (marker) {
      const latLng = marker.getLatLng();
      mapInstanceRef.current.setView(latLng, Math.max(mapInstanceRef.current.getZoom(), 10), { animate: true });
      marker.openPopup();
    }
  }, [highlightOfferId]);

  const jumpToCity = useCallback(
    (lat: number, lng: number) => {
      mapInstanceRef.current?.setView([lat, lng], 11, { animate: true });
    },
    [],
  );

  return (
    <div>
      {cityChips.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {cityChips.map((city) => (
            <Button
              key={city.label}
              variant="outline"
              size="sm"
              className="text-xs h-7 px-2.5 gap-1"
              onClick={() => jumpToCity(city.lat, city.lng)}
            >
              {city.label}
              <span className="text-muted-foreground">({city.count})</span>
            </Button>
          ))}
        </div>
      )}
      <div
        ref={mapRef}
        className="h-[550px] w-full rounded-xl border border-border overflow-hidden"
      />
    </div>
  );
};

export default MapView;
