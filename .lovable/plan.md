

# Plan: Business Approval Gate + Phone Number Requirement

## Overview

Add a mandatory admin approval step for business accounts before they can create offers, and require a phone number during business signup.

## Database Changes

### 1. Add `phone` column to `businesses` table
- `phone text` — stores the business contact phone number

### 2. Add `account_status` column to `businesses` table
- `account_status text NOT NULL DEFAULT 'pending_approval'`
- Valid values: `'pending_approval'`, `'approved'`, `'rejected'`
- Existing businesses get `'approved'` so they remain unaffected

## Frontend Changes

### 3. Auth.tsx — Require phone for business signup (Step 2)
- Add a `businessPhone` state variable
- Add a required phone input field on the business signup step (step 2), between Business Name and Industry
- Pass `phone` in the signup metadata so the `handle_new_user` trigger can persist it

### 4. Update `handle_new_user` trigger
- Extract `phone` from metadata and store it on the `businesses` row during auto-creation

### 5. BusinessDashboard.tsx — Gate offer creation behind approval
- Fetch `business.account_status` (already loaded via `businesses` select)
- If `account_status !== 'approved'`, show a prominent banner: "Your account is pending approval. You'll be able to create offers once approved."
- Hide/disable the "Create Offer" button and links
- Show the pending status clearly in the header area

### 6. CreateOffer.tsx — Block unapproved businesses
- Fetch the business record on load and check `account_status`
- If not approved, redirect back to dashboard with a toast message

### 7. AdminDashboard.tsx — Add approval controls
- In the Verification tab, show `account_status` badge alongside the existing verified badge
- Add "Approve Account" and "Reject Account" buttons for businesses with `pending_approval` status
- Approved businesses get `account_status = 'approved'`
- Show a count of pending approvals in the tab badge

### 8. SuperAdminCRM.tsx — Show account status
- Display the `account_status` badge on each business card for visibility

## Files Changed

| File | Action |
|------|--------|
| Migration SQL | Add `phone` and `account_status` columns to `businesses` |
| Migration SQL | Update `handle_new_user` trigger to extract phone |
| `src/pages/Auth.tsx` | Add required phone field for business signup step 2 |
| `src/pages/dashboard/BusinessDashboard.tsx` | Gate offer creation behind `account_status === 'approved'` |
| `src/pages/dashboard/CreateOffer.tsx` | Block unapproved businesses from accessing the page |
| `src/pages/dashboard/AdminDashboard.tsx` | Add account approval/rejection controls in Verification tab |
| `src/pages/SuperAdminCRM.tsx` | Display `account_status` on business cards |

## User Flow

```text
Business signs up (with phone) → account_status = 'pending_approval'
    ↓
Business Dashboard shows "Pending Approval" banner, no Create Offer
    ↓
Admin sees pending business in Verification tab → clicks "Approve Account"
    ↓
account_status = 'approved' → Business can now create offers
```

