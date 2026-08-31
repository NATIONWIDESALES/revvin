import SEOHead from "@/components/SEOHead";
import { Link } from "react-router-dom";

const ZapierDocs = () => (
  <div className="min-h-screen bg-background">
    <SEOHead
      title="Zapier and integrations | Revvin"
      description="Zapier, webhooks and API integrations are not available in Revvin yet."
      path="/docs/zapier"
    />

    <article className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">Zapier and integrations</h1>
      <p className="mt-3 text-muted-foreground">
        Zapier, webhook and API integrations are not available yet. Today, jobs are marked done by hand in your
        dashboard, and every ask goes out from your own phone or email app, so it always comes from you.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        If an integration matters to how you work, tell us at{" "}
        <a href="mailto:info@revvin.co" className="underline">info@revvin.co</a> and we will factor it into what
        gets built next. You can also <Link to="/how-it-works" className="underline">see how Revvin works today</Link>.
      </p>
    </article>
  </div>
);

export default ZapierDocs;
