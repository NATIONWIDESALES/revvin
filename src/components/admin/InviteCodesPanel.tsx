import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy } from "lucide-react";

type InviteCode = {
  id: string;
  code: string;
  label: string;
  trial_days: number;
  max_uses: number | null;
  uses: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
};

type Redemption = {
  id: string;
  invite_code_id: string;
  business_id: string | null;
  redeemed_at: string;
};

/** Internal tool: create, share, and retire invite codes. Plain table on purpose. */
const InviteCodesPanel = () => {
  const { toast } = useToast();
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [bizNames, setBizNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [trialDays, setTrialDays] = useState("90");

  const load = async () => {
    const [{ data: codeRows }, { data: redRows }] = await Promise.all([
      supabase.from("invite_codes").select("*").order("created_at", { ascending: false }),
      supabase.from("invite_redemptions").select("*").order("redeemed_at", { ascending: false }),
    ]);
    setCodes((codeRows as InviteCode[]) ?? []);
    const reds = (redRows as Redemption[]) ?? [];
    setRedemptions(reds);
    const ids = [...new Set(reds.map((r) => r.business_id).filter(Boolean))] as string[];
    if (ids.length) {
      const { data: bizRows } = await supabase.from("businesses").select("id, name").in("id", ids);
      setBizNames(Object.fromEntries((bizRows ?? []).map((b: any) => [b.id, b.name])));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    const normalized = code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,40}$/.test(normalized)) {
      toast({ title: "Invalid code", description: "3 to 40 characters: letters, numbers, dashes.", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("invite_codes").insert({
      code: normalized,
      label: label.trim(),
      trial_days: Number(trialDays) || 90,
      max_uses: maxUses.trim() ? Number(maxUses) : null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      created_by: userData.user?.id ?? null,
    });
    setBusy(false);
    if (error) {
      toast({ title: "Could not create code", description: error.message, variant: "destructive" });
      return;
    }
    setCode(""); setLabel(""); setMaxUses(""); setExpiresAt(""); setTrialDays("90");
    toast({ title: "Code created" });
    load();
  };

  const deactivate = async (id: string) => {
    const { error } = await supabase.from("invite_codes").update({ active: false }).eq("id", id);
    if (error) { toast({ title: "Could not deactivate", description: error.message, variant: "destructive" }); return; }
    load();
  };

  const copyLink = async (c: string) => {
    const link = `${window.location.origin}/i/${c}`;
    try {
      await navigator.clipboard.writeText(link);
      toast({ title: "Link copied", description: link });
    } catch {
      toast({ title: "Copy failed", description: link, variant: "destructive" });
    }
  };

  const statusOf = (c: InviteCode) => {
    if (!c.active) return "inactive";
    if (c.expires_at && new Date(c.expires_at) < new Date()) return "expired";
    if (c.max_uses !== null && c.uses >= c.max_uses) return "used up";
    return "active";
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">Invite codes</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Each redemption gives 3 months free, then $17/month USD. Monthly only. Card is collected at checkout.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-5">
        <div>
          <Label htmlFor="ic-code">Code</Label>
          <Input id="ic-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="FOUNDER3" className="mt-1 font-mono" />
        </div>
        <div>
          <Label htmlFor="ic-label">Label</Label>
          <Input id="ic-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Who it is for" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="ic-max">Max uses</Label>
          <Input id="ic-max" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} inputMode="numeric" placeholder="blank = unlimited" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="ic-exp">Expires</Label>
          <Input id="ic-exp" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="ic-trial">Trial days</Label>
          <Input id="ic-trial" value={trialDays} onChange={(e) => setTrialDays(e.target.value)} inputMode="numeric" className="mt-1" />
        </div>
      </div>
      <Button onClick={create} disabled={busy} className="mt-3">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create code"}
      </Button>

      {loading ? (
        <div className="mt-6 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : codes.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No invite codes yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-4">Code</th>
                <th className="py-2 pr-4">Label</th>
                <th className="py-2 pr-4">Uses</th>
                <th className="py-2 pr-4">Trial</th>
                <th className="py-2 pr-4">Expires</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => {
                const reds = redemptions.filter((r) => r.invite_code_id === c.id);
                return (
                  <tr key={c.id} className="border-b border-border/60 align-top">
                    <td className="py-2 pr-4 font-mono">{c.code}</td>
                    <td className="py-2 pr-4">{c.label || "-"}</td>
                    <td className="py-2 pr-4">{c.uses}{c.max_uses !== null ? ` / ${c.max_uses}` : ""}</td>
                    <td className="py-2 pr-4">{c.trial_days}d</td>
                    <td className="py-2 pr-4">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "-"}</td>
                    <td className="py-2 pr-4">{statusOf(c)}</td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => copyLink(c.code)}>
                          <Copy className="mr-1 h-3 w-3" /> Copy link
                        </Button>
                        {c.active && (
                          <Button size="sm" variant="ghost" onClick={() => deactivate(c.id)}>Deactivate</Button>
                        )}
                      </div>
                      {reds.length > 0 && (
                        <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                          {reds.map((r) => (
                            <li key={r.id}>
                              {r.business_id ? bizNames[r.business_id] ?? r.business_id.slice(0, 8) : "pending business"}
                              {" - "}
                              {new Date(r.redeemed_at).toLocaleString()}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default InviteCodesPanel;
