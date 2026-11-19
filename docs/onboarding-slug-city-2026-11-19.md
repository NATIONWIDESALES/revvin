# Onboarding slug and city review, November 19, 2026

## Confirmed causes

- The live `handle_new_user` trigger does not assign a slug. It reads `business_name` before its owner-name fallback. Its source definition dates to May 23, not a post-November-16 change.
- BOAT PRO's original authenticated signup metadata contains `business_name: "Scott Anderson"` and `full_name: "Scott Anderson"`. Its current business name is `BOAT PRO-Yacht deliveries`. Thus `scott-anderson` matches the original business-name input, rather than evidence of a trigger selecting full_name despite a correct business_name. Exact timing of the subsequent name edit is not recorded in the available business row.
- Onboarding reuses any existing slug rather than recomputing from a draft's final name. The relevant code already existed before November 16. Recent changes added sale navigation and failure reporting, not this slug behavior.
- `suggestSlug` rejects the reserved Revvin brand anywhere in the name. All its appended suffixes still contained Revvin, so `Revvin Internal Test Roofing` reached the random `partner-xxxxxx` fallback. This is a slug helper fallback, not partner attribution. The helper's latest prior change dates to October 29.
- The entered cities already exist in `businesses.service_area`: `Dallas, TX` and `Annapolis`. Onboarding previously wrote `businesses.city` only after a matching Places selection. Its asynchronous geocode fallback reads city/address fields, not service_area, and only writes coordinates, so it cannot repair this missing city.

## Changes

- Draft onboarding resolves the final business name through the existing server slug availability check and numeric suffixes. Published slugs remain unchanged, including both reported rows.
- Reserved-name suggestions retain safe business-name words before using the existing fallback. The internal test becomes `internal-test-roofing`, or `internal-test-roofing-2` on collision. Reserved/profanity checks remain intact.
- Typed city saves independently of Places: `Dallas, TX` saves city `Dallas`, state `TX`, service_area `Dallas, TX`; `Annapolis` saves city `Annapolis`. A selected Places result still supplies structured geography. Edited free-text locations clear stale coordinates before the existing geocode fallback.
- No migration is needed. No database rows, policies, payment code or visible copy changed. Not published.

## Existing links

No business slug-history/alias table or referral slug redirect mechanism was found. `/r/:slug` looks up the current slug exactly. Renaming BOAT PRO would stop `/r/scott-anderson` resolving to that business; it would not redirect automatically. Its existing slug was left untouched.

## Verification

- Targeted onboarding and slug regressions: 21 passed.
- Full suite: 1250 passed, 3 skipped.
- Application typecheck: clean. Preview compilation: build OK.
- Playwright simulated authenticated signup, edited the draft name to BOAT PRO, typed Dallas, TX, published, and verified the saved slug/city/state. A reload read the city back and another save preserved the published slug.
- Live signed-in write/read-back could not be checked: test-user approval is unavailable and the requester has no matching app auth account. No other real user's session was selected.