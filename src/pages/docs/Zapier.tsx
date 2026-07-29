import SEOHead from "@/components/SEOHead";
import { Link } from "react-router-dom";

const PROJECT = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const INGEST = `https://${PROJECT}.supabase.co/functions/v1/ingest-job-completed`;

const Code = ({ children }: { children: string }) => (
  <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 text-xs leading-relaxed">
    <code>{children}</code>
  </pre>
);

const ZapierDocs = () => (
  <div className="min-h-screen bg-background">
    <SEOHead
      title="Zapier and webhooks guide | Revvin"
      description="Connect Revvin to Jobber, Housecall Pro or any tool with Webhooks by Zapier. API URLs, auth headers, payload shapes and signature verification."
      path="/docs/zapier"
    />

    <article className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">Zapier and webhooks</h1>
      <p className="mt-3 text-muted-foreground">
        Revvin has no native connectors, on purpose. A small team maintaining a dozen fragile integrations is a
        team not fixing the product. Instead there is a plain REST endpoint in and signed webhooks out, and
        Webhooks by Zapier speaks to both. Anything Zapier can trigger on, Revvin can hear.
      </p>

      <h2 className="mt-10 text-lg font-semibold text-foreground">Before you start</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Create an API key in your dashboard under Integrations, and complete the customer outreach attestation in
        the Job done tab. The API rejects jobs until that attestation exists, because the same consent rules apply
        whether a job is logged by hand or by machine.
      </p>

      <h2 className="mt-10 text-lg font-semibold text-foreground">Inbound: tell Revvin a job is done</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        In Zapier, add an action step: <strong>Webhooks by Zapier, POST</strong>. Trigger it from whatever your
        field software emits when a job is completed or an invoice is paid.
      </p>
      <Code>{`URL      ${INGEST}
Method   POST
Headers  x-api-key: rvn_your_key_here
         Content-Type: application/json

{
  "customer_first_name": "Dana",
  "customer_email": "dana@example.com",
  "customer_phone": "+1 555 0100",
  "service_description": "Water heater replacement",
  "amount_paid": 1840,
  "technician_name": "Marco",
  "external_id": "jobber-job-88421"
}`}</Code>
      <p className="mt-3 text-sm text-muted-foreground">
        Only <code>customer_first_name</code> plus one of <code>customer_email</code> or{" "}
        <code>customer_phone</code> are required. Send <code>external_id</code> if you can: it is what stops a
        retrying Zap from scheduling the same ask twice.
      </p>

      <h3 className="mt-6 text-sm font-semibold text-foreground">What comes back</h3>
      <Code>{`202 Accepted
{
  "ok": true,
  "trigger_id": "…",
  "status": "scheduled",
  "scheduled_send_at": "2026-07-29T18:00:00.000Z"
}`}</Code>
      <p className="mt-3 text-sm text-muted-foreground">
        <code>400</code> means the payload failed validation and the response names the field. <code>401</code> is a
        bad or revoked key. <code>403</code> means the attestation is missing. <code>429</code> means you have gone
        past 120 jobs in an hour on that key. Nothing is coerced or guessed: a malformed email is rejected rather
        than mailed.
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        A job with no email address is recorded but not scheduled. Revvin never sends SMS on your behalf, so the
        text ask stays device-native: you tap it from your own phone in the dashboard.
      </p>

      <h2 className="mt-10 text-lg font-semibold text-foreground">Outbound: Revvin tells you</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        In Zapier, create a Zap with the trigger <strong>Webhooks by Zapier, Catch Raw Hook</strong>, copy the URL
        it gives you, and paste it into Integrations, Outbound webhooks. Pick your events.
      </p>
      <Code>{`lead.created   a new referral lead arrived
deal.closed    a lead moved to closed won
reward.paid    a referrer reward was marked paid`}</Code>
      <Code>{`POST your-url
X-Revvin-Event:      lead.created
X-Revvin-Delivery:   <uuid, unique per delivery>
X-Revvin-Timestamp:  1774804800
X-Revvin-Signature:  sha256=<hex>

{
  "id": "<delivery uuid>",
  "event": "lead.created",
  "created_at": "2026-07-29T16:00:00.000Z",
  "business_id": "…",
  "data": { "lead_id": "…", "status": "new", "created_at": "…" }
}`}</Code>
      <p className="mt-3 text-sm text-muted-foreground">
        Payloads carry record IDs, not customer details, unless you switch that on for the endpoint. If you do, the
        lead's name, email and phone travel with every matching event, and the toggle says so.
      </p>

      <h3 className="mt-6 text-sm font-semibold text-foreground">Verifying the signature</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Compute HMAC-SHA256 over <code>{`{timestamp}.{raw body}`}</code> with your endpoint secret and compare it to
        the header. Reject anything with a timestamp more than five minutes old to shut down replays.
      </p>
      <Code>{`const expected = crypto
  .createHmac("sha256", process.env.REVVIN_WEBHOOK_SECRET)
  .update(\`\${timestamp}.\${rawBody}\`)
  .digest("hex");

if (\`sha256=\${expected}\` !== signatureHeader) reject();`}</Code>

      <h3 className="mt-6 text-sm font-semibold text-foreground">Retries</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Any non-2xx response, or a timeout past ten seconds, is retried with backoff up to six attempts across
        roughly half a day. Deliveries are at-least-once, so treat <code>X-Revvin-Delivery</code> as an idempotency
        key. Every attempt and its error is listed in the Integrations tab, so a broken receiver is visible rather
        than silent.
      </p>

      <p className="mt-10 text-sm text-muted-foreground">
        <Link to="/dashboard?tab=integrations" className="underline">Back to Integrations</Link>
      </p>
    </article>
  </div>
);

export default ZapierDocs;
