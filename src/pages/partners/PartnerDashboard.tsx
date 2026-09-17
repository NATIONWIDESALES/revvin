import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import QRCodeStyling from "qr-code-styling";
import SEOHead from "@/components/SEOHead";
import SimpleQRCode from "@/components/marketplace/SimpleQRCode";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { copyText } from "@/lib/clipboard";
import { toast } from "sonner";
import { MIN_PAYOUT_USD, PARTNER_COPY, PRODUCT_LABELS } from "@/config/partners";
import { Check, Copy, Download, Loader2 } from "lucide-react";

interface DashboardData {
  partner: { name: string; code: string; link: string; taxFormReceived: boolean };
  config: { commissionRate: number; holdDays: number; minPayoutUsd: number };
  stats: { clicks30: number; clicksAllTime: number; signups: number; published: number; paying: number };
  balances: { pendingCents: number; payableCents: number; paidCents: number; adjustmentsCents: number };
  businesses: { label: string; plan: string; status: string; published: boolean }[];
  commissions: {
    id: string;
    product: string;
    amountCollectedCents: number;
    commissionCents: number;
    paidAt: string;
    status: string;
  }[];
  payouts: { amountCents: number; method: string; reference: string | null; paidAt: string }[];
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const STATUS_LABEL: Record<string, string> = {
  pending: "Clearing",
  payable: "Payable",
  paid: "Paid",
  reversed: "Reversed",
};

const PartnerDashboard = () => {
  const [params] = useSearchParams();
  const token = params.get("t") || "";
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) {
        setLoading(false);
        setNotFound(true);
        return;
      }
      const { data: payload, error } = await supabase.functions.invoke("partner-dashboard", {
        body: { token },
      });
      if (!active) return;
      setLoading(false);
      if (error || !payload?.partner) {
        setNotFound(true);
        return;
      }
      setData(payload as DashboardData);
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const link = data?.partner.link ?? "";

  const downloadQr = () => {
    if (!link) return;
    const qr = new QRCodeStyling({
      width: 1024,
      height: 1024,
      data: link,
      dotsOptions: { color: "#0F172A", type: "rounded" },
      cornersSquareOptions: { color: "#15803D", type: "extra-rounded" },
      cornersDotOptions: { color: "#15803D", type: "dot" },
      backgroundOptions: { color: "#ffffff" },
      qrOptions: { errorCorrectionLevel: "H" },
    });
    qr.download({ name: `revvin-partner-${data?.partner.code ?? "link"}`, extension: "png" });
  };

