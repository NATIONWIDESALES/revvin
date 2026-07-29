// Outbound webhook worker. Picks up due rows from webhook_deliveries, signs
// them and posts them, then either marks them delivered or backs off.
//
// Signing: HMAC-SHA256 over "<timestamp>.<body>" using the endpoint secret.
// The timestamp travels in its own header so a receiver can reject replays.
// Receivers must recompute over the raw body, so we send exactly the string
// we signed.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const BATCH = 25
const MAX_ATTEMPTS = 6
const TIMEOUT_MS = 10_000
// 1m, 5m, 25m, 2h, 10h. Enough to ride out a receiver being down for a workday.
const BACKOFF_MINUTES = [1, 5, 25, 120, 600]

const hmacHex = async (secret: string, message: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  const nowIso = new Date().toISOString()
  const { data: due, error } = await admin
    .from('webhook_deliveries')
    .select('id, endpoint_id, business_id, event, payload, attempts')
    .in('status', ['pending', 'retrying'])
    .lte('next_attempt_at', nowIso)
    .order('next_attempt_at', { ascending: true })
    .limit(BATCH)

  if (error) {
    console.error('dispatch-webhooks: could not read queue:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let delivered = 0
  let failed = 0

  for (const row of due ?? []) {
    const { data: eps } = await admin
      .from('webhook_endpoints')
      .select('url, secret, active, include_contact')
      .eq('id', row.endpoint_id)
      .limit(1)
    const ep = eps?.[0]

    if (!ep || !ep.active) {
      await admin
        .from('webhook_deliveries')
        .update({ status: 'canceled', last_error: 'Endpoint is inactive or was deleted' })
        .eq('id', row.id)
      continue
    }

    // Payloads are identifiers only by default. Contact details are attached
    // only when the owner explicitly turned that on for this endpoint, and the
    // UI spells out what that means before they do.
    let data = row.payload as Record<string, unknown>
    if (ep.include_contact && typeof data?.lead_id === 'string') {
      const { data: leads } = await admin
        .from('leads')
        .select('lead_name, lead_email, lead_phone, referrer_name, referrer_email')
        .eq('id', data.lead_id)
        .limit(1)
      if (leads?.[0]) data = { ...data, contact: leads[0] }
    }

    const attempt = (row.attempts ?? 0) + 1
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const body = JSON.stringify({
      id: row.id,
      event: row.event,
      created_at: nowIso,
      business_id: row.business_id,
      data,
    })
    const signature = await hmacHex(ep.secret, `${timestamp}.${body}`)

    let ok = false
    let status: number | null = null
    let errText: string | null = null

    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
      const res = await fetch(ep.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Revvin-Webhooks/1',
          'X-Revvin-Event': row.event,
          'X-Revvin-Delivery': row.id,
          'X-Revvin-Timestamp': timestamp,
          'X-Revvin-Signature': `sha256=${signature}`,
        },
        body,
        signal: controller.signal,
      })
      clearTimeout(timer)
      status = res.status
      ok = res.ok
      if (!ok) errText = `Receiver responded ${res.status}`
    } catch (e) {
      errText = e instanceof Error ? e.message : 'Request failed'
    }

    if (ok) {
      delivered++
      await admin
        .from('webhook_deliveries')
        .update({
          status: 'delivered',
          attempts: attempt,
          response_status: status,
          last_error: null,
          delivered_at: new Date().toISOString(),
        })
        .eq('id', row.id)
    } else {
      failed++
      const exhausted = attempt >= MAX_ATTEMPTS
      const waitMin = BACKOFF_MINUTES[Math.min(attempt - 1, BACKOFF_MINUTES.length - 1)]
      await admin
        .from('webhook_deliveries')
        .update({
          status: exhausted ? 'failed' : 'retrying',
          attempts: attempt,
          response_status: status,
          last_error: errText,
          next_attempt_at: new Date(Date.now() + waitMin * 60_000).toISOString(),
        })
        .eq('id', row.id)
    }
  }

  return new Response(
    JSON.stringify({ processed: due?.length ?? 0, delivered, failed }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
