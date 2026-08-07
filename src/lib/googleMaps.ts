/**
 * Lazy loader for the Google Maps JS API. Only the screens that need Places
 * autocomplete call this, so the library never ships on app-wide routes.
 */
let loader: Promise<typeof google.maps> | null = null;

export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (loader) return loader;

  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;

  if (!key) {
    loader = Promise.reject(new Error("Google Maps browser key is not configured"));
    return loader;
  }

  loader = new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Google Maps can only load in the browser"));
      return;
    }
    if ((window as any).google?.maps?.importLibrary) {
      resolve((window as any).google.maps);
      return;
    }

    const callbackName = "__revvinInitMaps";
    (window as any)[callbackName] = () => resolve((window as any).google.maps);

    const existing = document.querySelector<HTMLScriptElement>("script[data-revvin-maps]");
    if (existing) return;

    const script = document.createElement("script");
    script.async = true;
    script.dataset.revvinMaps = "1";
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}` +
      `&libraries=places&loading=async&callback=${callbackName}` +
      (channel ? `&channel=${encodeURIComponent(channel)}` : "");
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });

  return loader;
}