  const copy = async () => {
    const ok = await copyText(link);
    if (!ok) {
      toast.error("Could not copy the link", { description: "Select it and copy it manually." });
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stats = useMemo(
    () =>
      data
        ? [
            { label: "Clicks, last 30 days", value: data.stats.clicks30 },
            { label: "Clicks, all time", value: data.stats.clicksAllTime },
            { label: "Signups", value: data.stats.signups },
            { label: "Pages published", value: data.stats.published },
            { label: "Paying customers", value: data.stats.paying },
          ]
        : [],
    [data],
  );

  return (
    <>
      <SEOHead
        title="Partner dashboard | Revvin"
        description="Your private Revvin partner dashboard."
        path="/partners/dashboard"
        noindex
      />

      <div className="container max-w-5xl py-14">
        {loading ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your numbers
          </div>
        ) : notFound || !data ? (
          <div className="max-w-md">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              That link is not valid
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Your dashboard link may have changed. Ask for a new one from the Partner Program page.
            </p>
            <Button asChild className="mt-6">
              <Link to="/partners">Get a new link</Link>
            </Button>
          </div>
        ) : (
          <>
            <header>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Revvin Partner Program
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                {data.partner.name}
              </h1>
            </header>

            {/* Link and QR */}
            <section className="mt-8 grid gap-6 rounded-2xl border border-border bg-card p-6 md:grid-cols-[1fr_auto]">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Your personal link</h2>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <div className="flex-1 select-all truncate rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground">
                    {link}
                  </div>
                  <Button variant="outline" onClick={copy} className="gap-2 shrink-0">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Your partner code:{" "}
                  <span className="font-medium text-foreground">{data.partner.code}</span>
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Keep this page private. The link in your address bar is the only way in.
                </p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <SimpleQRCode url={link} size={150} />
                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={downloadQr}>
                  <Download className="h-3 w-3" /> Download QR
                </Button>
              </div>
            </section>

            {/* Stats */}
            <section className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {stats.map((s) => (
                <div key={s.label} className="rounded-xl border border-border bg-card p-4">
                  <p className="text-2xl font-semibold text-foreground">{s.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </section>

            {/* Balances */}
            <section className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                { label: "Pending (clearing)", value: money(data.balances.pendingCents) },
                { label: "Payable", value: money(data.balances.payableCents) },
                { label: "Paid to date", value: money(data.balances.paidCents) },
              ].map((b) => (
                <div key={b.label} className="rounded-xl border border-border bg-card p-5">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{b.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{b.value}</p>
                </div>
              ))}
            </section>
            <p className="mt-3 text-sm text-muted-foreground">{PARTNER_COPY.nextPayout}</p>
            {data.balances.adjustmentsCents !== 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Adjustments waiting to be applied: {money(data.balances.adjustmentsCents)}
              </p>
            ) : null}
            {!data.partner.taxFormReceived ? (
              <p className="mt-3 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                We need your tax form before your first payout. Reply to any Revvin email and we will
                send it over.
              </p>
            ) : null}

            {/* Businesses */}
            <section className="mt-10">
              <h2 className="text-lg font-semibold text-foreground">Businesses you referred</h2>
              {data.businesses.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Nothing yet. Share your link and they will show up here.
                </p>
              ) : (
                <div className="mt-4 overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Business</th>
                        <th className="px-4 py-3 font-medium">Plan</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.businesses.map((b) => (
                        <tr key={b.label} className="border-t border-border">
                          <td className="px-4 py-3 text-foreground">{b.label}</td>
                          <td className="px-4 py-3 text-muted-foreground">{b.plan}</td>
                          <td className="px-4 py-3 text-muted-foreground">{b.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Commissions */}
            <section className="mt-10">
              <h2 className="text-lg font-semibold text-foreground">Commissions</h2>
              {data.commissions.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Nothing yet. A commission appears the first time a business you referred pays.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Product</th>
                        <th className="px-4 py-3 font-medium">Amount collected</th>
                        <th className="px-4 py-3 font-medium">Your commission</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.commissions.map((c) => (
                        <tr key={c.id} className="border-t border-border">
                          <td className="px-4 py-3 text-muted-foreground">{day(c.paidAt)}</td>
                          <td className="px-4 py-3 text-foreground">
                            {PRODUCT_LABELS[c.product] ?? c.product}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {money(c.amountCollectedCents)}
                          </td>
                          <td className="px-4 py-3 font-medium text-foreground">
                            {money(c.commissionCents)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {STATUS_LABEL[c.status] ?? c.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Payout history */}
            <section className="mt-10">
              <h2 className="text-lg font-semibold text-foreground">Payout history</h2>
              {data.payouts.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No payouts yet.</p>
              ) : (
                <div className="mt-4 overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Amount</th>
                        <th className="px-4 py-3 font-medium">Method</th>
                        <th className="px-4 py-3 font-medium">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.payouts.map((p) => (
                        <tr key={`${p.paidAt}-${p.amountCents}`} className="border-t border-border">
                          <td className="px-4 py-3 text-muted-foreground">{day(p.paidAt)}</td>
                          <td className="px-4 py-3 font-medium text-foreground">{money(p.amountCents)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{p.method}</td>
                          <td className="px-4 py-3 text-muted-foreground">{p.reference || "Not given"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Promotion rules */}
            <section className="mt-10 rounded-2xl border border-border bg-muted/30 p-6">
              <h2 className="text-lg font-semibold text-foreground">Promotion rules</h2>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
                <li>Say clearly that you earn a commission, every time you mention Revvin.</li>
                <li>Never promise anyone income or claim results Revvin has not produced.</li>
                <li>Do not bid on Revvin or revvin.co as ad keywords.</li>
                <li>Do not sign yourself up, or sign up businesses you control.</li>
                <li>
                  Commissions clear {data.config.holdDays} days after payment. We pay on the 15th once
                  your payable balance reaches ${MIN_PAYOUT_USD}.
                </li>
              </ul>
              <p className="mt-4 text-sm">
                <Link to="/partners/terms" className="font-medium text-primary hover:underline">
                  Read the full Partner Terms
                </Link>
              </p>
            </section>
          </>
        )}
      </div>
    </>
  );
};

export default PartnerDashboard;
