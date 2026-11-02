import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { friendlyError } from "@/lib/errors";
import { useAuth } from "@/contexts/AuthContext";
import { PREVIEW_TRADES } from "@/content/previewTrades";
import { suggestedReward } from "@/lib/instantPreview";
import { previewUrl, type ProspectRow } from "@/lib/prospects";
import { PROSPECT_TEXT_SCRIPT, PROSPECT_EMAIL_SUBJECT, PROSPECT_EMAIL_SCRIPT, fillScript } from "@/content/prospectScripts";
import { Copy, Loader2, Plus, Trash2, Send, Settings2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-800",
  viewed: "bg-amber-100 text-amber-800",
  claimed: "bg-green-100 text-green-800",
  removed: "bg-gray-100 text-gray-500",
  expired: "bg-gray-100 text-gray-500",
};

const emptyDraft = {
  name: "",
  trade: "roofing",
  city: "",
  region: "",
  country: "US",
  phone: "",
  website: "",
  google_place_id: "",
  suggested_reward: 100,
  headline_override: "",
  notes: "",
};
type Draft = typeof emptyDraft;

const SCRIPT_KEY = "revvin_prospect_scripts";

function loadScripts() {
  try {
    const saved = JSON.parse(localStorage.getItem(SCRIPT_KEY) || "{}");
    return {
      text: typeof saved.text === "string" && saved.text ? saved.text : PROSPECT_TEXT_SCRIPT,
      emailSubject: typeof saved.emailSubject === "string" && saved.emailSubject ? saved.emailSubject : PROSPECT_EMAIL_SUBJECT,
      email: typeof saved.email === "string" && saved.email ? saved.email : PROSPECT_EMAIL_SCRIPT,
    };
  } catch {
    return { text: PROSPECT_TEXT_SCRIPT, emailSubject: PROSPECT_EMAIL_SUBJECT, email: PROSPECT_EMAIL_SCRIPT };
  }
}

