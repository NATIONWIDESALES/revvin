# Rep partner engine: blocked before live implementation

## Cloud result

The migration tool refused the first statement with PostgreSQL 42501, `permission denied for schema public`. A read-only follow-up confirmed no `partners.kind`, user link, rates or term-version table exists. No workaround, policy relaxation, live record mutation, edge deployment or frontend publication was attempted.

## Prepared, not installed

- `src/test/helpers/repPartnerMigration.sql`: candidate additive schema and function bodies, used only by the isolated test. It contains rep kind/user link, default terms, version history, applied rates, guarded server attribution and payment history, admin-only creation/link/terms/reassignment and own-rep earnings projections. No existing RLS policy or guard definition is changed.
- `src/test/rep-partners.test.ts`: isolated PostgreSQL candidate execution and 14 regression cases for defaults, claim attribution/audit, typed precedence, no-overwrite, demo/self/restricted exclusion, setup/monthly/yearly arithmetic, cutoff, terms history, removal, reversal arithmetic and RPC/table isolation.
- `roadmap.md`: remaining implementation tasks and schema permission blocker.
- Project memory: requested durable commission rules.
- This status report.

The candidate is not a completed implementation. No production screens, webhook commission calls, signup source persistence or prospect-vs-click ordering were changed. The candidate has not been installed in migration history and is not imported by the running application.

## Existing code conflicts requiring resolution when access is restored

1. A stored click can be written before the async claim. Claim cannot replace that attribution while also honoring the explicit no-overwrite rule. Prospect-linked signups must defer stored clicks until the bound claim resolves. Historical attributions must remain unchanged.
2. Current typed-code attribution still demands a recorded click and timestamp, and editing the prefilled field retains its click timestamp. The requested typed-code precedence needs a separately persisted signup source, not inference from the notification timing. This has not been connected.
3. The existing attribution trigger permits only the service role. The candidate uses bounded service-owned functions and retains that trigger byte-for-byte; live ownership/grant feasibility was not verified because the migration failed first.
4. Current partner commissions use the global 40% calculation. The candidate adds insert-time rate enforcement, but live webhook return values, zero-rate/retry handling and deployment still need integration tests before release.
5. First-payment history includes the collected invoice ledger and past commissions, but old un-attributed Launch Package cash is not fully represented there. Prospective payment observation is prepared; historic completeness and out-of-order webhook delivery still need verification.
6. Current `has_role` restricts inspection of other users' roles. The candidate rep claim checks protected `user_roles` internally without exposing a role lookup to the caller.

## Test scope and limitations

The unchanged affiliate test file passes all 24 tests. The isolated candidate passes 14 tests. Full-suite totals are reported in chat after execution. These are prototype checks, not a claim of deployed rep earnings.

No authenticated admin/rep browser flow or live Stripe/refund/payout was exercised. Rate-limit, email queue and restricted-category dependencies are fixture substitutes; existing rate limits and kill switches were not modified. The candidate test currently checks reversal arithmetic rather than a real refunded payment event, and no new rep payout was recorded.

## Next required action

Restore the migration tool's authorized schema access, then apply and verify the additive migration before connecting signup attribution, commission handlers and screens. Do not grant broad owner/sales table access or bypass the refusal.