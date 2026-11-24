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
  consentAllowed: () => boolean;
  consentVersion: number;
  starting?: Promise<boolean>;
  sent: Set<string>;
}
const states = new WeakMap<Document, PixelState>();
function state(): PixelState {
  const previous = states.get(document);
  if (previous && (!previous.initialized || window.oaiq)) return previous;
  const next: PixelState = { initialized: false, granted: false, permitted: () => false, consentAllowed: () => false, consentVersion: 0, sent: new Set() };
  states.set(document, next);
  return next;
}

/** Route/account eligibility is supplied by the same mounted permission boundary as loading. */
export function setOpenAiAdPermission(permitted: () => boolean, consentAllowed: () => boolean = permitted) {
  state().permitted = permitted;
  state().consentAllowed = consentAllowed;
}

/** Real withdrawal stops vendor measurement and removes cookies; account/route changes only pause our sends. */
export function withdrawOpenAiAds() {
  const current = state();
  if (!current.initialized || !current.granted) return;
  current.granted = false;
  current.consentVersion += 1;
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
export type OpenAiSignupEligibility = Readonly<{ eligible: true }>;
const signupSnapshots = new WeakMap<OpenAiSignupEligibility, { pixel: PixelState; consentVersion: number }>();

/** One-use permission captured immediately before the signed-out signup request, never persisted. */
export function captureOpenAiSignupEligibility(): OpenAiSignupEligibility | undefined {
  const current = state();
  if (location.pathname !== "/signup" || !current.initialized || !current.granted || !current.permitted() || !current.consentAllowed() || !window.oaiq) return;
  const snapshot = { eligible: true as const };
  signupSnapshots.set(snapshot, { pixel: current, consentVersion: current.consentVersion });
  return snapshot;
}

export function trackOpenAiAdEvent(name: "registration_completed", params: OpenAiAdEventParams, options: Readonly<{ event_id: string }>, signupEligibility?: OpenAiSignupEligibility): boolean {
  const current = state();
  const snapshot = signupEligibility ? signupSnapshots.get(signupEligibility) : undefined;
  if (signupEligibility) signupSnapshots.delete(signupEligibility);
  const eligible = signupEligibility
    ? snapshot?.pixel === current && snapshot.consentVersion === current.consentVersion
    : current.permitted();
  if (!current.initialized || !current.granted || !current.consentAllowed() || !eligible || !window.oaiq) {
    if (current.initialized && !current.consentAllowed()) withdrawOpenAiAds();
    return false;
  }
  if (name !== "registration_completed" || params.type !== "customer_action" || !/^reg_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(options.event_id) || current.sent.has(options.event_id)) return false;
  try {
    window.oaiq("measure", name, { type: "customer_action" }, { event_id: options.event_id });
    current.sent.add(options.event_id);
    return true;
  } catch { return false; }
}
