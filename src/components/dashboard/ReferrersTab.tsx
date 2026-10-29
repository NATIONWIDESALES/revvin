import { useEffect, useState } from "react";
import { Loader2, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { copyText } from "@/lib/clipboard";

export interface BusinessReferrer {
  id: string; name: string; email: string | null; token: string;
  referrals_sent: number; referrals_closed: number; rewards_owed: number; rewards_paid: number;
}
const usd = (n: number) => `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

/** Everyone with a personal link for this business. Free and Pro. */
const ReferrersTab = ({ publicUrl }: { publicUrl: string }) => {
  const { toast } = useToast();
  const [rows, setRows] = useState<BusinessReferrer[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    void supabase.rpc("fn_business_referrers" as never).then(({ data, error: e }) => {
      if (e) setError(true);
      setRows(((data as unknown) as BusinessReferrer[]) ?? []);
    });
  }, []);
  if (!rows) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  if (error) return <p className="text-sm text-destructive">Could not load referrers. Refresh to try again.</p>;
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No referrers yet. Everyone who sends you a referral, and every customer you add, gets a personal link here.</p>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr><th className="p-3">Name</th><th className="p-3">Sent</th><th className="p-3">Closed</th><th className="p-3">Owed</th><th className="p-3">Paid</th><th className="p-3">Link</th></tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => {
            const link = `${publicUrl}?ref=${encodeURIComponent(r.token)}`;
            return (
              <tr key={r.id}>
                <td className="p-3 text-foreground">{r.name}</td>
                <td className="p-3">{r.referrals_sent}</td>
                <td className="p-3">{r.referrals_closed}</td>
                <td className="p-3">{usd(r.rewards_owed)}</td>
                <td className="p-3">{usd(r.rewards_paid)}</td>
                <td className="p-3">
                  <Button size="sm" variant="outline" aria-label={`Copy ${r.name}'s link`} onClick={() => void copyText(link).then((ok) => toast(ok ? { title: "Link copied" } : { title: "Could not copy", variant: "destructive" as const }))}>
                    <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy link
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ReferrersTab;
