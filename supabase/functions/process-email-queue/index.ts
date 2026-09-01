import { sendLovableEmail } from 'npm:@lovable.dev/email-js'
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { suppressContact } from '../_shared/outreach.ts'

const MAX_RETRIES = 5
const DEFAULT_BATCH_SIZE = 10
const DEFAULT_SEND_DELAY_MS = 200
const DEFAULT_AUTH_TTL_MINUTES = 15
const DEFAULT_TRANSACTIONAL_TTL_MINUTES = 60
// A reactivation campaign is still worth sending an hour late, unlike a login
// code, so it gets a much longer TTL. Held as a constant rather than a column
// on email_send_state because that would need a migration.
const CAMPAIGN_TTL_MINUTES = 24 * 60

// Campaign queue drains last so a 500-recipient campaign can never delay an
// auth email. pgmq queue name -> the queue that carries campaign payloads.
const CAMPAIGN_QUEUE = 'campaign_emails'

/**
 * A permanent delivery failure: the address does not exist, is blocked, or the
 * recipient complained. These must never be retried on a shared sending domain.
 */
function isPermanentDeliveryFailure(error: unknown): boolean {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status
    // 422 is the gateway's validation/suppression rejection.
    if (status === 422) return true
  }
  const message = error instanceof Error ? error.message : String(error ?? '')
  return /hard\s*bounce|permanently|does not exist|invalid recipient|mailbox (not found|unavailable)|no such user|blocked|blacklist|spam complaint|complaint|unsubscribed|suppress/i.test(
    message
  )
}


// Check if an error is a rate-limit (429) response.
// Uses EmailAPIError.status when available (email-js >=0.x with structured errors),
// falls back to parsing the error message for older versions.
function isRateLimited(error: unknown): boolean {
  if (error && typeof error === 'object' && 'status' in error) {
    return (error as { status: number }).status === 429
  }
  return error instanceof Error && error.message.includes('429')
}

// Check if an error is a forbidden (403) response, which means emails are
// disabled for this project. Retrying won't help — move straight to DLQ.
function isForbidden(error: unknown): boolean {
  if (error && typeof error === 'object' && 'status' in error) {
    return (error as { status: number }).status === 403
  }
  return error instanceof Error && error.message.includes('403')
}

// Extract Retry-After seconds from a structured EmailAPIError, or default to 60s.
function getRetryAfterSeconds(error: unknown): number {
  if (error && typeof error === 'object' && 'retryAfterSeconds' in error) {
    return (error as { retryAfterSeconds: number | null }).retryAfterSeconds ?? 60
  }
  return 60
}

function parseJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length < 2) {
    return null
  }

  try {
    const payload = parts[1]
      .replaceAll('-', '+')
      .replaceAll('_', '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=')

    return JSON.parse(atob(payload)) as Record<string, unknown>
  } catch {
    return null
  }
}

// Move a message to the dead letter queue and log the reason.
async function moveToDlq(
  supabase: SupabaseClient<any, any, any>,
  queue: string,
  msg: { msg_id: number; message: Record<string, unknown> },
  reason: string
): Promise<void> {
  const payload = msg.message
  await supabase.from('email_send_log').insert({
    message_id: payload.message_id,
    template_name: (payload.label || queue) as string,
    recipient_email: payload.to,
    status: 'dlq',
    error_message: reason,
  } as any)
  const { error } = await supabase.rpc('move_to_dlq', {
    source_queue: queue,
    dlq_name: `${queue}_dlq`,
    message_id: msg.msg_id,
    payload,
  } as any)
  if (error) {
    console.error('Failed to move message to DLQ', { queue, msg_id: msg.msg_id, reason, error })
  }
}

/**
 * Reconcile one campaign's counters from its send rows and close it out when
 * nothing is left in flight.
 *
 * Counters are recounted rather than incremented so a redelivered queue message
 * or an overlapping worker run cannot double count. The deployed
 * campaigns_status_check constraint has no 'completed' value, so a finished
 * campaign is marked 'sent' with completed_at set.
 */
