# Ownership verification after claiming

Date: 2026-11-26

## What changed

- Added `pending`, `verified`, `rejected`, and `disputed` ownership states, with verification method and timestamp. All 17 businesses present at migration time were backfilled as verified with method `grandfathered`. New businesses remain pending after signup or claiming.
- The old `is_verified` field was an admin-controlled public trust flag used by referral pages. The separate legacy `verified` field was also admin-controlled. Neither meant account approval. Both now mirror `ownership_status = verified`; owners cannot set either directly.
- Pending, rejected, and disputed businesses keep their existing owner tools and referral pages. They show `Claim pending`, rank below verified businesses but above unclaimed listings, and cannot show owner/Verified trust badges, receive quote matches or saved quote delivery, or appear in Earn search and reward pins.
- Rejecting a claimed listing releases it to unclaimed while retaining the business account. A dispute changes only pending or grandfathered claims to disputed; domain-email, document, and admin verifications remain verified until admin review.
- Claiming stays immediate. A confirmed account email matching the listing website's registrable domain verifies instantly. Free-mail, social, and site-builder domains are excluded.
- Added business-domain email codes: six digits, hashed storage, 30-minute expiry, five wrong-attempt limit, and three codes per business per day. Claimed listings always use the original listing domain. The website is locked while a claimed business is pending.
- Added private PDF/JPG/PNG document uploads up to 10 MB, an owner verification card and referral-kit checklist item, admin ownership review, signed admin document links, approval/rejection reasons, and owner/admin emails through the existing queue.
- Added public ownership disputes with required contact/details fields, optional private proof, hashed visitor rate limiting at three per day, admin resolution to keep the owner or release the listing, and admin alerts.
- Added the ownership note beneath unclaimed-profile claim buttons. Existing `/r/:slug` form behavior, signup speed, billing, Stripe, and claim entry points were not changed.
- Deployed `ownership-dispute` and the pending-business guard in `submit-quote-request`.

## Database changes

Migrations 0069 through 0074 add the ownership fields and rules, private verification/dispute storage, domain/code/document flows, admin review, persistent code-attempt counting, service-only dispute writes, and narrowly scoped legacy trust-flag synchronization for internal ownership updates. RLS remains enabled; private requester, claimant, dispute, and document data is not publicly readable.

## Verification

- Six ownership SQL scenarios pass, including pending quote/Earn/saved-delivery exclusion, domain matching and exclusions, persistent wrong-code attempts, expiry, success, three-code daily limit, listing-domain control, website locking, rejection release, and dispute behavior.
- Focused ownership, publishing, and email-contract run: 11 tests passed. Broader related run before the final legacy-trigger fixture update: 46 of 48 passed; both failures were fixture omissions and were corrected. The final focused run passes with the real legacy triggers included.
- Full suite: 1,712 passed, 3 skipped, 3 failed. One failure was the new handler's unpinned CORS import, corrected and covered by a targeted rerun. The other two are unrelated to this work: the existing live-policy fixture lacks five earlier marketplace event names (`listing_interest_clicked`, `listing_interest_email`, `earn_alert_signup`, `quote_broadcast_sent`, `quote_broadcast_saved`), and the known admin SQL public-view test timed out under full-suite load.
- Preview build signal was OK after the ownership changes.

## Browser verification

Using a temporary listing and a confirmed test account with a non-matching email domain:

- Claim request returned 200 and the existing fast publish flow completed.
- Public `/b/` profile and marketplace card showed `Claim pending`; the profile showed no `Claimed by owner` badge.
- Marketplace Profile showed both business-domain email and document options.
- The claimed website field was disabled with the domain-lock explanation.
- The ownership checklist item appeared on the dashboard Home.

Not exercised in the browser: sending and entering a real email code, uploading a real document, signed admin document review, submitting a dispute or proof, admin approval/rejection/dispute actions, and the verified Pro quote form. Their rules are covered by isolated SQL tests, but real email/document delivery and the admin UI flow remain unverified.

## Test cleanup and remnants

The temporary account, business, listing, ownership records, failure record, audit entries, and four email log rows were deleted. Verification queries returned zero test users, businesses, listings, and email logs. No matching test analytics sessions were stored.

Two `Directory listing claimed` admin alerts were sent to info@revvin.co during the successful browser claims and cannot be retracted. One ownership-verified message to the temporary test address failed and moved to the dead-letter log; it was not delivered, and both log rows were removed. No test documents or dispute proofs were created.

No publication was performed.
