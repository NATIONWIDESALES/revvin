# Invite landing sale, November 20, 2026

- `src/lib/salePresentation.ts`: allow `/i/:code` as a banner surface without enabling the popup there.
- `src/pages/InviteLanding.tsx`: mount the existing SalePromotion on this standalone page; use the existing sale signup destination for the main Start free CTA only while the server-clock sale check is live. Original invite-code capture is unchanged. After expiry the original embedded-form button returns.
- `src/test/sale-presentation.test.tsx`: cover invite eligibility, existing banner destination, no popup and expired-sale hiding.
- `src/test/invite-sale.test.tsx`: cover the actual invite page banner, CTA-to-signup offer note, unchanged invite capture and original button after expiry.
- `roadmap.md`: mark this task complete.

Verification: full suite 1276 passed, 3 skipped; application typecheck and existing server checks passed; preview build OK. An initial high-concurrency suite run timed out waiting for the existing organic popup. The complete suite passed twice with four workers, including the final implementation.

Playwright with a stubbed server-clock sale response verified `/i/LAUNCH` to `/signup?offer=bf2026`, the existing signup note, unchanged invite storage, no page errors and no horizontal overflow at 320px, 390px and 1280px. Expired-sale response removed the banner and retained the original embedded-form CTA. Invite promotions remain paused under the existing rules; no attribution or redemption rules were changed.

No payment code, migrations, security policies or new visible copy. Not published.