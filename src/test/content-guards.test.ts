import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

// User-facing copy only — marketing pages, public-facing components, index.html.
// Admin/dashboard/internal payout UI is intentionally excluded; those are
// rewritten in a follow-up pass.
const ROOTS = [
  "src/pages/Index.tsx",
  "src/pages/Pricing.tsx",
  "src/pages/ForBusinesses.tsx",
  "src/pages/ForReferrers.tsx",
  "src/pages/HowItWorks.tsx",
  "src/pages/TrustCenter.tsx",
  "src/pages/AboutRevvinLLM.tsx",
  "src/pages/ReferralAgreement.tsx",
  "src/pages/Terms.tsx",
  "src/pages/Privacy.tsx",
  "src/pages/Browse.tsx",
  "src/pages/PublicReferralPage.tsx",
  "src/pages/Auth.tsx",
  "src/pages/Signup.tsx",
  "src/pages/Onboarding.tsx",
  "src/components/marketing",
  "src/components/Navbar.tsx",
  "src/components/ROICalculator.tsx",
  "src/components/Footer.tsx",
  "index.html",
  "public",
];
const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".git"]);
const TEXT_EXT = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".html", ".css", ".md", ".json", ".txt", ".svg",
]);
const SELF = "src/test/content-guards.test.ts";

function walk(path: string, out: string[] = []): string[] {
  let st;
  try { st = statSync(path); } catch { return out; }
  if (st.isFile()) {
    if (TEXT_EXT.has(extname(path))) out.push(path);
    return out;
  }
  if (!st.isDirectory()) return out;
  for (const entry of readdirSync(path)) {
    if (SKIP_DIRS.has(entry)) continue;
    walk(join(path, entry), out);
  }
  return out;
}

const FORBIDDEN: Array<{ label: string; pattern: RegExp }> = [
  { label: "$147", pattern: /\$147\b/ },
  { label: "3 months", pattern: /\b3\s+months\b/i },
  // Architecture reset: flat $49/mo, direct payouts. None of these belong in user-facing copy.
  { label: "wallet", pattern: /\bwallet\b/i },
  { label: "tremendous", pattern: /\btremendous\b/i },
  { label: "escrow", pattern: /\bescrow/i },
  { label: "platform fee", pattern: /\bplatform\s+fees?\b/i },
  { label: "Starter tier", pattern: /\bstarter\b/i },
  { label: "Enterprise tier", pattern: /\benterprise\b/i },
  // Additional deprecated pricing models — flat $49/mo only, no tiers, no per-referral cuts.
  { label: "per-referral fee", pattern: /\bper[-\s]referral\s+fees?\b/i },
  { label: "per-lead fee", pattern: /\bper[-\s]lead\s+fees?\b/i },
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
];

describe("content guards — deprecated pricing strings", () => {
  const files = ROOTS.flatMap((r) => walk(r));

  for (const { label, pattern } of FORBIDDEN) {
    it(`does not contain "${label}" anywhere in the app`, () => {
      const offenders: string[] = [];
      for (const file of files) {
        if (file.replace(/\\/g, "/") === SELF) continue;
        const text = readFileSync(file, "utf8");
        const lines = text.split("\n");
        lines.forEach((line, i) => {
          if (pattern.test(line)) offenders.push(`${file}:${i + 1}  ${line.trim()}`);
        });
      }
      expect(offenders, `Found forbidden string "${label}":\n${offenders.join("\n")}`).toEqual([]);
    });
  }
});