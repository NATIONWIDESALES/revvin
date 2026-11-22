# Super admin audit (read-only findings + proposed minimal fixes)

Nothing has been changed. Approving this plan would apply only the fixes listed under "Proposed fixes".

## Works
- Route and gate: `/__sa` is wrapped in AdminMfaGate (src/App.tsx:119). The only admin is info@revvin.co (checked in user_roles). AdminMfaGate (src/components/admin/AdminMfaGate.tsx:17-24, 51-56) requires a verified authenticator code at AAL2 before it shows children, and offers setup when no authenticator exists yet.
- Server check matches the client: sa-data and partner-admin both call isPlatformAdmin (supabase/functions/_shared/admin-auth.ts:1-9). It runs has_role as the caller, so the server applies the same "verified authenticator means AAL2 required" rule as the gate. fn_admin_core_numbers and fn_admin_update_business use the same has_role.
- Deployed: sa-data and partner-admin both answer (an empty 404 when the caller is not an admin, which is intended). A missing function returns NOT_FOUND JSON instead.
- Schema: plan, pro_trial_ends_at, show_on_earn, acquisition, subscription_status, is_demo, partner_id, account_status, index_approved, latitude and street_address all exist on businesses. All partners columns used by partner-admin exist.
- Verification tab actions go through fn_admin_update_business (SuperAdminCRM.tsx:402-415). Emails, Push, Audit, Failures and Security tabs read existing tables.
- Partners > Approve (partner-admin/index.ts:140-184): checks the code, rejects duplicate codes, sets status=approved, code, dashboard_token and approved_at, then sends partner_approved. That template exists in the registry, and the same sender has delivered the partner application emails (sent 2026-11-18 and 2026-11-20). Sonny Miller is pending with no code, so the button will work. The approval email itself has never been sent before, so it is untested in production.
- Logs: no sa-data or partner-admin errors or invocations in the retained log window. Only boot and shutdown lines exist for other functions, so the 7-day check is limited.

## Broken
1. sa-data reads a `payouts` table that no longer exists (sa-data/index.ts:245-248, 271). The query fails quietly and returns an empty list, so per-business "payouts ready" is always 0 (SuperAdminCRM.tsx:365). Fix: remove both `payouts` queries and return `payouts: []`.
2. The Admin Notes "Save Notes" button (SuperAdminCRM.tsx:374-400) never checks the response, and nothing in the page opens the referral drawer (`setSelectedReferral` is never called with a referral). The notes feature cannot be reached. Fix: remove the drawer, or wire a row click and check `response.ok`.
3. The offer Reject button (SuperAdminCRM.tsx:759) ignores errors, so it shows "Offer rejected" even when the save fails. Fix: check `error` the same way approveOffer does.
4. Sales role: the page lets the `sales` role in (SuperAdminCRM.tsx:233), but sales-only users are shown ProspectsPanel only. That part is consistent and not broken, noted here only for completeness.

## Misleading
5. "Businesses" (16 rows, 15 non-demo) counts internal test accounts as customers: Karm Sandhu Real Estate, Karm Personal Test, QA Test Plumbing and Revvin Internal Test Roofing. fn_admin_core_numbers only excludes is_demo. Fix (no migration): flag these four as is_demo through the existing admin path. Alternatively, a later approved migration could exclude acquisition utm_source = internal.
6. Payments tab "Subscribing businesses" (SuperAdminCRM.tsx:814) counts `trialing`. The header card (fn_admin_core_numbers) counts only `active`. Today both show 1 (Next property, Pro, active), but they will drift apart. App-level Pro trials (pro_trial_ends_at, 11 businesses) are correctly not counted as paying. Fix: count only `active` (or use n.active_subscriptions).
7. Partners list "payingCustomers" (partner-admin/index.ts:102) counts `trialing` and `past_due` as paying. Fix: use `active` only.
8. There is no revenue figure anywhere in the CRM, so $0 invoices cannot inflate a number. Note that "Next property" (the only active Pro) may be an internal account. Please confirm.
9. Approve says "Partner approved and emailed" (PartnersPanel.tsx:225) even when sendPartnerEmail fails or the address is suppressed, because the result is ignored at partner-admin/index.ts:165. Fix: return `emailSent` and show a warning toast when it is false.
10. The Overview "Businesses" list and the Verification queue read every business, including demo ones (SuperAdminCRM.tsx:263). Fix: filter `is_demo` in the list, or label demo rows.
11. signup_trade is not shown anywhere in the CRM (it lives only in auth metadata and businesses.category). This is not broken, just missing if you want to see the trade gate there.

## Proposed fixes (if approved)
- sa-data: remove the payouts queries (item 1). This needs a function redeploy.
- SuperAdminCRM.tsx: error handling on offer Reject (3), a single subscription definition (6), demo filter or label (10), and remove the unreachable notes drawer (2).
- partner-admin: count only active as paying (7) and return emailSent (9). PartnersPanel shows the warning. Needs a redeploy.
- Data: mark the four internal test businesses is_demo (5). This is a data update, so it needs your explicit OK.
- No Stripe, RLS or migration changes, and no publishing.