async function reconcileCampaign(
  supabase: SupabaseClient<any, any, any>,
  campaignId: string
): Promise<void> {
  const counts: Record<string, number> = {}
  for (const status of ['sent', 'failed', 'suppressed', 'pending', 'sending']) {
    const { count } = await supabase
      .from('campaign_sends')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('status', status)
    counts[status] = count ?? 0
  }

  const inFlight = counts.pending + counts.sending
  const update: Record<string, unknown> = {
    sent_count: counts.sent,
    failed_count: counts.failed,
    opted_out_count: counts.suppressed,
  }
  if (inFlight === 0) {
    update.status = 'sent'
    update.completed_at = new Date().toISOString()
  }

  const { error } = await supabase.from('campaigns').update(update as any).eq('id', campaignId)
  if (error) {
    console.error('Failed to reconcile campaign counters', { campaignId, error })
  }
}

/** Record the outcome of a campaign send on its campaign_sends row. */
async function recordCampaignOutcome(
  supabase: SupabaseClient<any, any, any>,
  payload: Record<string, unknown>,
  outcome: { ok: true } | { ok: false; reason: string; suppressed?: boolean }
): Promise<void> {
  const sendId = typeof payload.campaign_send_id === 'string' ? payload.campaign_send_id : null
  if (!sendId) return

  // 'queued' is not a permitted campaign_sends status in the deployed schema;
  // rows start at 'pending'.
  const update = outcome.ok
    ? {
        status: 'sent',
        message_id: (payload.message_id as string) ?? null,
        sent_at: new Date().toISOString(),
        failure_reason: null,
      }
    : {
        status: 'failed',
        failure_reason: outcome.reason.slice(0, 500),
      }

  const { error } = await supabase.from('campaign_sends').update(update as any).eq('id', sendId)
  if (error) {
    console.error('Failed to update campaign_sends row', { sendId, error })
  }
}

async function reconcileCampaignForPayload(
  supabase: SupabaseClient<any, any, any>,
  payload: Record<string, unknown>,
): Promise<void> {
  const campaignId = typeof payload.campaign_id === 'string' ? payload.campaign_id : null
  if (campaignId) await reconcileCampaign(supabase, campaignId)
}

