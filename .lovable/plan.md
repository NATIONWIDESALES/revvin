# Revvin Launch-Readiness Pass

Scope: site-wide polish, trust, and launch essentials. Match existing design system. Never fabricate testimonials, stats, or "live" claims.

## Section A — Fix trust-breaking issues

**A1. Marketplace "live" → "launching" framing**
- Grep entire `src/` for "marketplace is live" / "live" / "marketplace" claims and reframe to "launching / be one of the first."
- Homepage Featured Offers: keep cards, make "illustrative examples" disclaimer prominent.
- `src/pages/Browse.tsx`: when DB has 0 real listings, render a designed empty state (headline, copy, two CTAs: "List your business" → `/signup`, and "Get notified" email capture reusing `PlaybookEmailCapture` logic with `source='marketplace_notify'`).
- Homepage FAQ "Do you have a marketplace…" answer: update to honest launching framing.

**A2. Pricing page FAQ**
- Audit `src/pages/Pricing.tsx`; ensure every accordion has a real answer. Refactor to a single `FAQS` array (same pattern as homepage) so questions/answers can't drift.

**A3. How-it-works step count**
- `src/pages/HowItWorks.tsx` + `MockPageBuilder` / `MockQRCard` / `MockLeadsTable`: fix any "Step 2 of 4" indicator to match the real 3-step flow.

**A4. Placeholder sweep**
- Grep `src/` for: `TODO`, `FOUNDER-CONFIRMED`, `lorem`, `placeholder`, `Apex Roofing`, `Coming soon`, `href="#"`. Fix or flag each.

## Section B — Trust + conversion structure (honest)

**B2. Testimonials component**
- New `src/components/marketing/Testimonials.tsx` driven by a `testimonials: Testimonial[]` array. Empty array → render an honest "founding members" CTA block instead of fake quotes. Place on homepage between bento and pricing teaser.

**B3. Founder/trust note**
- Short founder block above the final homepage CTA. Real copy wrapped in a clearly commented `TODO: founder bio` placeholder — no invented bio.

**B4. Risk-reversal strip**
- Trust row near pricing teaser + on `/pricing`: "Cancel anytime · No contract · No setup fee · Your data is never deleted if you cancel" with small lucide icons.

**B5. Stripe security cue**
- Small "Secure checkout powered by Stripe" line with lock icon near payment CTA on `/pricing` and `/signup` (only — checkout uses Stripe).

## Section C — Technical launch essentials

**C1. Email capture backend**
- Introduce shared `src/lib/emailLeads.ts` exporting `submitEmailLead(email, source)` that inserts into existing `email_leads` table. Update `PlaybookEmailCapture` and the new Browse capture to use it with distinct `source` values (`'playbook'`, `'marketplace_notify'`). The `email_leads` table already exists — confirm schema has a `source` column (it does per earlier migration).

**C2. Playbook asset**
- No PDF exists. Change copy: instead of "Check your inbox — it's on the way," say "Thanks — we'll email you when the playbook is ready." Flag in summary.

**C3. SEO + sharing**
- Audit every public route for `SEOHead` usage (`/`, `/how-it-works`, `/pricing`, `/browse`, `/signup`, `/sample`, `/for-businesses`, `/for-referrers`, `/terms`, `/privacy`). Add where missing.
- Confirm `public/sitemap.xml`, `public/robots.txt`, favicons (already present).
- OG image: check `/og-image.png` exists in `public/`; if missing, flag.

**C4. 404 + loading**
- Verify `NotFound.tsx` is branded with a link home; polish if bare.

**C5. Legal pages**
- `/terms`, `/privacy` already exist and are in the footer. Confirm signup links to them. No new content fabricated.

**C6. Analytics**
- Add a lightweight `<Analytics />` component that reads `VITE_PLAUSIBLE_DOMAIN` env var and injects the Plausible script only when set; also fires `pageview` on route changes via `useLocation`. No key required — flag in summary that the user must set the env var.

## Section D — Final QA

- `rg` for dead `href="#"`, run `tsgo` typecheck via harness, screenshot homepage + browse + pricing + signup at 375px with Playwright.

## Deliverable
End with the 3 lists: ✅ changed, 🔧 needs user action (testimonials, playbook PDF, OG image confirm, Plausible domain, legal review, marketplace seeding), ⚠️ unsure.
