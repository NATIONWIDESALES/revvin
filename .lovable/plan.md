

## UI Revision: YC-Startup-Grade Polish

After auditing all pages, here's the remaining work to bring the UI from "cleaned up template" to "Linear/Vercel-caliber early-stage product." The changes are cosmetic only, no backend modifications.

---

### 1. Purge all remaining `font-display` references (19 files)

`font-display` is used ~611 times but was never defined in the Tailwind config. It silently falls back to the default sans-serif. Every instance will be removed or replaced with `font-sans` where emphasis is needed. This is the single biggest "AI-generated" tell in the codebase.

**Files:** TrustCenter.tsx, ReferralAgreement.tsx, Privacy.tsx, Terms.tsx, ResetPassword.tsx, ProfileEdit.tsx, BusinessDashboard.tsx, ReferrerDashboard.tsx, AdminDashboard.tsx, CreateOffer.tsx, OfferDetail.tsx, ReferralWizard.tsx, CitySlots.tsx, DashboardChecklist.tsx, ShareOfferLink.tsx, BoostOfferPanel.tsx, InviteBusinessModal.tsx, OfferCompetitiveness.tsx, SuperAdminCRM.tsx

### 2. Replace magic pixel font sizes with Tailwind scale

`text-[10px]` appears across 10 files. Replace with `text-[0.625rem]` (stays 10px but uses rem) or consolidate to `text-xs` (12px) where 10px is unnecessarily tiny. This removes the "vibe code" signature of arbitrary pixel values.

**Files:** TrustCenter.tsx, ReferralWizard.tsx, BoostOfferPanel.tsx, LeaderboardPreview.tsx, PayoutMethodSetup.tsx, BusinessLogoUpload.tsx

### 3. Standardize card border-radius: `rounded-2xl` to `rounded-xl`

`rounded-2xl` (1rem/16px) is used in ~226 places inconsistently alongside `rounded-xl` (0.75rem/12px). YC-grade products use one radius. Standardize everything to `rounded-xl` for a tighter, more professional feel. Reserve `rounded-2xl` for nothing.

**Files:** TrustCenter.tsx, BusinessDashboard.tsx, ReferrerDashboard.tsx, AdminDashboard.tsx, CreateOffer.tsx, Browse.tsx (empty state), OfferDetail.tsx, ReferralWizard.tsx

### 4. Remove remaining emoji flags from body text

TrustCenter.tsx hero still has inline `🇨🇦` and `🇺🇸` flags in the subtitle, plus `🇨🇦 Canada Example` and `🇺🇸 USA Example` labels. The Browse.tsx country filter buttons also use emoji flags (`🌎 Both`, `🇺🇸 USA`, `🇨🇦 Canada`). Country selectors are acceptable but body text flags should go.

**Files:** TrustCenter.tsx (hero subtitle, payout example labels), Browse.tsx (country filter - keep but clean up labels)

### 5. Tighten the Auth page

- Replace the native `<select>` for industry with the styled `Select` component
- Remove `font-display` reference from the left panel heading

**Files:** Auth.tsx

### 6. Subtle Navbar upgrade

- Add a slight backdrop blur to the sticky navbar: `bg-background/80 backdrop-blur-md` for that premium frosted glass effect every YC startup uses
- Tighten the nav height from `h-14` to `h-[56px]` (same but explicit)

**Files:** Navbar.tsx

### 7. Hero section refinement

- Remove the `HeroConstellation` component entirely. Dot animations on white backgrounds are a strong "template" signal. Replace with nothing - clean white/muted space is more premium
- Keep the `bg-muted/30 border-b border-border` treatment

**Files:** Index.tsx

### 8. Button consistency pass

- Ensure all primary CTAs across pages use the same `h-12 px-8` sizing
- Final CTA sections should all follow the same pattern: centered text, two buttons, `bg-muted` background

**Files:** Minor touches across ForBusinesses.tsx, ForReferrers.tsx, HowItWorks.tsx, TrustCenter.tsx

---

### Summary

| Change | Impact | Effort |
|--------|--------|--------|
| Remove 611 `font-display` references | High - eliminates #1 AI tell | Medium |
| Standardize `rounded-2xl` to `rounded-xl` | Medium - visual consistency | Medium |
| Remove `HeroConstellation` | Medium - cleaner hero | Low |
| Navbar backdrop blur | Medium - premium feel | Low |
| Remove emoji flags from body text | Low - professional copy | Low |
| Replace native select in Auth | Low - component consistency | Low |
| Magic font sizes cleanup | Low - code quality | Low |

All changes are CSS/className-level. No logic, no backend, no data changes.

