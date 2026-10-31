import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { friendlyError } from "@/lib/errors";
import { Shield, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface PlatformFlag {
  key: string;
  enabled: boolean;
  updated_at: string;
}

interface SecurityAlert {
  id: string;
  alert_type: string;
  summary: string;
  sent_at: string;
}

const FLAG_LABELS: Record<string, { label: string; description: string }> = {
  signups_paused: {
    label: "Pause signups",
    description: "New account creation is refused while this is on. Existing users are not affected.",
  },
  outbound_email_paused: {
    label: "Pause outbound email",
    description: "No email is sent while this is on. Queued messages send once the pause is lifted.",
  },
};

/** Kill switches and recent security alerts. All changes go through the
 * sa-data admin function, which checks the admin role server side. */
const SecurityPanel = () => {
  const { toast } = useToast();
  const [flags, setFlags] = useState<PlatformFlag[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const callAdmin = useCallback(async (action: string, body?: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not signed in");
    const res = await supabase.functions.invoke(`sa-data?action=${action}`, {
      method: body ? "POST" : "GET",
      headers: { Authorization: `Bearer ${session.access_token}` },
      body,
    });
    if (res.error) throw res.error;
    return res.data;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [flagsRes, alertsRes] = await Promise.all([
        callAdmin("get_flags"),
        callAdmin("get_security_alerts"),
      ]);
      setFlags(flagsRes?.flags ?? []);
      setAlerts(alertsRes?.alerts ?? []);
    } catch (e) {
      toast({ title: "Could not load security settings", description: friendlyError(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [callAdmin, toast]);

  useEffect(() => { void load(); }, [load]);

  const setFlag = async (key: string, enabled: boolean) => {
    setSaving(key);
    try {
      await callAdmin("set_flag", { key, enabled });
      setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, enabled } : f)));
      toast({ title: enabled ? "Switch is on" : "Switch is off", description: FLAG_LABELS[key]?.label ?? key });
    } catch (e) {
      toast({ title: "Could not change the switch", description: friendlyError(e), variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-40 w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Shield className="h-4 w-4" /> Kill switches</h2>
          <p className="text-sm text-muted-foreground">
            Emergency controls. They take effect server side within a minute and are logged with your account.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {flags.map((flag) => {
            const meta = FLAG_LABELS[flag.key] ?? { label: flag.key, description: "" };
            return (
              <div key={flag.key} className="flex items-center justify-between gap-4 rounded-lg border p-4">
                <div>
                  <p className="font-medium">{meta.label}</p>
                  <p className="text-sm text-muted-foreground">{meta.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Last changed {format(new Date(flag.updated_at), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
                <Button
                  variant={flag.enabled ? "destructive" : "outline"}
                  disabled={saving === flag.key}
                  onClick={() => void setFlag(flag.key, !flag.enabled)}
                >
                  {saving === flag.key && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {flag.enabled ? "On. Click to turn off" : "Off. Click to turn on"}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 text-lg font-semibold"><AlertTriangle className="h-4 w-4" /> Recent security alerts</h2>
          <p className="text-sm text-muted-foreground">
            The security monitor checks every 15 minutes and emails info@revvin.co when something is unusual.
          </p>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No alerts yet. That is a good sign.</p>
          ) : (
            <ul className="space-y-3">
              {alerts.map((alert) => (
                <li key={alert.id} className="flex items-start justify-between gap-4 rounded-lg border p-3">
                  <div>
                    <Badge variant="outline" className="mb-1">{alert.alert_type}</Badge>
                    <p className="text-sm">{alert.summary}</p>
                  </div>
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {format(new Date(alert.sent_at), "MMM d, h:mm a")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityPanel;
