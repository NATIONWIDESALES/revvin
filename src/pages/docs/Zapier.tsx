import SEOHead from "@/components/SEOHead";
import { Link } from "react-router-dom";

const ZapierDocs = () => (
  <div className="min-h-screen bg-background">
    <SEOHead
      title="Zapier and integrations | Revvin"
      description="Connect job software to Revvin through Zapier or the API so a completed job can schedule an automatic email ask."
      path="/docs/zapier"
    />

    <article className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">Zapier and integrations</h1>
      <p className="mt-3 text-muted-foreground">
        Connect tools that work with Zapier to Revvin through Webhooks by Zapier, or use a Revvin API key. When
        your software reports a completed job, Revvin schedules the same automatic email ask as the Job done tab.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        There is no Revvin app in the Zapier directory. Use Webhooks by Zapier with the endpoint and API key shown
        in your Integrations tab. You can also <Link to="/how-it-works" className="underline">see how Revvin works</Link>.
      </p>
    </article>
  </div>
);

export default ZapierDocs;
