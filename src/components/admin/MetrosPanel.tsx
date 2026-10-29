import { useEffect, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface AdminMetro { id: string; name: string; slug: string; is_live: boolean; launched_at: string | null; eligible: number }
export const METRO_TARGET = 15;

/** Admin only: eligible businesses per metro and the live switch. */
const MetrosPanel = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<AdminMetro[] | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const load = () => void supabase.rpc("fn_admin_metros" as never).then(({ data }) => setRows(((data as unknown) as AdminMetro[]) ?? []));
  useEffect(load, []);

  const toggle = async (m: AdminMetro, next: boolean) => {
    setSaving(m.id);
    const { error } = await supabase.from("metros" as never).update({ is_live: next } as never).eq("id", m.id);
    setSaving(null);
    if (error) toast({ title: "Could not update", description: "Only admins can change this.", variant: "destructive" });
    else { toast({ title: next ? `${m.name} is live` : `${m.name} is off` }); load(); }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-base font-bold"><MapPin className="h-4 w-4 text-primary" /> Metros</h2>
      {!rows ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (
        <ul className="divide-y divide-border">
          {rows.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="font-medium text-foreground">{m.name} <span className="text-xs text-muted-foreground">/earn/{m.slug}</span></p>
                <p className="text-sm text-muted-foreground">{m.eligible} eligible businesses · Target: {METRO_TARGET}</p>
              </div>
              <Switch aria-label={`${m.name} live`} checked={m.is_live} disabled={saving === m.id} onCheckedChange={(v) => void toggle(m, v)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
export default MetrosPanel;
