# Reliability fixes, November 21, 2026

## Changes

- `src/main.tsx`: install the existing ResizeObserver polyfill before either React rendering path when the browser constructor is absent or not a function. Preserve native constructors; retain the slider fallback.
- `src/test/observer-compatibility.test.tsx`: cover startup without a slider, non-function constructors and native preservation.
- `supabase/functions/security-monitor/role-changes.ts`: classify only `action: INSERT`, `role: business`, `actor: null` as a new business account. All other and malformed records remain alertable.
- `supabase/functions/security-monitor/index.ts`: filter only role-alert email candidates; split weekly role totals into new business accounts and other role changes. Audit writers, database policies, existing query limits and throttling are unchanged.
- `src/test/security-monitor-roles.test.ts`: cover routine signup, admin/super_admin, UPDATE, DELETE, actor-attributed inserts, malformed data and split totals.
- `AGENTS.md` and `supabase/functions/security-monitor/AGENTS.md`: record observer startup and shared alert classification rules.
- `roadmap.md`: track verification and the blocked smoke change.

## Smoke journey: unapplied SQL proposal

There is no `supabase/functions/smoke-customer-journey` in this project. The live hourly journey is `public.fn_smoke_customer_journey()`, matching migration 0021. Its hexadecimal suffix can normalize into blocked terms such as `2fa`. Changing the live function requires a database function replacement, so no migration or database change has been made.

In a future authorized replacement of that function, replace the existing `short` declaration with:

```sql
short text;
slug_attempt integer;
```

Insert this at the outer `BEGIN`, before the existing inner journey `BEGIN`:

```sql
FOR slug_attempt IN 1..100 LOOP
  SELECT string_agg(
    substr('bcdfghjklmnpqrstvwxyz', 1 + floor(random() * 21)::int, 1),
    '' ORDER BY letter
  ) INTO short
  FROM generate_series(1, 8) AS letters(letter);

  EXIT WHEN public.fn_slug_rejection('smoke-' || short) IS NULL;
END LOOP;
IF public.fn_slug_rejection('smoke-' || short) IS NOT NULL THEN
  RAISE EXCEPTION 'could not generate a valid smoke slug after 100 attempts';
END IF;
```

All existing `'smoke-' || short` uses remain unchanged. This yields eight lowercase consonants, checks the exact live slug validator including reserved terms and profanity, regenerates rejected candidates and bounds failure if future rules reject the prefix. The existing journey, rollback behavior and permissions remain untouched.

## Release status

Full suite: 1287 passed, 3 skipped. Security-monitor Deno check passed; preview build OK. Browser checks confirmed signup and sample render with ResizeObserver removed before startup, a working replacement and no page errors. A read-only query generated 1000 consonant-only candidates: all matched the format and passed the live validator. Dashboard and private preview signed-in rendering were not exercised.

Not published. Security-monitor deployment and the proposed SQL change remain unapplied for review.