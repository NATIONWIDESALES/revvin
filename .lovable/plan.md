# Earn: metros, local business lists and one-tap personal links

## Facts found that change the build

1. **The /earn waitlist and "Know a business" forms do not save today.** The database only accepts leads from `landing`, `playbook`, `sample` and `marketplace_notify`, so `earn_waitlist` and `business_invite` are refused. The table also has no city column, so a "people waiting in this city" count is impossible today. Fix: a narrow server function `fn_submit_earn_lead` that accepts only those two sources, stores the city/metro, and is rate-limited. The existing open insert rule stays exactly as it is.
2. **Partner links and personal links clash.** The partner capture listens for `?via=` and `?ref=` on every page, so a personal link `/r/{slug}?ref={token}` is currently being stored as a partner code. Fix: on `/r/*` pages, `?ref=` is treated as a referrer token only; `?via=` keeps working everywhere.
3. **Inviting a business does not attribute it automatically.** In the existing partner program a partner is approved by hand, and a business is credited only when it signs up through that partner's `?via=` link within the existing attribution window. So "earn_invite" will create a pending partner application, and once approved, the referrer gets their partner link to send the business. The copy line you supplied stays honest because it says "can earn" and links the terms. No new commission logic.
4. **"Super admin" means the existing `admin` role** in user roles. There is no separate super admin role; the CRM and the `is_verified` guard already use `admin`.
5. **Live metro pages are written at build time.** Flipping a metro live shows it in the app immediately, but its search-engine copy and sitemap entry appear on the next publish.

## What gets built

**Database (one migration)**
- `metros` table (id, name, slug, center_lat, center_lng, radius_km, is_live default false, launched_at). Seed "Fraser Valley, BC" / `fraser-valley` / 49.104, -122.66 / 45 km / not live. Public can read only live metros, through the views and functions below; admins can read and toggle all. A guard stamps `launched_at` and rejects `is_live` changes from anyone who is not an admin.
- `businesses.show_on_earn` boolean default true (owner-editable, like other page fields).
- `email_leads`: nullable `city` and `metro_slug` columns.
- One shared eligibility rule, `fn_earn_eligible(business)`: published and live page, not demo, not a restricted trade (Finance, Insurance, Legal, Mortgage, Real Estate, kept in sync with `RESTRICTED_CATEGORIES` by a test), `show_on_earn` true, has a reward, and inside the metro radius by coordinates, or a city-name match when coordinates are missing.
- Functions:
  - `fn_earn_metros()`: live metros only (name, slug).
  - `fn_earn_businesses(p_metro_slug)`: for a live metro only, returns slug, name, trade, city, reward. Never email, phone, owner or id.
  - `fn_earn_get_link(p_business_slug, p_name, p_email)`: checks the business is eligible in a live metro, then creates or reuses the `referrers` row by email (existing `fn_upsert_referrer`) and returns only the token. When signed in, it uses the account's confirmed email. Rate-limited.
  - `fn_earn_waiting_count(p_metro_slug)`: count of waitlist signups for that metro, returned only when it is 1 or more.
  - `fn_submit_earn_lead(email, source, city, metro_slug)`: described above.
  - `fn_admin_metros()`: admin only; each metro with its eligible-business count.
  - `fn_business_metro(p_slug)`: the live metro slug for a business page, or nothing.

**Pages**
- `/earn`: hero and rules unchanged. "Live cities" list from `fn_earn_metros`; when none are live, the current Fraser Valley waitlist copy stays word for word. The waitlist now actually saves, with city.
- `/earn/{metro}`:
  - **Live:** business list with trade filter chips and "Get my link". That button asks for name and email, or skips the question when signed in at /me, then shows the personal link, Copy, Share and the same share text as the referral page. "Get links for more businesses" returns to the list.
  - **Not live:** noindex, waitlist with the metro prefilled, and "{n} people waiting" only when n is 1 or more.
- "Know a business that should be here?" on both pages, using the existing business invite form, plus the one partner-terms line linking to `/partners/terms`. Business name and contact are saved. If an email is given, or the person is signed in, a pending partner application with source `earn_invite` is created through the existing `partner-apply` function. Its required fields are filled with fixed values ("Earn invite"), marked agreed only when the person ticks a terms box.
- `/r/{slug}`: footer link "Find more local businesses that pay for referrals" when the business is in a live metro and shown on Earn.
- `/me`: "Discover more businesses near you" to the live metro of any business they refer for.
- Dashboard (My Page): "Show my offer on Earn" switch with your helper text; restricted trades see "Not available for your industry" instead.
- Super Admin CRM: Metros panel listing each metro, its eligible count, "Target: 15", and the is_live switch.

**Search engines**
- Build-time pages for `/earn` and every live `/earn/{metro}`, titled "Get paid for referrals in {metro} | Revvin", with description, canonical, and an ItemList of LocalBusiness items each with an Offer for the reward.
- Live metro pages are added to the sitemap at build. Non-live ones are noindex and left out.
- `earn` and `me` are added to reserved page names.

## Technical details

- Files:
  - New: `src/pages/EarnMetro.tsx`, `src/lib/earn.ts`, `src/components/admin/MetrosPanel.tsx`, `src/components/earn/GetMyLink.tsx`, `src/components/earn/InviteBusinessForm.tsx`.
  - Edited: `src/pages/Earn.tsx`, `src/pages/PublicReferralPage.tsx`, `src/pages/Me.tsx`, `src/components/partners/PartnerCapture.tsx`, the My Page settings component, `src/pages/SuperAdminCRM.tsx`, `src/App.tsx`, `plugins/prerender.ts`, `src/lib/emailLeads.ts`, `src/lib/analyticsPrivacy.ts` (/earn/{metro} as a public path with no query values), and `supabase/functions/partner-apply` (accepts an optional fixed `source: "earn_invite"`, stored in `partners.notes` because there is no source column).
- No Stripe, billing, promo, payout or commission changes. No earnings figures on any Earn page.
- Tests (vitest, plus live database checks inside transactions that are undone):
  - Restricted and demo businesses never come back from `fn_earn_businesses` or the admin count.
  - Public functions never return email or phone. Checked against the function definitions and a live call.
  - A non-live metro returns no businesses, its page is noindex, and it is absent from the sitemap and build output.
  - "Get my link" twice with the same email returns the same token.
  - A non-admin changing `is_live` is refused; an admin succeeds.
  - Personal-link `?ref=` on `/r/*` is no longer stored as a partner code.
  - The eligibility trade list matches `RESTRICTED_CATEGORIES`.
- The changelog will list tables, policies, functions, routes, the admin panel, tests and the run result.

## Open question (defaults used unless you say otherwise)

- Businesses with no reward amount set are left off Earn lists, since the list promises a reward.
