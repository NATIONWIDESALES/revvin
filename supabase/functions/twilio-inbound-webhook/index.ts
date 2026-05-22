import { createClient } from 'npm:@supabase/supabase-js@2';

// Twilio posts application/x-www-form-urlencoded. We honor STOP/UNSUBSCRIBE/QUIT
// keywords by adding the sender's number to suppressed_contacts for the matching
// business (looked up via TWILIO_FROM_NUMBER -> business mapping is 1:1 for now).

const STOP_KEYWORDS = new Set([
  'STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'OPTOUT',
]);
const START_KEYWORDS = new Set(['START', 'YES', 'UNSTOP']);

function twiml(message?: string) {
  const body = message
    ? `<Response><Message>${message}</Message></Response>`
    : `<Response/>`;
  return new Response(body, {
    headers: { 'Content-Type': 'application/xml' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const form = await req.formData();
  const from = String(form.get('From') || '').trim();
  const body = String(form.get('Body') || '').trim();
  const to = String(form.get('To') || '').trim();

  if (!from || !body) return twiml();

  const keyword = body.toUpperCase().split(/\s+/)[0];

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Lookup business by inbound number. For now, we apply opt-out platform-wide
  // by finding any business that has sent to this contact. Fall back to a
  // global opt-out by inserting with business_id = NULL is not supported by
  // schema (NOT NULL), so we suppress per-business across all that sent to them.
  const { data: businesses } = await supabase
    .from('send_log')
    .select('business_id')
    .eq('channel', 'sms')
    .eq('recipient', from)
    .not('business_id', 'is', null)
    .limit(50);

  const businessIds = Array.from(new Set((businesses || []).map((r: any) => r.business_id)));

  if (STOP_KEYWORDS.has(keyword) && businessIds.length > 0) {
    const rows = businessIds.map((bid) => ({
      business_id: bid,
      contact_type: 'sms' as const,
      contact_value: from,
      suppressed_at: new Date().toISOString(),
      reason: 'sms_stop',
    }));
    await supabase.from('suppressed_contacts').upsert(rows as any, {
      onConflict: 'business_id,contact_value',
    });
    return twiml('You are unsubscribed and will not receive further messages. Reply START to resubscribe.');
  }

  if (START_KEYWORDS.has(keyword) && businessIds.length > 0) {
    await supabase
      .from('suppressed_contacts')
      .delete()
      .in('business_id', businessIds)
      .eq('contact_type', 'sms')
      .eq('contact_value', from);
    return twiml('You are resubscribed. Reply STOP to opt out again.');
  }

  if (keyword === 'HELP') {
    return twiml('Reply STOP to unsubscribe. Msg & data rates may apply.');
  }

  // Log inbound for visibility (non-keyword)
  await supabase.from('sms_outbound_log').insert({
    direction: 'inbound',
    from_number: from,
    to_number: to,
    body,
    status: 'received',
  } as any).then(() => null, () => null);

  return twiml();
});