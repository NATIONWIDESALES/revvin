import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface StatusData {
  business_name: string;
  submitted_at: string;
  stage: string;
  reward_status: string | null;
  reward_amount: number | null;
}

const ReferralStatus = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StatusData | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data: res } = await (supabase as any).rpc("fn_get_referral_status", { p_token: token });
      setData((res as StatusData) ?? null);
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Status not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">This status link is not valid.</p>
        </div>
      </div>
    );
  }

  const money = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-start justify-center p-6">
        <div className="w-full max-w-md mt-12 rounded-2xl border border-border bg-card p-8">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Referral to</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">{data.business_name}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Submitted {new Date(data.submitted_at).toLocaleDateString()}
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Current stage</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{data.stage}</p>
            </div>
            {data.reward_status && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Reward</p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {data.reward_status}
                  {data.reward_amount != null && Number(data.reward_amount) > 0 && (
                    <span className="ml-2 text-muted-foreground text-base font-normal">{money(Number(data.reward_amount))}</span>
                  )}
                </p>
              </div>
            )}
          </div>

          <p className="mt-8 text-xs text-muted-foreground">
            This page shows only your referral's stage and reward status. The business handles payment directly.
          </p>
        </div>
      </div>
      <footer className="py-6 text-center text-xs text-muted-foreground">
        Powered by <Link to="/" className="underline hover:text-foreground">Revvin</Link>
      </footer>
    </div>
  );
};

export default ReferralStatus;