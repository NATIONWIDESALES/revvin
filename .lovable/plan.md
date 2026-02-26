

# Fix: `offers_status_check` constraint violation

## Problem
The `offers` table has a CHECK constraint: `status IN ('active', 'paused', 'closed')`. The deposit-to-publish flow tries to insert offers with `status: 'draft'`, which violates this constraint.

## Solution
Two changes needed:

### 1. Database Migration
Alter the CHECK constraint to include `'draft'` as a valid status:

```sql
ALTER TABLE public.offers DROP CONSTRAINT offers_status_check;
ALTER TABLE public.offers ADD CONSTRAINT offers_status_check
  CHECK (status IN ('active', 'paused', 'closed', 'draft'));
```

### 2. No frontend changes needed
`CreateOffer.tsx` already correctly sets `status: 'draft'` -- the constraint just needs to allow it.

## Files Changed
| File | Action |
|------|--------|
| New migration SQL | Add `'draft'` to the status check constraint |

