// City-level geocode query for a business with no street address. Pure.
const US_STATE = /^[A-Za-z]{2}$/;

export function cityQueryFromBusiness(b: { city?: string | null; state?: string | null; service_area?: string | null; country?: string | null }): string | null {
  const area = (b.service_area ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  let city = (b.city ?? "").trim() || area[0] || "";
  let region = (b.state ?? "").trim() || (area[1] && US_STATE.test(area[1]) ? area[1] : "");
  // "Marietta GA" or "Tomsriver nj" with no comma.
  const tail = city.match(/^(.*\S)\s+([A-Za-z]{2})$/);
  if (!region && tail) { city = tail[1]; region = tail[2]; }
  if (!city || city.length > 120) return null;
  // A bare city name ("Lakewood") matches many places; leave it off the map.
  if (!region && !(b.country ?? "").trim()) return null;
  const country = (b.country ?? "").trim();
  return [city, region.toUpperCase(), country].filter(Boolean).join(", ");
}

export const cityQueryKey = (q: string) => q.toLowerCase().replace(/\s+/g, " ").trim();
