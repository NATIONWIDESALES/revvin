// Pure helpers behind the dashboard Home view. Kept free of React and the
// backend so the next-step mapping and the stat tiles are unit tested.

export type DashTab =
  | "home" | "leads" | "customers" | "referrers" | "payouts"
  | "page" | "share" | "jobdone" | "campaigns" | "reports"
  | "account" | "billing" | "offers" | "referrals" | "integrations";

export const VALID_TABS: DashTab[] = [
  "home", "leads", "customers", "referrers", "payouts", "page", "share", "jobdone",
  "campaigns", "reports", "account", "billing", "offers", "referrals", "integrations",
];

/** Older links used names that now live elsewhere in the rail. */
const TAB_ALIASES: Record<string, DashTab> = { rewards: "payouts", settings: "account" };

export function resolveTab(raw: string | null | undefined): DashTab {
  if (!raw) return "home";
  if ((VALID_TABS as string[]).includes(raw)) return raw as DashTab;
  return TAB_ALIASES[raw] ?? "home";
}

export interface SetupState {
  isLive: boolean;
  customersTotal: number;
  customersSent: number;
  customersPending: number;
  qrDownloaded: boolean;
  hasReviewLink: boolean;
}

export type NextStepKey = "publish" | "import" | "ask" | "qr" | "review" | "ask_more" | "share_again";

export interface NextStep {
  key: NextStepKey;
  title: string;
  body: string;
  button: string;
  tab: DashTab | null;
}

export function setupDone(s: SetupState): boolean[] {
  return [s.isLive, s.customersTotal > 0, s.customersSent > 0, s.qrDownloaded, s.hasReviewLink];
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function nextStep(s: SetupState): NextStep {
  if (!s.isLive) return {
    key: "publish", title: "Publish your page",
    body: "Publishing is free. Your page has to be live before anyone can send you a referral.",
    button: "Publish your page", tab: null,
  };
  if (s.customersTotal === 0) return {
    key: "import", title: "Add your last 10 customers",
    body: "Happy past customers are where most referrals start. Add them once and ask from here.",
    button: "Add your last 10 customers", tab: "customers",
  };
  if (s.customersSent === 0) return {
    key: "ask", title: "Ask your last 10 customers",
    body: `You've added ${plural(s.customersTotal, "customer", "customers")}. Send each one a personal ask from your own phone or email.`,
    button: "Ask your last 10 customers", tab: "customers",
  };
  if (!s.qrDownloaded) return {
    key: "qr", title: "Put your QR on every invoice",
    body: "Download your QR code or print pack so every invoice and truck points to your page.",
    button: "Put your QR on every invoice", tab: "share",
  };
  if (!s.hasReviewLink) return {
    key: "review", title: "Add your Google review link",
    body: "Happy customers get your review link next to the referral ask.",
    button: "Add your Google review link", tab: "page",
  };
  if (s.customersPending > 0) return {
    key: "ask_more", title: "Ask 10 more customers",
    body: `${plural(s.customersPending, "customer has", "customers have")} not been asked yet.`,
    button: "Ask 10 more customers", tab: "customers",
  };
  return {
    key: "share_again", title: "Share your page link again",
    body: "Every customer has been asked. Share your link with new customers as you finish jobs.",
    button: "Share your page link again", tab: "share",
  };
}

export interface LeadLite {
  id: string;
  created_at: string;
  updated_at?: string | null;
  status: string;
  deal_value?: number | null;
  lead_name: string;
  lead_phone: string;
  lead_need: string;
  referrer_name: string;
}

export interface RewardLite { status: string; amount: number | string | null; referrer_name: string | null; referrer_contact?: string | null }

export interface HomeStats {
  referralsThisMonth: number;
  jobsClosed: number;
  revenue: number;
  owed: number;
  owedPeople: number;
}

export function computeStats(leads: LeadLite[], rewards: RewardLite[], now = new Date()): HomeStats {
  const y = now.getFullYear(); const m = now.getMonth();
  const won = leads.filter((l) => l.status === "closed_won");
  const pending = rewards.filter((r) => r.status === "pending");
  const people = new Set(pending.map((r) => (r.referrer_contact || r.referrer_name || "").toLowerCase()));
  return {
    referralsThisMonth: leads.filter((l) => { const d = new Date(l.created_at); return d.getFullYear() === y && d.getMonth() === m; }).length,
    jobsClosed: won.length,
    revenue: won.reduce((s, l) => s + Number(l.deal_value || 0), 0),
    owed: pending.reduce((s, r) => s + Number(r.amount || 0), 0),
    owedPeople: people.size,
  };
}

const DAY = 86_400_000;
/** "Quoted" in the rail copy is the existing in_progress status. */
export function leadsToCall(leads: LeadLite[], now = new Date()): Array<LeadLite & { stale: boolean }> {
  return leads
    .filter((l) => ["new", "contacted", "in_progress"].includes(l.status))
    .map((l) => ({ ...l, stale: l.status === "in_progress" && now.getTime() - new Date(l.created_at).getTime() > 5 * DAY }))
    .filter((l) => l.status !== "in_progress" || l.stale)
    .slice(0, 5);
}

export function relativeTime(iso: string, now = new Date()): string {
  const d = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / DAY));
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d} days ago`;
  const mo = Math.floor(d / 30);
  return mo === 1 ? "1 month ago" : `${mo} months ago`;
}

export const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
