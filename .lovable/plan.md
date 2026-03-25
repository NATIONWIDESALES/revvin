

## Fix Tremendous Integration Before Deploy

Two targeted fixes to the existing code, plus deploying the new functions and migration as previously planned.

### Fix 1: `process-tremendous-payout/index.ts` — Populate `tremendous_reward_id`

In the payout update call (line 200-206), add `tremendous_reward_id: rewardId` alongside `provider_reference`:

```typescript
await admin.from("payouts").update({
  status: "processing",
  method: "tremendous",
  provider_reference: orderId || rewardId || "unknown",
  tremendous_reward_id: rewardId,   // ← ADD THIS
  processed_by: user.id,
  updated_at: new Date().toISOString(),
}).eq("id", payout_id);
```

This is in the **current deployed file** — the uploaded replacement file should also include this.

### Fix 2: `tremendous-webhook/index.ts` — Direct column lookup first

In the webhook handler, when resolving the payout from a Tremendous reward ID, use the new column as primary lookup:

```typescript
// Primary: direct column lookup
const { data } = await admin
  .from("payouts")
  .select("*")
  .eq("tremendous_reward_id", resourceId)
  .maybeSingle();
payoutRecord = data;

// Fallback: audit_log scan (covers pre-migration payouts)
if (!payoutRecord) {
  // existing audit_log scan logic
}
```

### Deployment order (unchanged)

1. **Run SQL migration** — `tremendous_webhook_log` table, `tremendous_reward_id` column on `payouts`, indexes
2. **Add secrets** — `TREMENDOUS_CAMPAIGN_ID` = `TZNSJ0D5NUGI`, prompt for `TREMENDOUS_WEBHOOK_SECRET`
3. **Deploy 3 edge functions** with both fixes applied:
   - `process-tremendous-payout` (replace) — with `tremendous_reward_id` in update
   - `tremendous-webhook` (new) — with direct column lookup + audit_log fallback
   - `generate-payout-link` (new) — unchanged
4. **Update `supabase/config.toml`** — `verify_jwt = false` for `tremendous-webhook`

### What stays the same
- Migration, tables, indexes
- LINK delivery + Resend branded email
- Singular reward payload for sync 200
- Campaign ID `TZNSJ0D5NUGI`
- `updates@updates.revvin.co` from address
- HMAC signature verification on webhook

