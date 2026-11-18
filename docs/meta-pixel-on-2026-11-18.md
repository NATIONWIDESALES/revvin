# Meta pixel turned on (2026-11-18)

- src/config/brand.ts: META_PIXEL_ID = "1491133636221099".
- src/lib/metaPermission.ts: removed /earn (referrer page) from pixel-safe paths; added conversionSafePath/pixelAllowedHere so /signup, /welcome, /dashboard, /auth allow only bare, utm_* or offer queries.
- src/components/MetaPixel.tsx: frame is removed on SPA navigation to any non-allowed route.
- public/ad-events.html: autoConfig disabled before init (no automatic form scanning or advanced matching).
- src/content/legal.ts: Meta no longer described as paused; advertising measurement paragraph added; last updated November 18, 2026.
- src/test/meta-pixel.test.tsx (new), src/test/acquisition-rules.test.ts (ID expectation).
- 17:51 UTC: META_PIXEL_ID switched to "1941132123224407" (dataset "REVVIN.CO PIXEL", owned by the revvin.co Meta business portfolio and connected to the new ad account). The earlier ID "1491133636221099" belonged to a personal ad account, so it is retired rather than reused. Gating, events, autoConfig and Privacy Policy wording are unchanged.

## Ad click query permissions, November 18

### Changelog
- src/lib/metaPermission.ts: marketing and conversion query allowlists now also accept exactly fbclid, gclid, msclkid, ttclid, li_fat_id and utm_id. Existing utm_source, utm_medium, utm_campaign, utm_content and utm_term remain allowed; offer remains conversion-only. Other keys, hashes and excluded paths still block measurement. No query forwarding, event, regional permission, opt-out, iframe, automatic matching or copy changes.
- src/test/meta-pixel.test.tsx: added mounted pixel checks for /?utm_source=meta&fbclid=abc and /signup?fbclid=abc, blocked checks for /?name=x and /r/x?fbclid=abc, and individual additional-key/unknown-key regressions across eligible routes. The iframe still opens without a query.
- docs/meta-pixel-on-2026-11-18.md: recorded the handoff assessment, browser evidence and proposed attribution follow-up below.

### Existing signup handoff, unchanged
- Ordinary navigation and homepage signup links use /signup without forwarding landing query parameters.
- Instant preview captures the five existing UTM keys into sessionStorage and its /signup URL fallback, alongside name, trade, reward and landing_path. Those personal preview keys deliberately block the pixel on that signup URL, even when fbclid is also present. This change does not loosen that protection.
- Signup reads the preview state and includes its five UTM keys in acquisition metadata. Its confirmation-email /welcome URL can include the preview parameters; immediate navigation to /welcome carries only the recognized sale offer, with preview data retained in sessionStorage and read by onboarding.
- Direct /signup?fbclid=abc and /welcome?fbclid=abc are now pixel-eligible. The form's known-key parsing ignores fbclid; it is not forwarded or stored by these handoff helpers. utm_id and the other new click keys likewise receive no new forwarding.

### Attribution limitation and proposal, not implemented
- loadPixel still uses exactly /ad-events.html with no-referrer. Browser checks confirmed its location.search is empty even when the parent URL has fbclid. Messages carry only the pixel ID and fixed event names. The official SDK therefore cannot create _fbc from that landing-page fbclid through its own iframe URL. An existing same-origin _fbc cookie might be accessible, but that does not establish attribution for this click. Cookie creation, provider receipt and attributed conversions were not verified.
- Smallest safe follow-up: after the existing advertising permission checks, take only one nonempty, bounded, format-validated fbclid from the eligible parent URL and construct /ad-events.html?fbclid=<URLSearchParams-encoded value>. Reject malformed/duplicate values, retain no-referrer, and never forward the rest of the URL, UTM values, form data, email or names. Keep autoConfig disabled and event messages unchanged. This would let the official SDK process that click ID in its own document; actual _fbc creation and Meta receipt/attribution would still require verification. It would not by itself preserve click IDs across later full-page visits where the parent no longer has fbclid. Proposed only, not built.

