import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

const MAX_RETRIES = 5;
const BATCH_SIZE = 10;
const SEND_DELAY_MS = 250;
const TWILIO_GATEWAY = 'https://connector-gateway.lovable.dev/twilio';

function parseJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replaceAll('-', '+').replaceAll('_', '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=');
    return JSON.parse(atob(payload));
  } catch { return null; }
}

async function moveToDlq(
  supabase: SupabaseClient,
  msg: { msg_id: number; message: Record<string, unknown> },
  reason: string,
) {
  const payload = msg.message;
  await supabase.from('send_log').insert({
    business_id: payload.business_id ?? null,
    channel: 'sms',
    recipient: payload.to,
    body: payload.body,
    message_id: payload.message_id,
    status: 'dlq',
    mode: 'production',
    error_message: reason,
  } as any);
  await supabase.rpc('move_to_dlq', {
    source_queue: 'sms_outbound',
    dlq_name: 'sms_outbound_dlq',
    message_id: msg.msg_id,
    payload,
  } as any);
}

async function sendTwilioSMS(to: string, from: string, body: string) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const TWILIO_API_KEY = Deno.env.get('TWILIO_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY missing');
  if (!TWILIO_API_KEY) throw new Error('TWILIO_API_KEY missing');

  const res = await fetch(`${TWILIO_GATEWAY}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': TWILIO_API_KEY,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(`Twilio ${res.status}: ${JSON.stringify(data)}`);
    (err as any).status = res.status;
    throw err;
  }
  return data;
}

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER');

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const claims = parseJwtClaims(authHeader.slice(7));
  if (claims?.role !== 'service_role') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  if (!fromNumber) {
    return new Response(JSON.stringify({ error: 'TWILIO_FROM_NUMBER not configured' }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: messages, error: readErr } = await supabase.rpc('read_email_batch', {
    queue_name: 'sms_outbound',
    batch_size: BATCH_SIZE,
    vt: 30,
  });

  if (readErr) {
    console.error('read sms queue failed', readErr);
    return new Response(JSON.stringify({ error: 'read_failed' }), { status: 500 });
  }

  if (!messages?.length) {
    return new Response(JSON.stringify({ processed: 0 }));
  }

  let processed = 0;
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i] as any;
    const payload = msg.message;

    // Idempotency: skip if already sent
    if (payload.message_id) {
      const { data: already } = await supabase
        .from('send_log')
        .select('id')
        .eq('message_id', payload.message_id)
        .eq('status', 'sent')
        .limit(1);
      if (already && already.length > 0) {
        await supabase.rpc('delete_email', { queue_name: 'sms_outbound', message_id: msg.msg_id });
        continue;
      }
    }

    if (msg.read_ct >= MAX_RETRIES) {
      await moveToDlq(supabase, msg, `Max retries (${MAX_RETRIES}) exceeded`);
      continue;
    }

    try {
      await sendTwilioSMS(payload.to, payload.from || fromNumber, payload.body);
      await supabase.from('send_log').insert({
        business_id: payload.business_id ?? null,
        channel: 'sms',
        recipient: payload.to,
        body: payload.body,
        message_id: payload.message_id,
        status: 'sent',
        mode: 'production',
      } as any);
      await supabase.rpc('delete_email', { queue_name: 'sms_outbound', message_id: msg.msg_id });
      processed++;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('sms send failed', { msg_id: msg.msg_id, error: errMsg });
      await supabase.from('send_log').insert({
        business_id: payload.business_id ?? null,
        channel: 'sms',
        recipient: payload.to,
        body: payload.body,
        message_id: payload.message_id,
        status: 'failed',
        mode: 'production',
        error_message: errMsg.slice(0, 1000),
      } as any);
      // Leave in queue; VT expires and retries
    }

    if (i < messages.length - 1) {
      await new Promise((r) => setTimeout(r, SEND_DELAY_MS));
    }
  }

  return new Response(JSON.stringify({ processed }), {
    headers: { 'Content-Type': 'application/json' },
  });
});