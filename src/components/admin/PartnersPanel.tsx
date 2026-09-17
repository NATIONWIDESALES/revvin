import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { friendlyError } from "@/lib/errors";
import { PRODUCT_LABELS } from "@/config/partners";
import { Download, Loader2 } from "lucide-react";

interface AdminPartner {
  id: string;
  name: string;
  email: string;
  country: string | null;
  channels: string | null;
  audience_size: string | null;
  promo_plan: string | null;
  payout_method: string;
  status: string;
  code: string | null;
  tax_form_received: boolean;
  notes: string | null;
  created_at: string;
  clicks: number;
  signups: number;
  payingCustomers: number;
  pendingCents: number;
  payableCents: number;
  paidCents: number;
  adjustmentsCents: number;
  payableBalanceCents: number;
  readyForPayout: boolean;
}

interface AdminCommission {
  id: string;
  partner_id: string;
  product: string;
  amount_collected_cents: number;
  commission_cents: number;
  paid_at: string;
  payable_at: string;
  status: string;
}

interface AdminPayout {
  id: string;
  partner_id: string;
  amount_cents: number;
  method: string;
  reference: string | null;
  paid_at: string;
}

interface AdminBusiness {
  id: string;
  name: string;
  partner_id: string | null;
  plan: string | null;
  subscription_status: string | null;
  is_published: boolean | null;
}

interface AdminPayload {
  config: { commissionRate: number; holdDays: number; minPayoutUsd: number };
  partners: AdminPartner[];
  commissions: AdminCommission[];
  payouts: AdminPayout[];
  attributedBusinesses: AdminBusiness[];
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const slugFromName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24) || "partner";

