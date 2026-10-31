/** The SDK lives in a separate, no-referrer document and cannot inspect signup forms or SPA URLs. */
export function loadPixel(id: string) {
  if (!/^\d+$/.test(id)) return null;
  const frame = document.createElement("iframe");
  frame.src = "/ad-events.html"; frame.referrerPolicy = "no-referrer"; frame.hidden = true; frame.title = "Advertising measurement";
  let ready = false;
  const pending: string[] = [];
  const send = (event: string) => {
    if (ready) frame.contentWindow?.postMessage({ type: "revvin-pixel", id, event }, location.origin);
    else pending.push(event);
  };
  frame.addEventListener("load", () => { ready = true; for (const event of pending.splice(0)) send(event); });
  document.body.appendChild(frame);
  return { send, dispose: () => { pending.length = 0; frame.remove(); } };
}