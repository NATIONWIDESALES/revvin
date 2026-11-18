# Partner FAQ copy update

Date: 2026-11-18 (UTC). Scope: partner FAQ copy only. No Stripe, no RLS, no
migrations, no other copy. Frontend not published.

## Changes

### src/config/partners.ts (PARTNER_FAQS)
1. "Is there a cost to join?" answer is now exactly: "No. It's free."
2. "How do I get paid?" answer is now exactly: "PayPal or bank transfer, in US
   dollars. Before your first payout, US partners fill in a one-page W-9 tax
   form and partners outside the US fill in a W-8BEN. It's standard for any
   affiliate program."
3. New eighth FAQ appended: "Do I have to post a certain amount?" / "No.
   There's no quota. Partners who earn the most mention Revvin regularly and
   show it in action, like a quick walkthrough of a referral page."

### src/content/seoRoutes.ts (mirror)
The /partners prerender route carried its own hand-written five-question FAQ
list with slightly different wording, so the static document and the live page
could drift. It now reads `faqs: [...PARTNER_FAQS]`, so the prerendered
document body and its FAQPage JSON-LD contain the same eight questions and
answers as the page component. `PARTNER_FAQS` added to the existing import from
`../config/partners`.

## Layout check

No markup changed. At 1280px the FAQ grid renders 8 items in 2 columns, 4 per
column (browser check: count 8, columns 2, perColumn [4, 4]). The FAQPage
JSON-LD on /partners is generated from PARTNER_FAQS, so it includes all eight.

## Terms check (reported, not changed)

`src/content/partnerTerms.ts` section 6 "Taxes" says: "We need a completed tax
form (W-9 for US persons, or the applicable form otherwise) before your first
payout." It does not name W-8BEN. This does not contradict the new FAQ wording,
it is only less specific, so the terms were left untouched as instructed.

## Tests

- src/test/partners.test.ts: new "partner FAQ copy" block asserting eight
  questions with the posting question last, the two exact replacement answers,
  and that the prerender route's faqs equal PARTNER_FAQS.
- src/test/prerendered-html.test.ts: new "partner FAQ static HTML" block
  asserting the served /partners document contains every question and answer
  and that its FAQPage mainEntity equals all eight.
- Full suite: 1128 passed, 3 skipped (89 files passed, 1 skipped).
- Typecheck: clean.

## Not done

- No frontend publish, so the live site still shows the old answers until the
  next publish.
- /partners/terms left as written (see terms check above).
