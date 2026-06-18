import { registerContentGuard, type ForbiddenPattern } from "./helpers/contentGuard";

// Broad scan of all user-facing surfaces: pages, components, mock/seed data,
// translation files, markdown docs, edge-function templates, public assets,
// and the root HTML shell. Admin/dashboard internal payout UI is excluded
// via skipPaths until the follow-up pass.
const ROOTS = [
  "src/pages",
  "src/components",
  "src/data",
  "src/contexts",
  "src/hooks",
  "src/lib",
  "src/locales",
  "src/i18n",
  "src/content",
  "src/assets",
  "supabase/functions",
  "docs",
  "public",
  "index.html",
  "README.md",
];

const SKIP_DIRS = [
  // shadcn primitives — vendored UI library, not our copy
  "ui",
  // Supabase generated client types
  "supabase",
];

const SKIP_PATHS = [
  "src/pages/dashboard/",
  "src/pages/SuperAdminCRM",
  "src/integrations/",
  // Internal server-side Stripe price→tier mapping (legacy products).
  "supabase/functions/check-subscription/",
  // Legacy wallet-based lifecycle sync — being removed in follow-up pass.
  "supabase/functions/sync-offer-lifecycle/",
];

// To add a new guard: append one row. No other changes required.
const FORBIDDEN: ForbiddenPattern[] = [
  { label: "$147", pattern: /\$147\b/ },
  { label: "3 months", pattern: /\b3\s+months\b/i },
  // Architecture reset: flat $49/mo, direct payouts.
  { label: "wallet", pattern: /\bwallet\b/i },
  { label: "tremendous", pattern: /\btremendous\b/i },
  { label: "escrow", pattern: /\bescrow/i },
  { label: "platform fee", pattern: /(?<!no\s)\bplatform\s+fees?\b/i },
  { label: "Starter tier", pattern: /\bstarter\b/i },
  { label: "Enterprise tier", pattern: /\benterprise\b/i },
  // Additional deprecated pricing models — flat $49/mo only, no tiers.
  // NOTE: "per-referral fee" is intentionally NOT guarded — we use the phrase
  // in negation ("no per-referral fee") as a selling point across marketing copy.
  { label: "success fee", pattern: /\bsuccess\s+fees?\b/i },
  { label: "finder's fee", pattern: /\bfinder'?s\s+fees?\b/i },
  { label: "transaction fee", pattern: /\btransaction\s+fees?\b/i },
  { label: "payout fee", pattern: /\bpayout\s+fees?\b/i },
  { label: "take rate", pattern: /\btake[-\s]rate\b/i },
  { label: "revenue share", pattern: /\brevenue[-\s]share\b/i },
  { label: "tiered pricing", pattern: /\btiered\s+pricing\b/i },
  { label: "Pro tier/plan", pattern: /\bpro\s+(tier|plan)\b/i },
  { label: "Basic tier/plan", pattern: /\bbasic\s+(tier|plan)\b/i },
  { label: "Premium tier/plan", pattern: /\bpremium\s+(tier|plan)\b/i },
  { label: "Growth tier/plan", pattern: /\bgrowth\s+(tier|plan)\b/i },
  { label: "$97 price point", pattern: /\$97\b/ },
  { label: "$197 price point", pattern: /\$197\b/ },
  { label: "$247 price point", pattern: /\$247\b/ },
  { label: "$99/mo price point", pattern: /\$99\s*\/?\s*(mo|month)\b/i },
  { label: "$29/mo price point", pattern: /\$29\s*\/?\s*(mo|month)\b/i },
  { label: "$19/mo price point", pattern: /\$19\s*\/?\s*(mo|month)\b/i },
  // Payout-flow lies — Revvin never holds funds or pays referrers.
  { label: "payout processed by Revvin", pattern: /payout\s+processed\s+by\s+revvin/i },
  { label: "platform-mediated payout", pattern: /platform[-\s]mediated\s+payout/i },
  { label: "Revvin pays you", pattern: /\brevvin\s+pays\s+(you|the\s+referrer)/i },
  { label: "funds held/reserved by Revvin", pattern: /\bfunds\s+(held|reserved)\b/i },
];

registerContentGuard(
  "content guards — deprecated pricing strings",
  {
    roots: ROOTS,
    skipDirs: SKIP_DIRS,
    skipPaths: SKIP_PATHS,
    selfPath: "src/test/content-guards.test.ts",
  },
  FORBIDDEN,
);
