import { OPENAI_PIXEL_ID, OPENAI_PIXEL_DEBUG } from "@/config/brand";

type OpenAiCommand =
  | ["init", { pixelId: string; debug: boolean }]
  | ["consent", boolean]
  | ["measure", "registration_completed", { type: "customer_action" }, { event_id: string }];
type OpenAiQueue = ((...args: OpenAiCommand) => void) & { q?: OpenAiCommand[] };
declare global { interface Window { oaiq?: OpenAiQueue } }
interface PixelState {
  initialized: boolean;
  granted: boolean;
  permitted: () => boolean;
  starting?: Promise<boolean>;
  sent: Set<string>;
}
const states = new WeakMap<Document, PixelState>();
function state(): PixelState {
  const previous = states.get(document);
  if (previous && (!previous.initialized || window.oaiq)) return previous;
  const next: PixelState = { initialized: false, granted: false, permitted: () => false, sent: new Set() };
  states.set(document, next);
  return next;
}

/** Route/account eligibility is supplied by the same mounted permission boundary as loading. */
export function setOpenAiAdPermission(permitted: () => boolean) {
  state().permitted = permitted;
}

/** The SDK stays installed on SPA navigation; its own denial stops measurement and removes cookies. */
export function withdrawOpenAiAds() {
  const current = state();
  if (!current.initialized || !current.granted) return;
  current.granted = false;
  // If the SDK has not executed yet, do not transiently grant consent while it drains its queue.
  window.oaiq?.("consent", false);
  if (window.oaiq?.q) window.oaiq.q = [["consent", false], ["init", { pixelId: OPENAI_PIXEL_ID, debug: OPENAI_PIXEL_DEBUG }]];
}

/** Do not load a top-level SDK that is configured to collect customer fields automatically. */
async function matchingDisabled() {
  try {
    const response = await fetch(`https://bzrcdn.openai.com/pixel-config/v1/${OPENAI_PIXEL_ID}.json`, {
      signal: AbortSignal.timeout(2000), credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store",
    });
    if (!response.ok) return false;
    const config = await response.json();
    return config?.automatic_advanced_matching_enabled === false;
  } catch { return false; }
}

export async function initializeOpenAiAds(): Promise<boolean> {
  const current = state();
  if (!OPENAI_PIXEL_ID || !current.permitted()) return false;
  if (current.initialized) return current.granted;
  if (current.starting) return current.starting;
  current.starting = (async () => {
    if (!await matchingDisabled() || !current.permitted()) return false;
    if (!window.oaiq) {
      const queue: OpenAiQueue = (...args) => { queue.q?.push(args); };
      queue.q = []; window.oaiq = queue;
      const script = document.createElement("script");
      script.id = "openai-ad-pixel"; script.async = true;
      script.src = "https://bzrcdn.openai.com/sdk/oaiq.min.js";
      document.head.appendChild(script);
    }
    // No user object: customer matching is neither configured nor authorized by this integration.
    window.oaiq("consent", true);
    window.oaiq("init", { pixelId: OPENAI_PIXEL_ID, debug: OPENAI_PIXEL_DEBUG });
    current.initialized = true; current.granted = true;
    return true;
  })();
  try { return await current.starting; } finally { current.starting = undefined; }
}

export type OpenAiAdEventParams = Readonly<{ type: "customer_action" }>;
export function trackOpenAiAdEvent(name: "registration_completed", params: OpenAiAdEventParams, options: Readonly<{ event_id: string }>): boolean {
  const current = state();
  if (!current.initialized || !current.granted || !current.permitted() || !window.oaiq) {
    if (current.initialized && !current.permitted()) withdrawOpenAiAds();
    return false;
  }
  if (name !== "registration_completed" || params.type !== "customer_action" || !/^reg_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(options.event_id) || current.sent.has(options.event_id)) return false;
  try {
    window.oaiq("measure", name, { type: "customer_action" }, { event_id: options.event_id });
    current.sent.add(options.event_id);
    return true;
  } catch { return false; }
}