const PartnersPanel = () => {
  const { toast } = useToast();
  const [data, setData] = useState<AdminPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [codeDraft, setCodeDraft] = useState<Record<string, string>>({});
  const [payoutDraft, setPayoutDraft] = useState<Record<string, { method: string; reference: string }>>({});
  const [attrDraft, setAttrDraft] = useState<{ business: string; partner: string; note: string }>({
    business: "",
    partner: "",
    note: "",
  });

  const call = useCallback(
    async (body: Record<string, unknown>) => {
      const { data: result, error } = await supabase.functions.invoke("partner-admin", { body });
      if (error || result?.error) {
        throw new Error(result?.error || friendlyError(error));
      }
      return result;
    },
    [],
  );

  const load = useCallback(async () => {
    try {
      const result = await call({ action: "list" });
      setData(result as AdminPayload);
    } catch (e) {
      toast({ title: "Could not load partners", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [call, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (id: string, body: Record<string, unknown>, success: string) => {
    setBusyId(id);
    try {
      await call(body);
      toast({ title: success });
      await load();
    } catch (e) {
      toast({ title: "That did not work", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = async (kind: "commissions" | "payouts") => {
    try {
      const result = await call({ action: "export", kind });
      const blob = new Blob([result.csv], { type: "text/csv" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = result.filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (e) {
      toast({ title: "Export failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const applications = useMemo(
    () => (data?.partners ?? []).filter((p) => p.status === "pending"),
    [data],
  );
  const active = useMemo(
    () => (data?.partners ?? []).filter((p) => p.status !== "pending"),
    [data],
  );
  const payoutReady = useMemo(
    () => (data?.partners ?? []).filter((p) => p.status === "approved" && p.readyForPayout),
    [data],
  );
  const partnerName = (id: string) => data?.partners.find((p) => p.id === id)?.name ?? "Unknown";

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Applications */}
      <Card>
        <CardHeader className="pb-3">
          <h3 className="text-sm font-semibold text-foreground">
            Applications ({applications.length})
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          {applications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No applications waiting.</p>
          ) : (
            applications.map((p) => (
              <div key={p.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.email} - {p.country || "No country"} - {p.audience_size || "No size"} -{" "}
                      {p.payout_method}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{day(p.created_at)}</span>
                </div>
                {p.channels ? (
                  <p className="mt-3 whitespace-pre-wrap text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Channels:</span> {p.channels}
                  </p>
                ) : null}
                {p.promo_plan ? (
                  <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Plan:</span> {p.promo_plan}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Input
                    className="h-9 w-48"
                    value={codeDraft[p.id] ?? slugFromName(p.name)}
                    onChange={(e) => setCodeDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                    placeholder="partner code"
                  />
                  <Button
                    size="sm"
                    disabled={busyId === p.id}
                    onClick={() =>
                      run(
                        p.id,
                        { action: "approve", partner_id: p.id, code: codeDraft[p.id] ?? slugFromName(p.name) },
                        "Partner approved and emailed",
                      )
                    }
                  >
                    {busyId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Approve"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === p.id}
                    onClick={() => run(p.id, { action: "reject", partner_id: p.id }, "Application rejected")}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Partners */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <h3 className="text-sm font-semibold text-foreground">Partners ({active.length})</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => exportCsv("commissions")}>
              <Download className="h-3 w-3" /> Commissions CSV
            </Button>
            <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => exportCsv("payouts")}>
              <Download className="h-3 w-3" /> Payouts CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground">No partners yet.</p>
          ) : (
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-2 font-medium">Partner</th>
                  <th className="py-2 font-medium">Status</th>
                  <th className="py-2 font-medium">Code</th>
                  <th className="py-2 font-medium">Clicks</th>
                  <th className="py-2 font-medium">Signups</th>
                  <th className="py-2 font-medium">Paying</th>
                  <th className="py-2 font-medium">Pending</th>
                  <th className="py-2 font-medium">Payable</th>
                  <th className="py-2 font-medium">Paid</th>
                  <th className="py-2 font-medium">Tax form</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {active.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="py-3">
                      <p className="font-medium text-foreground">{p.name}</p>
                      <p className="text-muted-foreground">{p.email}</p>
                    </td>
                    <td className="py-3">
                      <Badge variant={p.status === "approved" ? "default" : "secondary"}>{p.status}</Badge>
                    </td>
                    <td className="py-3 text-foreground">{p.code || "Not set"}</td>
                    <td className="py-3 text-muted-foreground">{p.clicks}</td>
                    <td className="py-3 text-muted-foreground">{p.signups}</td>
                    <td className="py-3 text-muted-foreground">{p.payingCustomers}</td>
                    <td className="py-3 text-muted-foreground">{money(p.pendingCents)}</td>
                    <td className="py-3 font-medium text-foreground">{money(p.payableCents)}</td>
                    <td className="py-3 text-muted-foreground">{money(p.paidCents)}</td>
                    <td className="py-3">
                      <Switch
                        checked={p.tax_form_received}
                        onCheckedChange={(v) =>
                          run(
                            p.id,
                            { action: "set_tax_form", partner_id: p.id, tax_form_received: v },
                            v ? "Tax form recorded" : "Tax form cleared",
                          )
                        }
                      />
                    </td>
                    <td className="py-3">
                      {p.status !== "removed" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs text-destructive"
                          disabled={busyId === p.id}
                          onClick={() => run(p.id, { action: "remove", partner_id: p.id }, "Partner removed")}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Payouts due */}
      <Card>
        <CardHeader className="pb-3">
          <h3 className="text-sm font-semibold text-foreground">
            Payouts due ({payoutReady.length})
          </h3>
          <p className="text-xs text-muted-foreground">
            Payable balance of ${data?.config.minPayoutUsd ?? 50} or more, including unapplied
            adjustments.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {payoutReady.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nobody is due a payout right now.</p>
          ) : (
            payoutReady.map((p) => {
              const draft = payoutDraft[p.id] ?? { method: p.payout_method, reference: "" };
              return (
                <div key={p.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    <p className="text-sm font-semibold text-foreground">
                      {money(p.payableBalanceCents)}
                    </p>
                  </div>
                  {!p.tax_form_received ? (
                    <p className="mt-2 text-xs text-destructive">Collect a tax form first.</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Input
                      className="h-9 w-40"
                      placeholder="Method"
                      value={draft.method}
                      onChange={(e) =>
                        setPayoutDraft((d) => ({ ...d, [p.id]: { ...draft, method: e.target.value } }))
                      }
                    />
                    <Input
                      className="h-9 w-56"
                      placeholder="Reference"
                      value={draft.reference}
                      onChange={(e) =>
                        setPayoutDraft((d) => ({ ...d, [p.id]: { ...draft, reference: e.target.value } }))
                      }
                    />
                    <Button
                      size="sm"
                      disabled={busyId === p.id || !p.tax_form_received}
                      onClick={() =>
                        run(
                          p.id,
                          {
                            action: "record_payout",
                            partner_id: p.id,
                            method: draft.method,
                            reference: draft.reference,
                          },
                          "Payout recorded and receipt sent",
                        )
                      }
                    >
                      {busyId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Record payout"}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Manual attribution */}
      <Card>
        <CardHeader className="pb-3">
          <h3 className="text-sm font-semibold text-foreground">Attribute a business by hand</h3>
          <p className="text-xs text-muted-foreground">
            A note is required and is kept on the partner record.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              className="h-9 w-72"
              placeholder="Business ID"
              value={attrDraft.business}
              onChange={(e) => setAttrDraft((d) => ({ ...d, business: e.target.value }))}
            />
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={attrDraft.partner}
              onChange={(e) => setAttrDraft((d) => ({ ...d, partner: e.target.value }))}
            >
              <option value="">Clear the partner</option>
              {(data?.partners ?? [])
                .filter((p) => p.status === "approved")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
            </select>
          </div>
          <Input
            placeholder="Why are you changing this?"
            value={attrDraft.note}
            onChange={(e) => setAttrDraft((d) => ({ ...d, note: e.target.value }))}
          />
          <Button
            size="sm"
            disabled={busyId === "attr"}
            onClick={() =>
              run(
                "attr",
                {
                  action: "set_business_partner",
                  business_id: attrDraft.business,
                  partner_id: attrDraft.partner || null,
                  note: attrDraft.note,
                },
                "Attribution updated",
              )
            }
          >
            Save attribution
          </Button>
          {(data?.attributedBusinesses ?? []).length ? (
            <div className="mt-4 space-y-1 text-xs text-muted-foreground">
              {(data?.attributedBusinesses ?? []).map((b) => (
                <p key={b.id}>
                  {b.name} - {partnerName(b.partner_id ?? "")} - {b.plan ?? "free"} -{" "}
                  {b.subscription_status ?? "no subscription"} - {b.id}
                </p>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Commissions */}
      <Card>
        <CardHeader className="pb-3">
          <h3 className="text-sm font-semibold text-foreground">Recent commissions</h3>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {(data?.commissions ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No commissions recorded yet.</p>
          ) : (
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-2 font-medium">Paid</th>
                  <th className="py-2 font-medium">Partner</th>
                  <th className="py-2 font-medium">Product</th>
                  <th className="py-2 font-medium">Collected</th>
                  <th className="py-2 font-medium">Commission</th>
                  <th className="py-2 font-medium">Payable</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(data?.commissions ?? []).slice(0, 100).map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="py-2 text-muted-foreground">{day(c.paid_at)}</td>
                    <td className="py-2 text-foreground">{partnerName(c.partner_id)}</td>
                    <td className="py-2 text-muted-foreground">
                      {PRODUCT_LABELS[c.product] ?? c.product}
                    </td>
                    <td className="py-2 text-muted-foreground">{money(c.amount_collected_cents)}</td>
                    <td className="py-2 font-medium text-foreground">{money(c.commission_cents)}</td>
                    <td className="py-2 text-muted-foreground">{day(c.payable_at)}</td>
                    <td className="py-2 text-muted-foreground">{c.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Payout history */}
      <Card>
        <CardHeader className="pb-3">
          <h3 className="text-sm font-semibold text-foreground">Payout history</h3>
        </CardHeader>
        <CardContent>
          {(data?.payouts ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No payouts recorded yet.</p>
          ) : (
            <div className="space-y-1 text-xs text-muted-foreground">
              {(data?.payouts ?? []).map((p) => (
                <p key={p.id}>
                  {day(p.paid_at)} - {partnerName(p.partner_id)} - {money(p.amount_cents)} - {p.method}
                  {p.reference ? ` - ${p.reference}` : ""}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PartnersPanel;