### Verification
- Full suite: 1161 passed, 3 skipped. Typecheck clean. Preview build OK.
- Browser checks with a controlled US region response and stubbed provider script: frame loaded on both requested allowed URLs and stayed absent on both requested blocked URLs; iframe query empty in both allowed cases. Signup business-name input remained usable with fbclid. No account created and no test event transmitted to Meta. Authenticated /welcome completion was not exercised; its permission and handoff behavior were checked in source and tests.
- No Stripe, RLS, migrations or publishing.

## Session click and private preview handoff, November 18

### Changelog
- src/lib/metaClick.ts (new): after advertising permission and eligible URL checks, accepts exactly one nonempty fbclid of at most 500 characters using only A-Z, a-z, 0-9, underscore, hyphen and dot. Duplicate or malformed values are rejected and clear previous click state rather than falling back to it. Stores the value only under revvin_fbclid with a separate revvin_fbclid_first_seen timestamp; subsequent eligible pages without a click use validated session state. Repeated occurrences of the same valid click retain its first-seen timestamp. No cookies, other URL keys or personal data are stored by this helper.
- src/lib/metaPixelLoader.ts: constructs only /ad-events.html?fbclid=<encoded validated value>, or the bare document when no valid click exists. Keeps no-referrer and messages unchanged. public/ad-events.html is unchanged, including official fbevents.js, disabled autoConfig and empty matching data.
- src/lib/instantPreview.ts: storePreview now reports verified storage read-back. cleanPreviewAddress reads existing validated preview data, stores and verifies it, then uses history.replaceState to remove name, trade, reward, landing_path and the existing personal prospect handoff keys on /signup and /welcome only. Keeps offer, existing UTMs and allowed click IDs; unknown keys and hashes remain untouched and still block the pixel. Invalid/duplicate preview data or failed storage leaves the personal URL intact and measurement blocked.
- src/components/MetaPixel.tsx: performs preview cleanup before eligibility evaluation; permission precedes click capture and forwarding. Route changes restart the delayed loader with current privacy checks, and opt-out removes the iframe and saved click. Region, browser opt-out, advertising choice, event names and excluded-route rules remain unchanged.
- src/test/meta-pixel.test.tsx: covers landing-to-signup session persistence, iframe-only click query, first-seen timestamp, 500-character limit, malformed/duplicate IDs, corrupt storage, preview cleanup on both owner entry pages, preserved form state, failed storage, unknown personal keys, excluded routes, opt-out and CompleteRegistration mapping.
- AGENTS.md: recorded the attribution/privacy handoff rule. roadmap.md: recorded completion and verification limits. docs/meta-pixel-on-2026-11-18.md: this append-only changelog.

### Verification and remaining limits
- Full suite: 1182 passed, 3 skipped. An initial run hit the existing 5-second isolated PostgreSQL test timeout; rerunning the full suite with a 15-second per-test allowance passed without modifying that test. Typecheck clean; latest preview build OK.
- Browser: controlled US region and stubbed official provider transport. A landing click persisted across a full-page move to preview signup; the address lost personal preview keys, the business name stayed populated, and the iframe received only fbclid. A synthetic signup_completed event mapped to CompleteRegistration inside the iframe. Malformed IDs were omitted; referral routes remained blocked; failed storage retained the personal URL and blocked the iframe. No page errors in the handoff run. No real signup or Meta test event was sent.
- The iframe now sees fbclid in its own URL. This supersedes the proposal-only limitation above. Actual SDK _fbc creation, real successful signup transmission, Meta receipt and counted/attributed conversions remain unverified; the changes are installed and tested in preview, not published.
- Meta ads measurement guidance used: retain advertising permission evidence, check Events Manager dataset restrictions and Business Tools Terms, and preserve the existing advertising opt-out/contact withdrawal route. No matching or server uploads were added.
- No Stripe, RLS, migrations, marketing copy, cookies set by our code, edge function changes or publishing.
