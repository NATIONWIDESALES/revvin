

## Tremendous Payout Integration

### Current State
- Payouts table exists with statuses: `ready` → `processing` → `paid`/`failed`
- Admin manually clicks "Start Processing" → enters method/reference → "Mark Paid"
- No automated payout delivery — everything is manual

### What We'll Build

**1. Store the Tremendous API key**
- Use the secrets tool to prompt you for your Tremendous sandbox API key
- Secret name: `TREMENDOUS_API_KEY`

**2. New edge function: `process-tremendous-payout`**
- Called from admin UI when clicking "Send via Tremendous"
- Accepts `payout_id`, validates admin role
- Looks up payout details (amount, currency) and referrer's payout preference (method + email) from `referrer_payout_preferences`
- Calls Tremendous API (`POST /api/v2/orders`) to create a reward order
- Uses the referrer's email as the recipient
- Supports funding sources from your Tremendous sandbox
- Updates the `payouts` row: status → `processing`, method → `tremendous`, provider_reference → Tremendous order ID
- Logs an audit entry

**3. New edge function: `tremendous-webhook` (optional, phase 2)**
- Receives Tremendous webhook callbacks when reward is delivered/claimed
- Updates payout status to `paid` with delivery timestamp
- For now, we can poll or manually confirm

**4. Update Admin UI (SuperAdminCRM + AdminDashboard)**
- Replace the manual "Start Processing" flow with a "Send via Tremendous" button for `ready` payouts
- Button calls the edge function, shows loading state
- On success, payout moves to `processing` with the Tremendous reference auto-filled
- Keep manual fallback option for non-Tremendous payouts

**5. Referrer payout preferences update**
- The existing `referrer_payout_preferences` table stores `method` (interac, eft_ca, ach)
- Add the referrer's payout email to preferences if not already set (the `email` column already exists)
- Tremendous will deliver via the method matching the referrer's preference

### Tremendous API Details
- **Sandbox base URL**: `https://testflight.tremendous.com/api/v2`
- **Production base URL**: `https://www.tremendous.com/api/v2`
- **Auth**: `Bearer {API_KEY}`
- **Create order**: `POST /orders` with products, recipient email, amount, currency

### Implementation Order
1. Add `TREMENDOUS_API_KEY` secret
2. Create `process-tremendous-payout` edge function
3. Update admin UI with "Send via Tremendous" button
4. Test end-to-end with sandbox

