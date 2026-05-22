import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnqueueBody {
  business_id: string;
  channel: 'email' | 'sms';
  recipient: string;
  subject?: string;
  body: string;
  context?: string;
  message_id?: string;
  from?: string;
}

function uuid() {
  return crypto.randomUUID();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const SEND_MODE = (Deno.env.get('REVVIN_SEND_MODE') || 'staging').toLowerCase();

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Auth: accept either service-role JWT or end-user JWT
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const token = authHeader.slice(7);
  const anonClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!);
  const { data: userRes } = await anonClient.auth.getUser(token);
  const userId = userRes?.user?.id || null;

  let body: EnqueueBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Basic validation
  if (!body.business_id || !body.channel || !body.recipient || !body.body) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (body.channel !== 'email' && body.channel !== 'sms') {
    return new Response(JSON.stringify({ error: 'channel must be email or sms' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Verify caller owns business (or is service role / admin)
  if (userId) {
    const { data: biz } = await supabase
      .from('businesses')
      .select('id, user_id')
      .eq('id', body.business_id)
      .limit(1);
    const ownsBusiness = biz?.[0]?.user_id === userId;
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
    if (!ownsBusiness && !isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // Suppression check
  const contactValue = body.channel === 'email' ? body.recipient.toLowerCase() : body.recipient;
  const { data: suppressed } = await supabase.rpc('fn_is_suppressed', {
    p_business_id: body.business_id,
    p_contact_type: body.channel,
    p_contact_value: contactValue,
  });
  if (suppressed) {
    return new Response(JSON.stringify({ skipped: true, reason: 'suppressed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const messageId = body.message_id || uuid();

  // Staging mode: write directly to send_log, do not dispatch
  if (SEND_MODE === 'staging') {
    await supabase.from('send_log').insert({
      business_id: body.business_id,
      channel: body.channel,
      recipient: body.recipient,
      subject: body.subject || null,
      body: body.body,
      context: body.context || null,
      message_id: messageId,
      status: 'staged',
      mode: 'staging',
    });
    return new Response(JSON.stringify({ staged: true, message_id: messageId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Production: enqueue to pgmq
  const payload = {
    message_id: messageId,
    business_id: body.business_id,
    to: body.recipient,
    from: body.from || null,
    subject: body.subject || null,
    body: body.body,
    context: body.context || null,
    queued_at: new Date().toISOString(),
  };

  const queueName = body.channel === 'email' ? 'transactional_emails' : 'sms_outbound';
  const { error: enqErr } = await supabase.rpc('enqueue_email', {
    queue_name: queueName,
    payload,
  });

  if (enqErr) {
    console.error('enqueue failed', enqErr);
    return new Response(JSON.stringify({ error: 'enqueue_failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ queued: true, message_id: messageId }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});