import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

type Failure = { id: string; created_at: string; step: string; business: string; message: string };

export default function FailuresPanel() {
  const [rows, setRows] = useState<Failure[]>([]);
  const [error, setError] = useState(false);
  const load = async () => {
    try {
      const { data, error: failed } = await supabase.rpc("fn_admin_failures");
      setError(!!failed);
      if (!failed) setRows(data as unknown as Failure[]);
    } catch { setError(true); }
  };
  useEffect(() => { void load(); }, []);
  return <section className="space-y-4">
    <div className="flex items-center justify-between"><h2 className="text-base font-bold">Failures</h2>
      <Button variant="outline" size="icon" aria-label="Refresh failures" onClick={() => void load()}><RefreshCw className="h-4 w-4" /></Button>
    </div>
    {error ? <p role="alert">Could not load failures.</p> : rows.length === 0 ? <p className="text-sm text-muted-foreground">No failures recorded.</p> :
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>
        <th className="text-left p-2">Time (Pacific)</th><th className="text-left p-2">Step</th><th className="text-left p-2">Business</th><th className="text-left p-2">Message</th>
      </tr></thead><tbody>{rows.map(row => <tr key={row.id} className="border-t border-border">
        <td className="p-2 whitespace-nowrap">{new Date(row.created_at).toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}</td>
        <td className="p-2">{row.step}</td><td className="p-2">{row.business}</td><td className="p-2 break-words">{row.message}</td>
      </tr>)}</tbody></table></div>}
  </section>;
}