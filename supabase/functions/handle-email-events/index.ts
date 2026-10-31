import { createEmailWebhookHandler } from 'npm:@lovable.dev/email-js@0.1.0'
import { createClient } from 'npm:@supabase/supabase-js@2.97.0'

async function suppress(event: { data: { recipient: string }; event_id: string }, reason: string) {
  const email = event.data.recipient.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid event recipient');
  const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const { error } = await db.from('suppressed_emails').upsert({ email, reason, metadata: { event_id: event.event_id } }, { onConflict: 'email' });
  if (error) throw new Error('Suppression write failed');
}

const handler = createEmailWebhookHandler({
  apiKey: Deno.env.get('LOVABLE_API_KEY')!,
  on: {
    'email.bounced': async (event) => {
      await suppress(event, 'hard_bounce')
    },
    'email.complaint': async (event) => {
      await suppress(event, 'complaint')
    },
    'email.unsubscribed': async (event) => {
      await suppress(event, 'unsubscribe')
    },
  },
})

Deno.serve((req) => handler(req))
