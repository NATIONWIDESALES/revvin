

# Plan: Public Referral Link Flow (No Login Required to View + Submit)

## Summary

Make the shared offer links fully functional for unauthenticated visitors. Visitors can browse the offer AND complete the referral submission form. At the point of submission, they're prompted to create an account (or sign in) so the referral is properly attributed. This keeps the link useful as a growth tool while maintaining data integrity.

## Technical Details

### Current State
- Route `/offer/:id` is public (no ProtectedRoute) -- offer detail page loads fine
- RLS on `offers` allows public SELECT for active+approved offers -- data loads fine
- `ReferralWizard` blocks submission at line 80 with a toast "Sign in required" if `!user`
- No inline sign-up prompt -- just a dead-end error

### Changes

**1. `src/components/ReferralWizard.tsx`**

Instead of blocking at submit time with a toast, restructure the flow:

- Allow unauthenticated users to fill out Steps 0-3 (Offer confirmation, Customer info, Notes, Consent) normally
- At Step 3 (Consent), if `!user`, show an inline auth prompt instead of the Submit button:
  - "To submit this referral, create a free account or sign in."
  - Two buttons: "Create Account" and "Sign In" -- both link to `/auth?redirect=/offer/{offerId}` so they return after auth
- Store form data in `sessionStorage` before redirecting, so it persists across the auth flow
- On return (user now authenticated), auto-populate the form from `sessionStorage` and let them submit

**2. `src/pages/Auth.tsx`**

- Read `redirect` query parameter
- After successful sign-in/sign-up + verification, redirect to the stored URL instead of `/dashboard`
- This enables the "complete your referral" return flow

**3. `src/pages/OfferDetail.tsx`**

- No changes needed -- the page is already public and loads offer data correctly

**4. `src/pages/dashboard/BusinessDashboard.tsx`**

- No changes to `inviteReferrers` -- the clipboard copy of `/offer/{id}` is correct
- Optionally: improve the button UX to show a share sheet or social links (enhancement, not required)

### User Experience Flow

```text
Business copies link → shares via email/text/social
         ↓
Visitor opens /offer/abc123 (no login needed)
         ↓
Sees full offer details + referral wizard
         ↓
Fills out customer info, notes, consent
         ↓
At submit: "Create a free account to submit"
         ↓
Redirects to /auth?redirect=/offer/abc123
         ↓
Signs up → verifies email → redirected back
         ↓
Form auto-fills from sessionStorage → submits
```

### What stays the same
- Referrals still require an authenticated `referrer_id` (data integrity maintained)
- RLS policies unchanged -- submission still requires `auth.uid() = referrer_id`
- No anonymous referral records in the database

### File Changes

| Action | File | Change |
|--------|------|--------|
| Edit | `src/components/ReferralWizard.tsx` | Add inline auth prompt at consent step for unauthenticated users; save/restore form data via sessionStorage |
| Edit | `src/pages/Auth.tsx` | Read `redirect` query param; redirect there after auth instead of `/dashboard` |