Deno.serve(async (req) => {
  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!apiKey || !supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables')
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Defense in depth: verify_jwt=true already requires a valid JWT at the
  // gateway layer. This adds an explicit role check so only service-role
  // callers can trigger queue processing.
  const token = authHeader.slice('Bearer '.length).trim()
  const claims = parseJwtClaims(token)
  if (claims?.role !== 'service_role') {
    return new Response(
      JSON.stringify({ error: 'Forbidden' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const supabase: SupabaseClient<any, any, any> = createClient(supabaseUrl, supabaseServiceKey)

  // 1. Check rate-limit cooldown and read queue config
  const { data: state } = await supabase
    .from('email_send_state')
    .select('retry_after_until, batch_size, send_delay_ms, auth_email_ttl_minutes, transactional_email_ttl_minutes')
    .single()

  if (state?.retry_after_until && new Date(state.retry_after_until) > new Date()) {
    return new Response(
      JSON.stringify({ skipped: true, reason: 'rate_limited' }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }

  const batchSize = state?.batch_size ?? DEFAULT_BATCH_SIZE
  const sendDelayMs = state?.send_delay_ms ?? DEFAULT_SEND_DELAY_MS
  const ttlMinutes: Record<string, number> = {
    auth_emails: state?.auth_email_ttl_minutes ?? DEFAULT_AUTH_TTL_MINUTES,
    transactional_emails: state?.transactional_email_ttl_minutes ?? DEFAULT_TRANSACTIONAL_TTL_MINUTES,
    [CAMPAIGN_QUEUE]: CAMPAIGN_TTL_MINUTES,
  }

  let totalProcessed = 0

  // Auth and transactional mail always run before campaigns. Campaigns are last
  // and each invocation still reads only batchSize messages, so a large campaign
  // cannot delay account access or lead notifications.
  for (const queue of ['auth_emails', 'transactional_emails', CAMPAIGN_QUEUE]) {
    const { data: messages, error: readError } = await supabase.rpc('read_email_batch', {
      queue_name: queue,
      batch_size: batchSize,
      vt: 30,
    })

    if (readError) {
      console.error('Failed to read email batch', { queue, error: readError })
      continue
    }

    if (!messages?.length) continue

    // Retry budget is based on real send failures, not pgmq read_ct.
    // read_ct increments for every message in a claimed batch, including
    // messages not attempted when a 429 stops processing early.
    const messageIds = Array.from(
      new Set(
        messages
          .map((msg: any) =>
            msg?.message?.message_id && typeof msg.message.message_id === 'string'
              ? msg.message.message_id
              : null
          )
          .filter((id: string | null): id is string => Boolean(id))
      )
    )
    const failedAttemptsByMessageId = new Map<string, number>()
    if (messageIds.length > 0) {
      const { data: failedRows, error: failedRowsError } = await supabase
        .from('email_send_log')
        .select('message_id')
        .in('message_id', messageIds)
        .eq('status', 'failed')

      if (failedRowsError) {
        console.error('Failed to load failed-attempt counters', {
          queue,
          error: failedRowsError,
        })
      } else {
        for (const row of failedRows ?? []) {
          const messageId = row?.message_id
          if (typeof messageId !== 'string' || !messageId) continue
          failedAttemptsByMessageId.set(
            messageId,
            (failedAttemptsByMessageId.get(messageId) ?? 0) + 1
          )
        }
      }
    }

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i]
      const payload = msg.message as Record<string, unknown>
      const failedAttempts =
        payload?.message_id && typeof payload.message_id === 'string'
          ? (failedAttemptsByMessageId.get(payload.message_id) ?? 0)
          : msg.read_ct ?? 0

      // Drop expired messages (TTL exceeded). Campaigns use their own 24-hour
      // TTL so a delayed campaign remains useful without changing auth TTL.
      const queuedAt = payload.queued_at ?? msg.enqueued_at
      if (queuedAt) {
        const ageMs = Date.now() - new Date(String(queuedAt)).getTime()
        const maxAgeMs = ttlMinutes[queue] * 60 * 1000
        if (ageMs > maxAgeMs) {
          const reason = `TTL exceeded (${ttlMinutes[queue]} minutes)`
          await moveToDlq(supabase, queue, msg, reason)
          await recordCampaignOutcome(supabase, payload, { ok: false, reason })
          await reconcileCampaignForPayload(supabase, payload)
          continue
        }
      }

      // Move to DLQ if max failed send attempts reached.
      if (failedAttempts >= MAX_RETRIES) {
        const reason = `Max retries (${MAX_RETRIES}) exceeded (attempted ${failedAttempts} times)`
        await moveToDlq(supabase, queue, msg, reason)
        await recordCampaignOutcome(supabase, payload, { ok: false, reason })
        await reconcileCampaignForPayload(supabase, payload)
        continue
      }

      // Guard: skip if another worker already sent this message (VT expired race)
      if (payload.message_id) {
        const { data: alreadySent } = await supabase
          .from('email_send_log')
          .select('id')
          .eq('message_id', payload.message_id)
          .limit(1)

        if (alreadySent?.length) {
          const { error: dupDelError } = await supabase.rpc('delete_email', {
            queue_name: queue,
            message_id: msg.msg_id,
          })
          if (dupDelError) {
            console.error('Failed to delete duplicate message from queue', { queue, msg_id: msg.msg_id, error: dupDelError })
          }
          await recordCampaignOutcome(supabase, payload, { ok: true })
          await reconcileCampaignForPayload(supabase, payload)
          continue
        }
      }

      // A retried campaign message becomes in-flight again. This keeps a
      // transient failed attempt from being mistaken for a finished campaign.
      if (queue === CAMPAIGN_QUEUE && typeof payload.campaign_send_id === 'string') {
        await supabase
          .from('campaign_sends')
          .update({ status: 'pending', failure_reason: null } as any)
          .eq('id', payload.campaign_send_id)
      }

      try {
        await sendLovableEmail(
          {
            run_id: payload.run_id,
            to: payload.to,
            from: payload.from,
            sender_domain: payload.sender_domain,
            reply_to: payload.reply_to,
            subject: payload.subject,
            html: payload.html,
            text: payload.text,
            purpose: payload.purpose,
            label: payload.label,
            idempotency_key: payload.idempotency_key,
            unsubscribe_token: payload.unsubscribe_token,
            message_id: payload.message_id,
          },
          { apiKey, sendUrl: Deno.env.get('LOVABLE_SEND_URL') }
        )

        await supabase.from('email_send_log').insert({
          message_id: payload.message_id,
          template_name: payload.label || queue,
          recipient_email: payload.to,
          status: 'sent',
        })
        await recordCampaignOutcome(supabase, payload, { ok: true })
        await reconcileCampaignForPayload(supabase, payload)

        const { error: delError } = await supabase.rpc('delete_email', {
          queue_name: queue,
          message_id: msg.msg_id,
        })
        if (delError) {
          console.error('Failed to delete sent message from queue', { queue, msg_id: msg.msg_id, error: delError })
        }
        totalProcessed++
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error('Email send failed', {
          queue,
          msg_id: msg.msg_id,
          read_ct: msg.read_ct,
          failed_attempts: failedAttempts,
          error: errorMsg,
        })

        if (isRateLimited(error)) {
          await supabase.from('email_send_log').insert({
            message_id: payload.message_id,
            template_name: payload.label || queue,
            recipient_email: payload.to,
            status: 'rate_limited',
            error_message: errorMsg.slice(0, 1000),
          })

          const retryAfterSecs = getRetryAfterSeconds(error)
          await supabase
            .from('email_send_state')
            .update({
              retry_after_until: new Date(Date.now() + retryAfterSecs * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', 1)

          // Remaining messages stay in the queue. Auth mail is never reached
          // after this point because campaigns are the final queue.
          return new Response(
            JSON.stringify({ processed: totalProcessed, stopped: 'rate_limited' }),
            { headers: { 'Content-Type': 'application/json' } }
          )
        }

        const permanent = isPermanentDeliveryFailure(error)
        if (permanent) {
          // Hard bounces and complaints must never consume retry attempts on the
          // shared sending domain. Suppression happens before any return.
          const businessId = typeof payload.business_id === 'string' ? payload.business_id : ''
          if (businessId && typeof payload.to === 'string') {
            await suppressContact(supabase, businessId, payload.to, /complaint|spam/i.test(errorMsg) ? 'spam_complaint' : 'hard_bounce')
          }
        }

        const failureReason = permanent ? `permanent_delivery_failure: ${errorMsg}` : errorMsg
        await supabase.from('email_send_log').insert({
          message_id: payload.message_id,
          template_name: payload.label || queue,
          recipient_email: payload.to,
          status: 'failed',
          error_message: failureReason.slice(0, 1000),
        })
        await recordCampaignOutcome(supabase, payload, { ok: false, reason: failureReason })
        if (payload?.message_id && typeof payload.message_id === 'string') {
          failedAttemptsByMessageId.set(payload.message_id, failedAttempts + 1)
        }

        if (permanent) {
          await moveToDlq(supabase, queue, msg, failureReason)
          await reconcileCampaignForPayload(supabase, payload)
        }
        if (isForbidden(error)) {
          const reason = 'Emails disabled for this project'
          await moveToDlq(supabase, queue, msg, reason)
          await recordCampaignOutcome(supabase, payload, { ok: false, reason })
          await reconcileCampaignForPayload(supabase, payload)
          return new Response(
            JSON.stringify({ processed: totalProcessed, stopped: 'emails_disabled' }),
            { headers: { 'Content-Type': 'application/json' } }
          )
        }

        // Other failures stay invisible until VT expires and are retried.
      }

      if (i < messages.length - 1) {
        await new Promise((r) => setTimeout(r, sendDelayMs))
      }
    }
  }

  return new Response(
    JSON.stringify({ processed: totalProcessed }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
