# Prebuilt pages for outbound sales (2026-11-01)

Callers phone home-service owners and say "we already built your referral
page, here's the link." The owner opens a private preview of their own page,
sign and first ask text, and claims it free in one tap.

## What was built

### Data (migrations 0016-0018)
- New `sales` role added to the app role enum. Sales users see only the
  Prospects tools in the CRM, nothing else admin.
- New `prospect_pages` table: unguessable 16-character url-safe code, name,
  trade, city/region/country (US/CA only), phone, website, google_place_id,
  suggested_reward, headline_override, created_by, status
  (draft/sent/viewed/claimed/removed/expired), view timestamps and count,
  claimed_business_id, removed_at, expires_at (created + 30 days), notes.
- RLS enabled; only admins and sales users can read or write. No anon access
  except through narrow functions. Delete is admin-only.
- `fn_prospect_view(code)`: rate-limited (30/hour per requester, 2000/hour
  global), counts the view, marks the prospect viewed, returns only the safe
  preview fields (never phone, website, notes or place id). First view queues
  one alert email to info@revvin.co and the caller, throttled to one per
  prospect per day. The outbound email kill switch applies because alerts go
  through the standard queue.
- `fn_prospect_peek(code)`: same safe fields for obvious bots, without
  counting a view or firing alerts.
- `fn_prospect_remove(code)`: anon-callable, rate-limited, one-tap removal.
- `fn_prospect_claim(code, business_id)`: authenticated; marks the prospect
  claimed only when the caller owns the business and the business's
  acquisition snapshot carries the same prospect code, inside the validity
  window. Queues "Claimed: {name}" emails to the team and the caller.
- `fn_prospect_expire()`: daily pg_cron job (03:20 UTC) marks expired pages
  and nulls phone/website/notes on expired or removed rows after 30 more
  days. Counts are written to the audit log.

### Google import (edge function prospect-lookup)
- Sales/admin only, 60 lookups per user per hour via the shared rate buckets.
- Accepts a Google Maps link or "business name + city"; uses the same
  server-side Google Maps connector key as geocode-business
  (GOOGLE_MAPS_API_KEY through the connector gateway, Places API New). No new
  secret was needed.
- Returns displayName, city/region/country from address components,
  nationalPhoneNumber, websiteUri, primaryType and place id. Reviews, ratings
  and photos are never fetched or stored (Google Places terms).
- primaryType is mapped to the trade list; restricted categories (real
  estate, mortgage, insurance, finance, legal) are refused.

### CRM Prospects tab
- Admin and sales roles. Sales users get a standalone Prospects screen and
  none of the admin data loads for them.
- Add by Google lookup or manually; bulk add up to 25 Google Maps links.
- Table shows status, views, last viewed and claimed state. Buttons: Copy
  link, Copy text script, Copy email script, Mark sent, Remove.
- Text and email scripts live in src/content/prospectScripts.ts with
  {first name}, {caller}, {business} and {link} placeholders; callers can
  edit their own copies (saved on their device) in the Scripts panel.

### Public preview page /preview/{code}
- noindex, nofollow; excluded from the sitemap, llms.txt and RSS (it is not a
  prerendered route); robots.txt disallows /preview/ in every group.
- Unknown, removed or expired codes show a neutral "This preview isn't
  available" page with no business name.
- Always-visible banner: "Preview built by Revvin for {name}. Not active and
  not affiliated with {name} until they claim it."
- Sections: referral page mock with a disabled form, yard sign with the
  business name, reward and a QR pointing back to the preview, the first ask
  text, "What happens when you claim it" (3 steps: free for the first 100
  customers, Pro free for 14 days, no card), and a short FAQ.
- Reward and headline are editable inline (local only).
- "Claim it free" carries name, trade, reward, city, region, country and the
  prospect code through the same sessionStorage + query mechanism as the
  homepage instant preview, with utm_source=outbound and utm_medium=prebuilt.
  After signup, onboarding is prefilled and fn_prospect_claim links the
  business server-side.
- "Not my business / remove this page" confirms once, sets status removed
  immediately and shows "Removed. Sorry for the bother."
- The preview accepts no referrals, has no contact form, and shows no
  reviews, ratings or testimonials.

### Session recording slot
- CLARITY_PROJECT_ID in src/config/brand.ts, empty by default (off). When
  set, ClarityLoader loads Microsoft Clarity only on marketing pages, /start,
  /preview and signup/onboarding (never the dashboard, /r/ referral forms or
  /me), after first interaction or 3 seconds idle, with input masking on.
  The privacy page shows a session-recording line only while it is enabled.

### Earn network hidden until launch
- The homepage "Locals who earn" column, the main nav "Earn money" link and
  the footer link are hidden until at least one metro is live
  (metros.is_live, checked through fn_earn_metros). /earn routes keep working
  and stay indexable exactly as they are.

## Security posture
- No Stripe changes, no RLS loosening; every guard from the two security
  rounds is untouched (rate limits, kill switches, restricted categories,
  index_approved, one business per user, trial-once).
- The preview never implies the business endorses Revvin: banner, disabled
  form, and no social proof of any kind.

## Tests
- src/test/prospect-pages.test.ts: 33 tests covering the migration SQL
  (grants, policies, rate limits, safe fields, cron), the migration running
  in isolated PostgreSQL (view counting, peek, claim binding, removal,
  expiry and scrub), robots/sitemap/llms exclusion, script templates, the
  signup handoff, Clarity gating, Earn hiding and the preview page guards.

## What the owner must set up
- Nothing required. The Google import reuses the existing Google Maps
  connector key. To enable session recording later, set CLARITY_PROJECT_ID
  in src/config/brand.ts. To add a caller, give their account the sales role.
