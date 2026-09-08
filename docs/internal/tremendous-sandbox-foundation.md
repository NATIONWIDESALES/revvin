# Tremendous sandbox foundation (inactive, unconnected)

Internal engineering note. Not user-facing copy. Nothing described here is live.

## Status

This is a source-only first slice: reusable server modules plus fixture tests in
`supabase/functions/_shared/tremendous/`. As of this commit:

- No sandbox or production API call has ever been made from this code.
- No developer app, API key, webhook, campaign or funding source has been
  created or registered. Production API access is still in "Request production
  API access" state and no sandbox credentials exist yet.
- There is no `serve()`, no network route, no database client, no scheduled job,
  and no frontend import. Every capability is an injected interface.
- No environment access and no default global `fetch` anywhere in the folder.
- Nothing here touches existing pricing, checkout, manual `rewards`, or the
  referral paths, and none of the deleted wallet migrations were revived.

## What actually works (verified by fixture tests only)

| Module | Responsibility |
| --- | --- |
| `types.ts` | Structured obligation contract: stable ID, source kind/ID, immutable snapshot version, business/connection/program binding, reviewed recipient email, integer minor-unit amount, explicit `USD`. |
| `config.ts` | Sandbox-only configuration. Fails closed when disabled, on a non-sandbox environment or host, on production key prefixes, without an approved campaign, or for any funding source other than `BALANCE`. Path builder allows only `https://testflight.tremendous.com/api/v2/` paths. |
| `obligation.ts` | Validates trusted actor/owner context, business, source record (must be closed) and approved connection/program; validates currency and amount; requires explicit approval; derives the stable opaque `external_id` from the immutable snapshot. |
| `order-payload.ts` | One email reward order: `payment.funding_source_id = BALANCE`, `reward.campaign_id` from approved configuration, `reward.value.denomination` + `currency_code`, `recipient`, `delivery.method = EMAIL`. |
| `order-client.ts` | Injected-transport adapter. Redirects disabled. Maps `200` issued, `201` replay, `409` payload conflict, `402` insufficient funds, timeout/ambiguous and malformed success to reconciliation with the SAME `external_id`. Verifies order/reward IDs and that amount, currency, recipient and delivery match the approved obligation. |
| `webhook.ts` | Raw-body HMAC-SHA256 verification of `Tremendous-Webhook-Signature` (`sha256=` hex), envelope schema validation, narrow event projection, injected deduplication by event UUID, and out-of-order protection. |
| `redact.ts` | Keeps credentials, signatures and reward links out of errors, logs and browser-safe results. |

### Deliberate semantics

- A won/closed job creates a **candidate** obligation. It does not authorize
  issuing money: explicit human approval is a separate field.
- Amounts are integer minor units with an explicit currency. Display strings are
  never parsed, currency is never inferred, and currencies are never summed.
- The existing `rewards` rows are mutable manual records whose amount comes from
  free text. They are **not** an authoritative provider ledger, are not migrated
  here, and paid history is untouched.
- Approval, issuance and delivery evidence stay separate. Provider-issued is not
  paid-to-recipient, and a 2xx status is neither receipt nor redemption.
- Retries and reconciliation always reuse the same `external_id`. A new ID is
  never minted for a retry; a changed snapshot deliberately yields a new ID so
  the provider answers `409` instead of paying twice.
- Unknown or ambiguous order/fraud events require reconciliation. Redeemed or
  cashed-out states are never fabricated.

## What has NOT been connected or tested

- No sandbox API round trip. All provider responses in tests are fixtures with
  an injected transport. No recipient data is real (`example.test` only).
- The webhook module is **unregistered**: no endpoint, no provider webhook, no
  signing key. It cannot receive anything.
- The in-memory deduplication and evidence stores in the tests demonstrate logic
  only.
- No OAuth grant, no payment, no Stripe reward-funding charge, no automatic
  topup, no payout.

## Prerequisites before anything is connected

1. Durable, atomic event processing: one transaction per webhook event with the
   deduplication write and evidence write committed together.
2. An outbox / delivery-attempt ledger for order issuance and reconciliation.
3. Immutable obligation storage (append-only snapshots) plus real server
   authentication and authorization. Caller-supplied identifier fields are not
   authentication.
4. Tenant binding: connection to business resolved server-side, never trusted
   from the request.
5. Sandbox credentials and an approved sandbox campaign, then production access.

## The Connect model this is heading toward

Businesses fund their **own** approved Tremendous Connect organization and
explicitly approve each fixed reward after a qualifying closed job. Revvin does
not hold or advance reward funds. The public marketplace referral flow and the
existing manual reward records remain a separate, unchanged path.

## Specifications consulted

- Tremendous Connect: <https://developers.tremendous.com/docs/tremendous-connect>
- Sandbox environment (host `testflight.tremendous.com`, `TEST_` / `PROD_` key
  prefixes): <https://developers.tremendous.com/docs/sandbox-environment>
- Create order (`external_id` idempotency, `201` replay, `409` conflict):
  <https://developers.tremendous.com/reference/create-order>
- Webhooks (`Tremendous-Webhook-Signature`, HMAC-SHA256 hex over the raw body,
  event list): <https://developers.tremendous.com/docs/webhooks-1>
- Paying for orders (`BALANCE` funding source):
  <https://developers.tremendous.com/docs/paying-for-orders>

## Next steps

1. Obtain sandbox credentials and create one approved sandbox campaign.
2. Land durable ledger tables (obligations, issuance attempts, provider events)
   with RLS and grants, as pending SQL for review.
3. Add a thin authenticated handler that reuses these modules, then register a
   sandbox webhook and run a real sandbox round trip.
4. Only after sandbox reconciliation is proven end to end, request production
   access.
