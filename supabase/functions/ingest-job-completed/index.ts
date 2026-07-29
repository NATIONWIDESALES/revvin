// Inbound integration endpoint. An outside system (Jobber, Housecall Pro, a Zap,
// a custom script) posts a completed job here and it becomes a scheduled
// referral ask, identical to one logged by hand in the dashboard.
//
// Compliance is NOT relaxed for API callers. This path enforces the same three
// things the manual path does:
//   1. the attestation gate  (business must have contact_outreach_consent_at set)
//   2. the suppression list  (suppressed_contacts and suppressed_emails)
//   3. the delay + queue     (same scheduled_send_at, same worker, same
//                             unsubscribe footer at send time)
// If you are tempted to add a "skip_checks" flag here, don't.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const DELAY_HOURS = 2
const RATE_LIMIT_PER_HOUR = 120

const headers = { ...corsHeaders, 'Content-Type': 'application/json' }
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers })

const sha256Hex = async (s: string) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

// Strict validation. Bad input is rejected, never coerced into something we
// then email a real person about.
function validate(body: Record<string, unknown>) {
  const errors: Record<string, string> = {}
  const str = (v: unknown, max: number) =>
    typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max ? v.trim() : null

  const first = str(body.customer_first_name, 80)
  if (!first) errors.customer_first_name = 'required, 1 to 80 characters'

  let email: string | null = null
  if (body.customer_email !== undefined && body.customer_email !== null && body.customer_email !== '') {
    const raw = str(body.customer_email, 255)
    if (!raw || !isEmail(raw)) errors.customer_email = 'must be a valid email address'
    else email = raw.toLowerCase()
  }

  let phone: string | null = null
  if (body.customer_phone !== undefined && body.customer_phone !== null && body.customer_phone !== '') {
    const raw = str(body.customer_phone, 40)
    if (!raw || raw.replace(/\D/g, '').length < 7) errors.customer_phone = 'must be a valid phone number'
    else phone = raw
  }

  if (!email && !phone && !errors.customer_email && !errors.customer_phone) {
    errors.contact = 'customer_email or customer_phone is required'
  }

  let service: string | null = null
  if (body.service_description != null && body.service_description !== '') {
    service = str(body.service_description, 300)
    if (!service) errors.service_description = 'must be 1 to 300 characters'
  }

  let technician: string | null = null
  if (body.technician_name != null && body.technician_name !== '') {
    technician = str(body.technician_name, 120)
    if (!technician) errors.technician_name = 'must be 1 to 120 characters'
  }

  let amount: number | null = null
  if (body.amount_paid != null && body.amount_paid !== '') {
    const n = typeof body.amount_paid === 'number' ? body.amount_paid : Number(body.amount_paid)
    if (!Number.isFinite(n) || n < 0 || n > 10_000_000) errors.amount_paid = 'must be a number between 0 and 10000000'
    else amount = n
  }

  let externalId: string | null = null
  if (body.external_id != null && body.external_id !== '') {
    externalId = str(body.external_id, 200)
    if (!externalId) errors.external_id = 'must be 1 to 200 characters'
  }

  return { errors, value: { first, email, phone, service, technician, amount, externalId } }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const presented = req.headers.get('x-api-key') ?? ''
  if (!presented || presented.length < 20 || presented.length > 200) {
    // Never log the presented value.
    return json({ error: 'Missing or malformed x-api-key header' }, 401)
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  const hash = await sha256Hex(presented)
  const { data: keys } = await admin
    .from('api_keys')
    .select('id, business_id, revoked_at')
    .eq('key_hash', hash)
    .limit(1)
  const key = keys?.[0]
  if (!key || key.revoked_at) return json({ error: 'Invalid or revoked API key' }, 401)

  // Per-key rate limit. Cheap and good enough: count what this key created in
  // the last hour.
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await admin
    .from('referral_triggers')
    .select('id', { count: 'exact', head: true })
    .eq('api_key_id', key.id)
    .gte('created_at', since)
  if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded', limit_per_hour: RATE_LIMIT_PER_HOUR }),
      { status: 429, headers: { ...headers, 'Retry-After': '3600' } },
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Body must be valid JSON' }, 400)
  }

  const { errors, value } = validate(body)
  if (Object.keys(errors).length > 0) return json({ error: 'Validation failed', fields: errors }, 400)

  // Attestation gate. Same wall the dashboard puts in front of the job done tab.
  const { data: bizRows } = await admin
    .from('businesses')
    .select('id, contact_outreach_consent_at, is_published, is_disabled')
    .eq('id', key.business_id)
    .limit(1)
  const biz = bizRows?.[0]
  if (!biz) return json({ error: 'Business not found for this key' }, 401)
  if (biz.is_disabled) return json({ error: 'Account is disabled' }, 403)
  if (!biz.contact_outreach_consent_at) {
    return json({
      error: 'Outreach attestation not completed',
      detail:
        'Sign in to Revvin, open the Job done tab and confirm these are your own customers before sending jobs through the API.',
    }, 403)
  }

  // Idempotency on the caller's own event id, so a retrying integration does
  // not schedule the same ask twice.
  if (value.externalId) {
    const { data: dupe } = await admin
      .from('referral_triggers')
      .select('id')
      .eq('business_id', key.business_id)
      .eq('source_event_id', value.externalId)
      .limit(1)
    if (dupe?.[0]) {
      return json({ ok: true, duplicate: true, trigger_id: dupe[0].id }, 200)
    }
  }

  // Suppression. Checked here so the caller gets an honest answer, and again by
  // the worker immediately before it sends.
  let suppressed = false
  if (value.email) {
    const [{ data: local }, { data: global }] = await Promise.all([
      admin.rpc('fn_is_suppressed', {
        p_business_id: key.business_id,
        p_contact_type: 'email',
        p_contact_value: value.email,
      }),
      admin.from('suppressed_emails').select('id').eq('email', value.email).limit(1),
    ])
    suppressed = Boolean(local) || Boolean(global?.[0])
  }

  const willEmail = Boolean(value.email) && !suppressed
  const scheduledAt = new Date(Date.now() + DELAY_HOURS * 60 * 60 * 1000).toISOString()

  const { data: inserted, error } = await admin
    .from('referral_triggers')
    .insert({
      business_id: key.business_id,
      api_key_id: key.id,
      source: 'api',
      source_event_id: value.externalId ?? crypto.randomUUID(),
      customer_first_name: value.first,
      customer_email: value.email,
      customer_phone: value.phone,
      service_description: value.service,
      technician_name: value.technician,
      amount_paid: value.amount,
      status: willEmail ? 'scheduled' : 'canceled',
      channel: willEmail ? 'email' : null,
      failure_reason: suppressed
        ? 'suppressed_contact'
        : willEmail
          ? null
          : 'no_email_send_by_text_from_your_phone',
      review_request_status: 'off',
      scheduled_send_at: scheduledAt,
    })
    .select('id')
    .limit(1)

  if (error) {
    console.error('ingest-job-completed insert failed:', error.message)
    return json({ error: 'Could not record the job', details: error.message }, 500)
  }

  await admin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', key.id)

  return json({
    ok: true,
    trigger_id: inserted?.[0]?.id ?? null,
    scheduled_send_at: willEmail ? scheduledAt : null,
    status: willEmail ? 'scheduled' : 'not_scheduled',
    reason: suppressed
      ? 'This customer is on your suppression list, so nothing will be sent.'
      : willEmail
        ? null
        : 'No email address, so no automatic ask. Text them from your own phone in the dashboard.',
  }, 202)
})
