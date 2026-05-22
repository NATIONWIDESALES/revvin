import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function htmlPage(title: string, msg: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:-apple-system,sans-serif;max-width:480px;margin:80px auto;padding:24px;color:#0F172A}
h1{font-size:20px;margin:0 0 12px}p{color:#475569;line-height:1.5}</style></head>
<body><h1>${title}</h1><p>${msg}</p></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response(htmlPage('Invalid link', 'Missing unsubscribe token.'), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: rows } = await supabase
    .from('unsubscribe_tokens')
    .select('business_id, contact_type, contact_value, used_at')
    .eq('token', token)
    .limit(1);

  const row = rows?.[0];
  if (!row) {
    return new Response(htmlPage('Link not found', 'This unsubscribe link is invalid or expired.'), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
    });
  }

  // Idempotent: insert into suppressed_contacts and mark token used
  const contactValue = row.contact_type === 'email'
    ? String(row.contact_value).toLowerCase()
    : row.contact_value;

  await supabase.from('suppressed_contacts').upsert({
    business_id: row.business_id,
    contact_type: row.contact_type,
    contact_value: contactValue,
    suppressed_at: new Date().toISOString(),
    reason: 'user_unsubscribe',
  } as any, { onConflict: 'business_id,contact_value' });

  if (!row.used_at) {
    await supabase
      .from('unsubscribe_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);
  }

  return new Response(
    htmlPage('Unsubscribed', 'You will no longer receive messages from this business. You can close this tab.'),
    { headers: { ...corsHeaders, 'Content-Type': 'text/html' } },
  );
});