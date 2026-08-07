import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, Loader2, Plus, Trash2, KeyRound, Webhook, ExternalLink, AlertTriangle } from "lucide-react";
import { friendlyError } from "@/lib/errors";

const FUNCTIONS_BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;
const INGEST_URL = `${FUNCTIONS_BASE}/ingest-job-completed`;

const EVENTS = [
  { id: "lead.created", label: "New referral lead" },
  { id: "deal.closed", label: "Deal closed" },
  { id: "reward.paid", label: "Reward marked paid" },
];

interface ApiKey {
  id: string;
  label: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}
interface Endpoint {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  include_contact: boolean;
}
interface Delivery {
  id: string;
  event: string;
  status: string;
  attempts: number;
  response_status: number | null;
  last_error: string | null;
  created_at: string;
}

const randomKey = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return `rvn_${Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")}`;
};

const sha256Hex = async (s: string) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

const IntegrationsTab = ({ biz }: { biz: { id: string; contact_outreach_consent_at: string | null } }) => {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [keyLabel, setKeyLabel] = useState("");
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["lead.created"]);
  const [includeContact, setIncludeContact] = useState(false);
  const [freshSecret, setFreshSecret] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [k, e, d] = await Promise.all([
      supabase.from("api_keys").select("id, label, key_prefix, created_at, last_used_at, revoked_at").eq("business_id", biz.id).order("created_at", { ascending: false }),
      supabase.from("webhook_endpoints").select("id, url, events, active, include_contact").eq("business_id", biz.id).order("created_at", { ascending: false }),
      supabase.from("webhook_deliveries").select("id, event, status, attempts, response_status, last_error, created_at").eq("business_id", biz.id).order("created_at", { ascending: false }).limit(15),
    ]);
    setKeys((k.data as ApiKey[]) ?? []);
    setEndpoints((e.data as Endpoint[]) ?? []);
    setDeliveries((d.data as Delivery[]) ?? []);
    setLoading(false);
  }, [biz.id]);

  useEffect(() => { load(); }, [load]);

  const copy = (v: string, what: string) => {
    navigator.clipboard.writeText(v);
    toast({ title: `${what} copied` });
  };

  // The plaintext key never leaves this function except into the owner's
  // clipboard. Only its SHA-256 hash and a short prefix are stored.
  const createKey = async () => {
    if (!keyLabel.trim()) {
      toast({ title: "Name the key first", description: "A label like \"Zapier\" helps you know what to revoke later.", variant: "destructive" });
      return;
    }
    setBusy(true);
    const plain = randomKey();
    const { error } = await supabase.from("api_keys").insert({
      business_id: biz.id,
      label: keyLabel.trim(),
      key_prefix: plain.slice(0, 11),
      key_hash: await sha256Hex(plain),
    });
    setBusy(false);
    if (error) {
      toast({ title: "Could not create the key", description: friendlyError(error), variant: "destructive" });
      return;
    }
    setFreshKey(plain);
    setKeyLabel("");
    load();
  };

  const revokeKey = async (id: string) => {
    // Confirm the write before claiming success: a silently failed revoke would
    // leave a live key that the owner believes is dead.
    const { error } = await supabase.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    if (error) {
      toast({ title: "Could not revoke the key", description: friendlyError(error), variant: "destructive" });
      return;
    }
    toast({ title: "Key revoked" });
    load();
  };

  const addEndpoint = async () => {
    let parsed: URL;
    try {
      parsed = new URL(url.trim());
    } catch {
      toast({ title: "That is not a valid URL", variant: "destructive" });
      return;
    }
    if (parsed.protocol !== "https:") {
      toast({ title: "Use an https URL", description: "Payloads are signed but not encrypted by us.", variant: "destructive" });
      return;
    }
    if (events.length === 0) {
      toast({ title: "Pick at least one event", variant: "destructive" });
      return;
    }
    setBusy(true);
    const secret = randomKey().replace("rvn_", "whsec_");
    const { error } = await supabase.from("webhook_endpoints").insert({
      business_id: biz.id,
      url: parsed.toString(),
      secret,
      events,
      include_contact: includeContact,
    });
    setBusy(false);
    if (error) {
      toast({ title: "Could not add the endpoint", description: friendlyError(error), variant: "destructive" });
      return;
    }
    setFreshSecret(secret);
    setUrl("");
    setIncludeContact(false);
    load();
  };

  const toggleEndpoint = async (ep: Endpoint) => {
    const { error } = await supabase.from("webhook_endpoints").update({ active: !ep.active }).eq("id", ep.id);
    if (error) {
      toast({ title: ep.active ? "Could not pause the endpoint" : "Could not resume the endpoint", description: friendlyError(error), variant: "destructive" });
      return;
    }
    toast({ title: ep.active ? "Endpoint paused" : "Endpoint resumed" });
    load();
  };

  const removeEndpoint = async (id: string) => {
    const { error } = await supabase.from("webhook_endpoints").delete().eq("id", id);
    if (error) {
      toast({ title: "Could not remove the endpoint", description: friendlyError(error), variant: "destructive" });
      return;
    }
    toast({ title: "Endpoint removed" });
    load();
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground"><KeyRound className="h-4 w-4" /> API keys</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Let your field software tell Revvin when a job is finished, so the ask goes out without anyone
              remembering to log it. Same delay, same suppression list and same attestation as the Job done tab.
            </p>
          </div>
        </div>

        {!biz.contact_outreach_consent_at && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-foreground">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
            <span>
              The API will reject jobs until you complete the customer outreach attestation in the Job done tab.
              You can create keys now and they will start working straight after.
            </span>
          </div>
        )}

        <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs font-medium text-foreground">Endpoint</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-background px-2 py-1 text-xs">POST {INGEST_URL}</code>
            <Button size="sm" variant="ghost" onClick={() => copy(INGEST_URL, "URL")}><Copy className="h-3.5 w-3.5" /></Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Authenticate with a <code>x-api-key</code> header. Full payload shapes are in the{" "}
            <Link to="/docs/zapier" className="underline" target="_blank" rel="noopener noreferrer">Zapier and webhooks guide</Link>.
          </p>
        </div>

        {freshKey && (
          <div className="mt-4 rounded-lg border border-primary/40 bg-primary/5 p-3">
            <p className="text-xs font-semibold text-foreground">Copy this key now. It is not shown again.</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 break-all rounded bg-background px-2 py-1 text-xs">{freshKey}</code>
              <Button size="sm" variant="outline" onClick={() => copy(freshKey, "Key")}><Copy className="h-3.5 w-3.5" /></Button>
            </div>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => setFreshKey(null)}>I have saved it</Button>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <Label htmlFor="keyLabel" className="text-xs">Label</Label>
            <Input id="keyLabel" value={keyLabel} onChange={(e) => setKeyLabel(e.target.value)} placeholder="Jobber, Zapier, office laptop" maxLength={60} />
          </div>
          <Button onClick={createKey} disabled={busy || !keyLabel.trim()}><Plus className="mr-1.5 h-3.5 w-3.5" /> Create key</Button>
        </div>

        <div className="mt-4 space-y-2">
          {keys.length === 0 && <p className="text-xs text-muted-foreground">No keys yet.</p>}
          {keys.map((k) => (
            <div key={k.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {k.label} {k.revoked_at && <Badge variant="secondary" className="ml-1">Revoked</Badge>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {k.key_prefix}… · {k.last_used_at ? `last used ${new Date(k.last_used_at).toLocaleDateString()}` : "never used"}
                </p>
              </div>
              {!k.revoked_at && (
                <Button size="sm" variant="ghost" onClick={() => revokeKey(k.id)}><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Revoke</Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground"><Webhook className="h-4 w-4" /> Outbound webhooks</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          We post to your URL when something happens. Every request is signed with HMAC-SHA256 and carries a
          timestamp so your receiver can reject replays. Failures retry with backoff and show up below.
        </p>

        {freshSecret && (
          <div className="mt-4 rounded-lg border border-primary/40 bg-primary/5 p-3">
            <p className="text-xs font-semibold text-foreground">Signing secret. Copy it into your receiver now.</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 break-all rounded bg-background px-2 py-1 text-xs">{freshSecret}</code>
              <Button size="sm" variant="outline" onClick={() => copy(freshSecret, "Secret")}><Copy className="h-3.5 w-3.5" /></Button>
            </div>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => setFreshSecret(null)}>Done</Button>
          </div>
        )}

        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="hookUrl" className="text-xs">Destination URL</Label>
            <Input id="hookUrl" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hooks.zapier.com/hooks/catch/..." />
          </div>
          <div className="flex flex-wrap gap-3">
            {EVENTS.map((ev) => (
              <label key={ev.id} className="flex items-center gap-2 text-xs text-foreground">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5"
                  checked={events.includes(ev.id)}
                  onChange={(e) => setEvents((prev) => (e.target.checked ? [...prev, ev.id] : prev.filter((x) => x !== ev.id)))}
                />
                {ev.label} <code className="text-muted-foreground">{ev.id}</code>
              </label>
            ))}
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <Switch checked={includeContact} onCheckedChange={setIncludeContact} />
            <div className="text-xs">
              <p className="font-medium text-foreground">Include customer contact details in the payload</p>
              <p className="text-muted-foreground">
                Off by default. We send record IDs only, and you fetch the rest. Turn this on and the lead's name,
                email and phone are sent to that URL on every matching event. Only do this if you know where that
                data ends up.
              </p>
            </div>
          </div>
          <Button onClick={addEndpoint} disabled={busy || !url.trim()}><Plus className="mr-1.5 h-3.5 w-3.5" /> Add endpoint</Button>
        </div>

        <div className="mt-5 space-y-2">
          {endpoints.map((ep) => (
            <div key={ep.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{ep.url}</p>
                <p className="text-xs text-muted-foreground">
                  {ep.events.join(", ")}{ep.include_contact ? " · sends contact details" : " · IDs only"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={ep.active} onCheckedChange={() => toggleEndpoint(ep)} />
                <Button size="sm" variant="ghost" onClick={() => removeEndpoint(ep.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
          {endpoints.length === 0 && <p className="text-xs text-muted-foreground">No endpoints yet.</p>}
        </div>

        {deliveries.length > 0 && (
          <div className="mt-6">
            <h4 className="text-xs font-semibold text-foreground">Recent deliveries</h4>
            <div className="mt-2 space-y-1">
              {deliveries.map((d) => (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-border px-3 py-2 text-xs">
                  <span className="font-mono">{d.event}</span>
                  <span className="text-muted-foreground">{new Date(d.created_at).toLocaleString()}</span>
                  <span className="flex items-center gap-2">
                    <Badge variant={d.status === "delivered" ? "default" : d.status === "failed" ? "destructive" : "secondary"}>{d.status}</Badge>
                    {d.attempts > 1 && <span className="text-muted-foreground">{d.attempts} attempts</span>}
                    {d.last_error && <span className="max-w-[220px] truncate text-destructive">{d.last_error}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground">Connect with Zapier</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          There is no Revvin app in the Zapier directory yet, and you do not need one. Webhooks by Zapier talks
          to both ends of this page.
        </p>
        <Button variant="outline" size="sm" className="mt-3" asChild>
          <Link to="/docs/zapier" target="_blank" rel="noopener noreferrer">
            Read the guide <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default IntegrationsTab;
