

## Simplify Payout Queue Buttons in SuperAdminCRM

### Change
In `src/pages/SuperAdminCRM.tsx`, replace the "processing" status UI block (lines ~658-672) that shows Method/Reference ID inputs with just two buttons:

- **Approve** → calls `updatePayoutStatus(payout.id, "paid")`
- **Reject** → calls `updatePayoutStatus(payout.id, "failed")`

Also remove unused `payoutMethod` and `payoutRef` state variables and their imports.

