import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Inbox, Check } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface RewardRow {
  id: string;
  lead_id: string;
  referrer_name: string | null;
  referrer_contact: string | null;
  amount: number;
  status: "pending" | "paid";
  created_at: string;
  marked_paid_at: string | null;
}

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

interface Props {
  businessId: string;
}

const PayoutsPage = ({ businessId }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<RewardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "paid">("pending");
  const [editAmount, setEditAmount] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("rewards")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Could not load payouts", description: error.message, variant: "destructive" });
    setRows((data as RewardRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (user && businessId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, businessId]);

  const filtered = rows.filter((r) => r.status === tab);
  const totalPending = rows.filter((r) => r.status === "pending").reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalPaid = rows.filter((r) => r.status === "paid").reduce((s, r) => s + Number(r.amount || 0), 0);

  const saveAmount = async (id: string, raw: string, current: number) => {
    const v = Number((raw || "").replace(/[^0-9.]/g, ""));
    if (Number.isNaN(v) || v < 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    if (v === current) return;
    const { error } = await (supabase as any).from("rewards").update({ amount: v }).eq("id", id);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Amount updated" }); load(); }
  };

  const markPaid = async (id: string) => {
    const { error } = await (supabase as any)
      .from("rewards")
      .update({ status: "paid", marked_paid_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Marked as paid" }); load(); }
  };

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Total pending</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{money(totalPending)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Total paid all time</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{money(totalPaid)}</p>
        </div>
      </div>

      <div className="inline-flex gap-1 rounded-lg border border-border p-1 text-xs">
        {(["pending", "paid"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-md transition ${tab === t ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t === "pending" ? `Pending (${rows.filter((r) => r.status === "pending").length})` : `Paid (${rows.filter((r) => r.status === "paid").length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Inbox className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            When a referred lead is marked Won, the reward you owe shows up here.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Referrer</th>
                  <th className="text-left px-4 py-3 font-medium">Amount</th>
                  <th className="text-left px-4 py-3 font-medium">Created</th>
                  {tab === "paid" && <th className="text-left px-4 py-3 font-medium">Paid on</th>}
                  {tab === "pending" && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{r.referrer_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.referrer_contact || ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      {tab === "pending" ? (
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">$</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            defaultValue={r.amount ?? 0}
                            className="h-8 w-28"
                            onChange={(e) => setEditAmount((p) => ({ ...p, [r.id]: e.target.value }))}
                            onBlur={(e) => saveAmount(r.id, e.target.value, Number(r.amount || 0))}
                          />
                        </div>
                      ) : (
                        <span className="font-medium text-foreground">{money(Number(r.amount || 0))}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    {tab === "paid" && (
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {r.marked_paid_at ? new Date(r.marked_paid_at).toLocaleDateString() : ""}
                      </td>
                    )}
                    {tab === "pending" && (
                      <td className="px-4 py-3 text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Check className="mr-1.5 h-3.5 w-3.5" /> Mark as paid
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirm reward paid</AlertDialogTitle>
                              <AlertDialogDescription>
                                Confirm you have paid this reward directly to your referrer. Revvin records this but does not move money.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => markPaid(r.id)}>Confirm</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        You pay referrers directly. Revvin never handles reward money.
      </p>
    </div>
  );
};

export default PayoutsPage;