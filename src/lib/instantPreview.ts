import { PREVIEW_TRADES as INDUSTRIES } from "../content/previewTrades";

export const PREVIEW_KEY = "revvin_instant_preview";
export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
export interface PreviewData {
  name: string;
  trade: string;
  reward: number;
  landing_path: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}
export const previewSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 65) || "your-business";
export const suggestedReward = (trade: string) => {
  return INDUSTRIES.find(i => i.slug === trade)?.reward ?? 100;
};
export const previewQuestion = (trade: string, name: string) => {
  const questions: Record<string, string> = {
    roofing: "Know someone who needs a new roof?", hvac: "Know someone whose furnace quit?",
    plumbing: "Know someone who needs a plumber?", electrical: "Know someone who needs an electrician?",
    landscaping: "Know a yard that needs us?", painting: "Know someone who needs a painter?",
  };
  return questions[trade] ?? `Know someone who could use ${name || "your business"}?`;
};
export function capturePreview(name: string, trade: string, reward: number, href: string): PreviewData {
  const url = new URL(href);
  const data: PreviewData = { name: name.trim().slice(0, 160), trade, reward, landing_path: url.pathname.slice(0, 160) };
  for (const key of UTM_KEYS) {
    const value = url.searchParams.get(key);
    if (value) data[key] = value.slice(0, 200);
  }
  return data;
}
export function previewSignupUrl(data: PreviewData) {
  const params = new URLSearchParams({ name: data.name, trade: data.trade, reward: String(data.reward), landing_path: data.landing_path });
  for (const key of UTM_KEYS) if (data[key]) params.set(key, data[key]);
  return `/signup?${params}`;
}
export function storePreview(data: PreviewData) {
  try { sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(data)); } catch { /* query handoff remains available */ }
}
export function readPreview(search = ""): PreviewData | null {
  try {
    const p = new URLSearchParams(search);
    let input: Record<string, unknown> = {};
    try { input = JSON.parse(sessionStorage.getItem(PREVIEW_KEY) || "{}"); } catch { /* storage may be disabled */ }
    if (p.has("name")) input = Object.fromEntries(p.entries());
    const name = typeof input.name === "string" ? input.name.trim().slice(0, 160) : "";
    const trade = typeof input.trade === "string" && (input.trade === "other" || INDUSTRIES.some(i => i.slug === input.trade)) ? input.trade : "other";
    const reward = Number(input.reward);
    if (!name || !Number.isFinite(reward) || reward <= 0 || reward > 1000000) return null;
    const data: PreviewData = { name, trade, reward, landing_path: typeof input.landing_path === "string" && /^\/(?:start(?:\/[a-z-]+)?)?$/.test(input.landing_path) ? input.landing_path : "/" };
    for (const key of UTM_KEYS) if (typeof input[key] === "string") data[key] = input[key].slice(0, 200);
    return data;
  } catch { return null; }
}
export const previewCategory = (trade: string) => INDUSTRIES.find(i => i.slug === trade)?.label ?? "Other";
export const acquisitionOf = (data: PreviewData | null, href?: string) => {
  const source = data ?? (href ? capturePreview("", "other", 100, href) : null);
  if (!source) return {};
  return Object.fromEntries([...["landing_path"], ...UTM_KEYS].flatMap(key => {
    const value = source[key as keyof PreviewData];
    return typeof value === "string" ? [[key, value]] : [];
  }));
};