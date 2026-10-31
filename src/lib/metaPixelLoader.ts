type Pixel = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue: unknown[][]; push?: Pixel; loaded?: boolean; version?: string };
declare global { interface Window { fbq?: Pixel; _fbq?: Pixel } }
export function loadPixel(id: string) {
  if (!/^\d+$/.test(id)) return;
  if (!window.fbq) {
    const pixel: Pixel = Object.assign((...args: unknown[]) => {
      if (pixel.callMethod) pixel.callMethod.apply(pixel, args); else pixel.queue.push(args);
    }, { queue: [] as unknown[][], loaded: true, version: "2.0" });
    pixel.push = pixel; window.fbq = pixel; window._fbq = pixel;
    const script = document.createElement("script"); script.async = true; script.src = "https://connect.facebook.net/en_US/fbevents.js"; document.head.appendChild(script);
    pixel("init", id, {}, { agent: "lovable" });
  }
}