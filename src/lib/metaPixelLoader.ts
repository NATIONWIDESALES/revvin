import { validFbclid } from "@/lib/metaClick";

/** The SDK lives in a separate, no-referrer document and cannot inspect signup forms or SPA URLs. */
export function loadPixel(id: string, fbclid: string | null = null, permitted: () => boolean = () => true) {
  if (!/^\d+$/.test(id)) return null;
  const frame = document.createElement("iframe");
  frame.src = validFbclid(fbclid) ? `/ad-events.html?${new URLSearchParams({ fbclid })}` : "/ad-events.html";
  frame.referrerPolicy = "no-referrer"; frame.hidden = true; frame.title = "Advertising measurement";
  let ready = false;
  let disposed = false;
  let closing = false;
  let sequence = 0;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const pending: { event: string; sequence: number }[] = [];
  const outstanding = new Set<number>();
  const remove = () => {
    if (disposed) return;
    disposed = true; pending.length = 0; outstanding.clear(); clearTimeout(timeout);
    window.removeEventListener("message", ack);
    window.removeEventListener("storage", revoke);
    window.removeEventListener("revvin:advertising-choice", revoke);
    frame.remove();
  };
  const revoke = () => { if (!permitted()) remove(); };
  const ack = (message: MessageEvent) => {
    if (message.origin !== location.origin || message.source !== frame.contentWindow || message.data?.type !== "revvin-pixel-ack" || message.data.id !== id) return;
    outstanding.delete(message.data.sequence);
    if (closing && outstanding.size === 0) remove();
  };
  const flush = () => {
    if (!permitted()) { remove(); return; }
    if (!ready || disposed) return;
    for (const item of pending.splice(0)) frame.contentWindow?.postMessage({ type: "revvin-pixel", id, ...item }, location.origin);
  };
  const send = (event: string) => {
    if (disposed || closing || !["PageView", "Lead", "CompleteRegistration", "PagePublished"].includes(event)) return;
    outstanding.add(++sequence);
    pending.push({ event, sequence }); flush();
  };
  frame.addEventListener("load", () => { ready = true; flush(); });
  window.addEventListener("message", ack);
  window.addEventListener("storage", revoke);
  window.addEventListener("revvin:advertising-choice", revoke);
  document.body.appendChild(frame);
  return { send, dispose: (immediate = false) => {
    if (immediate || !permitted() || outstanding.size === 0) { remove(); return; }
    if (closing || disposed) return;
    closing = true; flush();
    timeout = setTimeout(remove, 5000);
  } };
}