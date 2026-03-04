

## Plan: Seed 6 Demo Offers

### Approach

Use the database insert tool to add 6 business records and 6 corresponding offer records directly. No schema changes needed — all required fields exist.

### Key decisions

- **`user_id` on businesses**: These need a UUID. I'll use deterministic fake UUIDs (not tied to real auth accounts). The Browse page only reads `businesses.name`, `logo_url`, `city`, `state`, `verified`, `latitude`, `longitude` via the join — it never checks if the user exists in `auth.users`. So fake UUIDs are safe.
- **`deposit_status`**: Set to `"waived"` to bypass Stripe requirement.
- **`status`**: Set to `"active"` and `approval_status` to `"approved"` so they appear in the marketplace.
- **`created_at`**: Stagger over past 2-3 weeks.
- **`logo_url`**: Leave null — the hook already falls back to `"🏢"` emoji.
- **Business `description`**: Store the "drop description" here.
- **`location` on offers**: Store the service area string.
- **Country**: The `useDbOffers` hook hardcodes `country: "US"` — offers will display but the country field won't be "CA". This is a display-only issue in the existing code; no schema change needed since you said no UI modifications.

### Data inserts (via insert tool)

**Insert 1**: 6 rows into `businesses` table with fields: `id`, `user_id` (fake UUID), `name`, `city`, `state`, `industry`, `description` (drop description), `verified` (true), `account_status` ("approved"), `created_at` (staggered).

**Insert 2**: 6 rows into `offers` table with fields: `id`, `business_id` (matching above), `title`, `description`, `category`, `payout`, `payout_type` ("flat"), `status` ("active"), `deposit_status` ("waived"), `approval_status` ("approved"), `qualification_criteria`, `location` (service area), `created_at` (staggered), `featured` (false).

### What stays untouched
- No UI, routing, or component changes
- No existing data modified
- No Stripe sessions created
- No referrals, payouts, or pipeline data

