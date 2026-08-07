import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin } from "lucide-react";
import { loadGoogleMaps } from "@/lib/googleMaps";

export interface PlaceSelection {
  label: string;
  latitude: number;
  longitude: number;
  city: string | null;
  state: string | null;
  country: string | null;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Fired only when a suggestion is picked, with coordinates from the Places result. */
  onPlaceSelected: (place: PlaceSelection) => void;
  placeholder?: string;
  id?: string;
}

/** Cities and regions only, never street addresses. */
const PLACE_TYPES = [
  "locality",
  "postal_town",
  "administrative_area_level_1",
  "administrative_area_level_2",
];

function componentOf(components: any[], type: string, short = false): string | null {
  const hit = components?.find((c) => (c.types ?? []).includes(type));
  if (!hit) return null;
  return (short ? hit.shortText ?? hit.short_name : hit.longText ?? hit.long_name) ?? null;
}

const ServiceAreaAutocomplete = ({
  value,
  onChange,
  onPlaceSelected,
  placeholder = "Vancouver, BC",
  id,
}: Props) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const placesRef = useRef<any>(null);
  const sessionRef = useRef<any>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(async (maps: any) => {
        const places = await maps.importLibrary("places");
        if (!cancelled) placesRef.current = places;
      })
      .catch((err) => {
        console.error("[ServiceAreaAutocomplete] Maps unavailable", err);
        if (!cancelled) setUnavailable(true);
      });
    return () => {
      cancelled = true;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  const fetchSuggestions = (input: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!input.trim() || input.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      const places = placesRef.current;
      if (!places?.AutocompleteSuggestion) return;
      try {
        setBusy(true);
        if (!sessionRef.current) sessionRef.current = new places.AutocompleteSessionToken();
        const { suggestions: results } =
          await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: input.trim(),
            sessionToken: sessionRef.current,
            includedPrimaryTypes: PLACE_TYPES,
          });
        setSuggestions(results ?? []);
        setOpen(true);
      } catch (err) {
        console.error("[ServiceAreaAutocomplete] suggestion lookup failed", err);
        setSuggestions([]);
      } finally {
        setBusy(false);
      }
    }, 250);
  };

  const pick = async (suggestion: any) => {
    setOpen(false);
    const prediction = suggestion?.placePrediction;
    if (!prediction) return;
    const label = (prediction.text?.toString?.() ?? "").trim();
    if (label) onChange(label);
    try {
      const place = prediction.toPlace();
      await place.fetchFields({ fields: ["location", "addressComponents", "displayName"] });
      // A fresh session token per selection, that is how Places bills sessions.
      sessionRef.current = null;
      const lat = place.location?.lat?.() ?? place.location?.lat;
      const lng = place.location?.lng?.() ?? place.location?.lng;
      if (typeof lat !== "number" || typeof lng !== "number") return;
      const components = place.addressComponents ?? [];
      onPlaceSelected({
        label: label || place.displayName || "",
        latitude: lat,
        longitude: lng,
        city:
          componentOf(components, "locality") ??
          componentOf(components, "postal_town") ??
          componentOf(components, "administrative_area_level_2"),
        state: componentOf(components, "administrative_area_level_1", true),
        country: componentOf(components, "country", true),
      });
    } catch (err) {
      // Free text still saves; coordinates get resolved server-side after save.
      console.error("[ServiceAreaAutocomplete] place details failed", err);
    }
  };

  return (
    <div className="relative">
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          if (!unavailable) fetchSuggestions(e.target.value);
        }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        className="mt-1.5"
      />
      {busy && (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          {suggestions.slice(0, 6).map((s, i) => {
            const text = s?.placePrediction?.text?.toString?.() ?? "";
            return (
              <li key={i}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(s)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{text}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ServiceAreaAutocomplete;
