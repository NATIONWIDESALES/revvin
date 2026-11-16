import { isLikelyBot } from "@/lib/botCheck";

const MARKETING_PATHS = new Set([
  "/", "/pricing", "/how-it-works", "/guides", "/referral-programs",
  "/tools", "/compare", "/about", "/partners", "/sample", "/ask-kit",
]);

export function origamiMarketingPath(path: string): boolean {
  const normalized = path === "/" ? path : path.replace(/\/$/, "");
  return MARKETING_PATHS.has(normalized) ||
    /^\/(guides|referral-program|compare)\/[a-z0-9-]+$/.test(normalized) ||
    /^\/tools\/(referral-program-grader|referral-reward-calculator|referral-message-generator)$/.test(normalized);
}

export function origamiAllowed(path: string): boolean {
  return origamiMarketingPath(path) &&
    !(navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl &&
    navigator.doNotTrack !== "1" && !isLikelyBot();
}

/** Opaque sandbox: provider code cannot read account URLs, forms or site cookies. */
export function createOrigamiFrame(): HTMLIFrameElement {
  const frame = document.createElement("iframe");
  frame.id = "origami-visitors";
  frame.hidden = true;
  frame.title = "Marketing visitor measurement";
  frame.setAttribute("sandbox", "allow-scripts");
  frame.referrerPolicy = "no-referrer";
  frame.srcdoc = `<!doctype html><html><head><meta name="referrer" content="no-referrer"></head><body>
<script>window.origami = window.origami || function () { (origami.q = origami.q || []).push(arguments) };</script>
<script async src="https://origami-web-visitors.com/v1/o.js" data-key="og_pk_0eCVHRhHCdjnzxpeLe_iOQ"></script>
</body></html>`;
  return frame;
}