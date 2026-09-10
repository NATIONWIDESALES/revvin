import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Loader2, Receipt } from "lucide-react";

interface PaymentRow {
  id: string;
  paid_at: string;
  amount_paid_cents: number;
  currency: string;
  kind: string;
  billing_reason: string | null;
}

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents || 0) / 100);

const reasonLabel = (row: PaymentRow) => {
  if (row.kind === "launch_package") return "Launch Package";
  switch (row.billing_reason) {
    case "subscription_create":
      return "Pro started";
    case "subscription_cycle":
      return "Pro renewal";
    case "subscription_update":
      return "Plan change";
    default:
      return "Revvin Pro";
  }
};

/**
 * Payment history for the signed in owner, read from the server invoice
 * ledger. Amounts shown here are only what Revvin charged for Pro. Rewards
 * paid to referrers live in the Payouts tab and are paid directly by the
 * business.
 */
const BillingHistoryCard = ({ className = "" }: { className?: string }) => {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error: fnError } = await supabase.functions.invoke("billing-history");
    if (fnError) {
      setError(friendlyError(fnError));
      setRows([]);
    } else {
      setRows(((data as { payments?: PaymentRow[] } | null)?.payments ?? []) as PaymentRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className={`rounded-2xl border border-border bg-card p-6 ${className}`}>
      <div className="mb-1 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">Payment history</h3>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
        </Button>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Every Revvin charge that cleared, straight from our payment records. Rewards you pay referrers are in the Payouts tab.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading
        </div>
      ) : error ? (
        <p className="py-4 text-sm text-muted-foreground">{error}</p>
      ) : rows.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          <Receipt className="h-4 w-4" /> No charges yet.
        </div>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{reasonLabel(row)}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(row.paid_at).toLocaleDateString()}
                </p>
              </div>
              <span className="shrink-0 font-medium text-foreground">{money(row.amount_paid_cents)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default BillingHistoryCard;