/** CRM Prospects tab. Visible to admins and the sales role; sales users see only this tab. */
const ProspectsPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<ProspectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [bulkLinks, setBulkLinks] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [scripts, setScripts] = useState(loadScripts);

  const callerName = useMemo(() => {
    const full = (user?.user_metadata?.full_name as string | undefined) ?? "";
    return full.trim().split(/\s+/)[0] || user?.email?.split("@")[0] || "";
  }, [user]);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("prospect_pages" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!error) setRows((data as unknown as ProspectRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveScripts = () => {
    try {
      localStorage.setItem(SCRIPT_KEY, JSON.stringify(scripts));
    } catch { /* storage may be disabled */ }
    toast({ title: "Scripts saved" });
  };

  const lookup = async (query: string): Promise<Partial<Draft> | null> => {
    const { data, error } = await supabase.functions.invoke("prospect-lookup", { body: { query } });
    if (error) {
      const msg = String(error.message ?? "");
      if (msg.includes("rate_limited")) toast({ title: "Slow down", description: "Lookup limit reached for this hour.", variant: "destructive" });
      else if (msg.includes("restricted")) toast({ title: "Restricted category", description: "Real estate, mortgage and insurance businesses can't be added.", variant: "destructive" });
      else toast({ title: "No match", description: "Could not find that business on Google. Fill the form manually.", variant: "destructive" });
      return null;
    }
    const d = (data as { draft?: Partial<Draft> } | null)?.draft;
    return d ?? null;
  };

  const runLookup = async () => {
    if (!lookupQuery.trim()) return;
    setLookupBusy(true);
    const d = await lookup(lookupQuery.trim());
    setLookupBusy(false);
    if (d) {
      setDraft((prev) => ({
        ...prev,
        ...d,
        suggested_reward: suggestedReward((d.trade as string) ?? prev.trade),
      }));
      toast({ title: "Draft filled", description: "Check the details, then save." });
    }
  };

  const save = async () => {
    if (!draft.name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    setSaveBusy(true);
    const { error } = await supabase.from("prospect_pages" as never).insert({
      name: draft.name.trim(),
      trade: draft.trade,
      city: draft.city.trim() || null,
      region: draft.region.trim() || null,
      country: draft.country,
      phone: draft.phone.trim() || null,
      website: draft.website.trim() || null,
      google_place_id: draft.google_place_id.trim() || null,
      suggested_reward: draft.suggested_reward || null,
      headline_override: draft.headline_override.trim() || null,
      notes: draft.notes.trim() || null,
      created_by: user?.id ?? null,
    } as never);
    setSaveBusy(false);
    if (error) {
      toast({ title: "Could not save", description: friendlyError(error), variant: "destructive" });
      return;
    }
    setDraft(emptyDraft);
    setLookupQuery("");
    toast({ title: "Prospect page built" });
    void load();
  };

  const bulkAdd = async () => {
    const links = bulkLinks.split(/\n+/).map((l) => l.trim()).filter(Boolean).slice(0, 25);
    if (!links.length) return;
    setBulkBusy(true);
    let added = 0;
    for (const link of links) {
      const d = await lookup(link);
      if (!d?.name) continue;
      const { error } = await supabase.from("prospect_pages" as never).insert({
        name: String(d.name).trim(),
        trade: (d.trade as string) ?? "other",
        city: d.city || null,
        region: d.region || null,
        country: d.country ?? "US",
        phone: d.phone || null,
        website: d.website || null,
        google_place_id: d.google_place_id || null,
        suggested_reward: suggestedReward((d.trade as string) ?? "other"),
        created_by: user?.id ?? null,
      } as never);
      if (!error) added++;
    }
    setBulkBusy(false);
    setBulkLinks("");
    toast({ title: `Added ${added} of ${links.length}`, description: added < links.length ? "Some links had no match or were restricted." : undefined });
    void load();
  };

  const markSent = async (row: ProspectRow) => {
    await supabase.from("prospect_pages" as never).update({ status: "sent" } as never).eq("id", row.id);
    void load();
  };

  const remove = async (row: ProspectRow) => {
    await supabase.from("prospect_pages" as never).update({ status: "removed", removed_at: new Date().toISOString() } as never).eq("id", row.id);
    toast({ title: "Removed", description: `${row.name}'s preview link no longer works.` });
    void load();
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} copied` });
    } catch {
      toast({ title: "Copy failed", description: "Select and copy it manually.", variant: "destructive" });
    }
  };

  const scriptVars = (row: ProspectRow) => ({
    business: row.name,
    link: previewUrl(row.code),
    caller: callerName,
  });

  if (loading) {
    return <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-lg font-semibold">Add a prospect</h2>
          <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}>
            <Settings2 className="mr-2 h-4 w-4" /> Scripts
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Paste a Google Maps link, or business name + city"
              value={lookupQuery}
              onChange={(e) => setLookupQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runLookup()}
            />
            <Button onClick={runLookup} disabled={lookupBusy} variant="outline">
              {lookupBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Look up"}
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="pp-name">Business name</Label>
              <Input id="pp-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="pp-trade">Trade</Label>
              <Select value={draft.trade} onValueChange={(v) => setDraft({ ...draft, trade: v, suggested_reward: suggestedReward(v) })}>
                <SelectTrigger id="pp-trade"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PREVIEW_TRADES.map((t) => <SelectItem key={t.slug} value={t.slug}>{t.label}</SelectItem>)}
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="pp-city">City</Label>
              <Input id="pp-city" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="pp-region">State / province</Label>
              <Input id="pp-region" value={draft.region} onChange={(e) => setDraft({ ...draft, region: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="pp-country">Country</Label>
              <Select value={draft.country} onValueChange={(v) => setDraft({ ...draft, country: v })}>
                <SelectTrigger id="pp-country"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">US</SelectItem>
                  <SelectItem value="CA">CA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="pp-phone">Phone</Label>
              <Input id="pp-phone" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="pp-website">Website</Label>
              <Input id="pp-website" value={draft.website} onChange={(e) => setDraft({ ...draft, website: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="pp-reward">Suggested reward (USD)</Label>
              <Input id="pp-reward" type="number" min={1} value={draft.suggested_reward} onChange={(e) => setDraft({ ...draft, suggested_reward: Number(e.target.value) || 100 })} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="pp-headline">Headline override (optional)</Label>
              <Input id="pp-headline" value={draft.headline_override} onChange={(e) => setDraft({ ...draft, headline_override: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="pp-notes">Notes (internal)</Label>
              <Textarea id="pp-notes" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <Button onClick={save} disabled={saveBusy}>
            {saveBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Build preview page
          </Button>

          <details className="rounded-lg border border-border p-4">
            <summary className="cursor-pointer text-sm font-semibold">Bulk add: paste up to 25 Google Maps links</summary>
            <Textarea
              className="mt-3"
              rows={5}
              placeholder={"One link per line"}
              value={bulkLinks}
              onChange={(e) => setBulkLinks(e.target.value)}
            />
            <Button className="mt-3" variant="outline" onClick={bulkAdd} disabled={bulkBusy}>
              {bulkBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add all
            </Button>
          </details>
        </CardContent>
      </Card>

      {showSettings && (
        <Card>
          <CardHeader><h2 className="text-lg font-semibold">Outreach scripts</h2></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="pp-script-text">Text message</Label>
              <Textarea id="pp-script-text" rows={3} value={scripts.text} onChange={(e) => setScripts({ ...scripts, text: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="pp-script-subject">Email subject</Label>
              <Input id="pp-script-subject" value={scripts.emailSubject} onChange={(e) => setScripts({ ...scripts, emailSubject: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="pp-script-email">Email body</Label>
              <Textarea id="pp-script-email" rows={7} value={scripts.email} onChange={(e) => setScripts({ ...scripts, email: e.target.value })} />
            </div>
            <p className="text-xs text-muted-foreground">Placeholders: {"{first name}"}, {"{caller}"}, {"{business}"}, {"{link}"}. Saved on this device.</p>
            <Button variant="outline" onClick={saveScripts}>Save scripts</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><h2 className="text-lg font-semibold">Prospects ({rows.length})</h2></CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 && <p className="text-sm text-muted-foreground">No prospect pages yet. Build one above.</p>}
          {rows.map((row) => (
            <div key={row.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{row.name}</p>
                <Badge className={STATUS_COLORS[row.status] ?? ""}>{row.status}</Badge>
                <span className="text-xs text-muted-foreground">
                  {row.view_count} views{row.last_viewed_at ? ` · last ${new Date(row.last_viewed_at).toLocaleDateString()}` : ""}
                  {row.claimed_business_id ? " · claimed" : ""}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {row.trade}{row.city ? ` · ${row.city}` : ""}{row.region ? `, ${row.region}` : ""} · expires {new Date(row.expires_at).toLocaleDateString()}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => copy(previewUrl(row.code), "Link")}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy link
                </Button>
                <Button size="sm" variant="outline" onClick={() => copy(fillScript(scripts.text, scriptVars(row)), "Text script")}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy text script
                </Button>
                <Button size="sm" variant="outline" onClick={() => copy(`${fillScript(scripts.emailSubject, scriptVars(row))}\n\n${fillScript(scripts.email, scriptVars(row))}`, "Email script")}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy email script
                </Button>
                {row.status === "draft" && (
                  <Button size="sm" variant="outline" onClick={() => markSent(row)}>
                    <Send className="mr-1.5 h-3.5 w-3.5" /> Mark sent
                  </Button>
                )}
                {row.status !== "removed" && row.status !== "claimed" && (
                  <Button size="sm" variant="ghost" onClick={() => remove(row)}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProspectsPanel;
