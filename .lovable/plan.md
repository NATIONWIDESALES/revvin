
# Fix Business Phone Lead Cards

## Problem
The business phone mockup currently shows leads from different business categories (Roofing, HVAC, Auto Detailing), but it should show all leads for a single roofing business receiving multiple roofing leads.

## Changes to `src/components/PhoneMockup.tsx`

### Update all 3 lead cards to be roofing leads:

**Card 1** (keep as-is):
- "Residential Roofing" - Sarah M. — referred by James K. - $500 payout - NEW

**Card 2** (change from HVAC):
- "Roof Repair" - Mike T. — referred by Dana R. - $350 payout - NEW
- Change icon from `Thermometer` → `Home`
- Keep green styling

**Card 3** (change from Auto Detailing):
- "New Roof Quote" - Chris L. — referred by Alex P. - $400 payout - PENDING
- Change icon from `Car` → `Home`
- Keep gray/pending styling

### Remove unused imports
- Remove `Thermometer` and `Car` from lucide-react imports (only `Home` needed for lead cards)

## Files Modified
| File | Change |
|------|--------|
| `src/components/PhoneMockup.tsx` | Update cards 2 & 3 to roofing leads |
