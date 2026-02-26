

# Plan: Auth-Gate Referral Wizard + Hide Platform Fee Publicly

## Changes

### 1. `src/components/ReferralWizard.tsx` — Auth-gate at Step 0

When an unauthenticated user clicks "Continue" on Step 0, instead of proceeding to Step 1, show an inline auth prompt replacing the navigation buttons. The wizard stays on Step 0 but the Continue button triggers a sign-in/sign-up prompt.

Specific changes:
- **Header**: Show the full payout amount (`$500`) instead of the net amount (`$450`). Remove "You Earn" vs "Payout" split from the grid in Step 0 — show a single "Referral Payout" value
- **Continue button logic**: When `!user` and `step === 0`, clicking Continue shows auth prompt instead of advancing. Add a `showAuthPrompt` state that flips to true on click
- **Auth prompt**: Replaces step content with a clean card: "Sign in or create a free account to refer someone" with Sign Up (primary) and Sign In (outline) buttons, both linking to `/auth?redirect=/offer/{slug}/{id}` with appropriate mode params
- **Steps 1-3**: Only reachable when authenticated — no changes needed there since the gate is at Step 0
- **Step 3 summary & submission**: Show the full payout amount, not the 90% net. The `payout_amount` stored in the DB can still be the net amount (backend concern, not shown to user)
- Remove `referrerEarns` from all user-facing text in the wizard

### 2. `src/pages/OfferDetail.tsx` — Remove public fee breakdown

- **Remove the entire "Payout Breakdown" section** (lines 244-269) that shows "Referral Fee / You Earn / Platform Fee" split with the "Revvin takes 10%" text
- **Stats grid**: Keep showing the full payout amount (already correct at `offer.payout`)
- **"How Verification Works" section**: Change step 4 text from `your commission (${formatPayout(referrerEarns, offer.currency)})` to just `your payout is approved and paid` — no specific dollar amount with the fee deducted
- Remove the `referrerEarns` and `platformFee` variable calculations (lines 102-107) since they're no longer displayed

### 3. `src/components/OfferCard.tsx` — Verify no fee shown

Quick check — the offer cards in Browse should only show the headline payout, not the net amount. Will verify and fix if needed.

## File Changes

| File | Change |
|------|--------|
| `src/components/ReferralWizard.tsx` | Auth-gate at step 0 with inline prompt; remove all "You Earn" / net payout display; show full payout only |
| `src/pages/OfferDetail.tsx` | Remove "Payout Breakdown" section; remove referrerEarns/platformFee from UI; simplify verification steps text |

