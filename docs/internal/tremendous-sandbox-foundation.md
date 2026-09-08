# Tremendous sandbox foundation (inactive, unconnected)

Internal engineering note. Not user-facing copy. Nothing described here is live.

## Status

This is a source-only first slice: reusable server modules plus fixture tests in
`supabase/functions/_shared/tremendous/`. As of this commit:

- No sandbox or production API call has ever been made from this code.
- No developer app, API key, webhook, campaign or funding source has been
  created or registered. Production API access is still in "Request production
  API access" state in the observed production account. Sandbox credentials
  have not been supplied or connected; a separate sandbox account may exist.
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
| `obligation.ts` | Validates trusted actor/owner context, business, source record (must be closed) and approved connection/program; validates currency and amount; requires explicit approval; derives the stable opaque `external_id` from business ID plus obligation ID, independent of snapshot version. |
| `order-payload.ts` | One email reward order: `payment.funding_source_id = BALANCE`, `reward.campaign_id` from approved configuration, `reward.value.denomination` + `currency_code`, `recipient`, `delivery.method = EMAIL`. |
| `order-client.ts` | Injected-transport adapter with configuration, approval and tenant/program validation inside the issuing entry point. Requires an attempt fingerprint claim before transport. Redirects disabled. HTTP `200`/`201` require an `EXECUTED` order and matching reward-to-order binding, amount, currency, recipient and delivery. `409`, `402`, ambiguous responses and timeouts remain separate outcomes. |
| `webhook.ts` | Raw-body HMAC-SHA256 verification of `Tremendous-Webhook-Signature` (`sha256=` hex), documented `uuid`/`created_utc`/`payload.resource` envelope validation, narrow event projection, injected deduplication by event UUID, and separate delivery/adverse evidence. A newer delivery never clears a cancellation or fraud flag; delayed adverse events still require reconciliation. |
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
- Retries and reconciliation always reuse the same `external_id`, derived from
  business ID plus obligation ID. A changed snapshot keeps that ID and fails
  the local attempt fingerprint gate before transport. The provider can also
  return `409` for changed parameters under the same ID. Minting a new ID would
  permit another order and is not a duplicate-payment safeguard.
- Unknown or ambiguous order/fraud events require reconciliation. Redeemed or
  cashed-out states are never fabricated.

## What has NOT been connected or tested

- No sandbox API round trip. All provider responses in tests are fixtures with
  an injected transport. No recipient data is real (`example.test` only).
- The webhook module is **unregistered**: no endpoint, no provider webhook, no
  signing key. It cannot receive anything.
- The in-memory attempt, deduplication and evidence stores in tests demonstrate
  logic only. They do not establish crash safety, multi-worker concurrency or
  durable exactly-once effects.
- No OAuth grant, no payment, no Stripe reward-funding charge, no automatic
  topup, no payout.

## Prerequisites before anything is connected

1. Durable, atomic event processing: one transaction per webhook event with the
   deduplication write, evidence write and any reconciliation queue entry
   committed together. The injected interfaces currently run sequentially and
   must be wrapped in that transaction before registering any handler.
2. An outbox / delivery-attempt ledger for order issuance and reconciliation,
   including atomic `AttemptStore.claim` compare-and-reserve, immutable request
   fingerprints, and uniqueness of the business/source obligation so a caller
   cannot evade idempotency by inventing a second obligation ID.
3. Immutable obligation storage (append-only snapshots) plus real server
   authentication and authorization. Caller-supplied identifier fields are not
   authentication.
4. Tenant binding: connection to business resolved server-side, never trusted
   from the request. Resolve the credential and provider organization through
   that stored connection; identifier equality alone does not prove the token
   belongs to the organization. Recheck current permission before dispatch.
5. Sandbox credentials and an approved sandbox campaign. Production additionally
   requires the applicable provider access and platform agreement approvals.

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

1. Confirm or create a separate sandbox account and approved sandbox campaign;
   place credentials only in a server secret store when the handler is ready.
2. Land durable ledger tables (obligations, issuance attempts, provider events)
   with RLS and grants, as pending SQL for review.
3. Add a thin authenticated handler that reuses these modules, then register a
   sandbox webhook and run a real sandbox round trip.
4. Ask Tremendous about the platform/Connect arrangement and production review
   in parallel with sandbox development. Enable production only after provider
   approval and end-to-end reconciliation have both been demonstrated.
