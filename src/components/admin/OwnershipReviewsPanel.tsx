import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, FileText, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type RequestRow = {
  id: string; business_id: string; business_name: string; business_slug: string | null; claimant_email: string | null;
  signup_date: string; file_path: string; note: string | null; created_at: string;
  listing_name: string | null; listing_phone: string | null; listing_website: string | null;
};
type DisputeRow = {
  id: string; business_id: string; business_name: string; business_slug: string | null; claimant_email: string | null;
  signup_date: string; ownership_status: string; name: string; role: string; email: string; phone: string | null;
  details: string; file_path: string | null; prior_status: string | null; created_at: string;
  listing_name: string | null; listing_phone: string | null; listing_website: string | null;
};

export default function OwnershipReviewsPanel() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("fn_admin_ownership_queue");
    if (error) return toast({ title: "Could not load ownership reviews", description: error.message, variant: "destructive" });
    const value = data as unknown as { requests: RequestRow[]; disputes: DisputeRow[] };
    setRequests(value.requests ?? []); setDisputes(value.disputes ?? []);
  }, [toast]);
  useEffect(() => { void load(); }, [load]);

  const action = async (key: string, fn: string, args: Record<string, unknown>, title: string) => {
    setBusy(key);
    const { error } = await supabase.rpc(fn as never, args as never);
    setBusy(null);
    toast(error ? { title: "Not saved", description: error.message, variant: "destructive" } : { title });
    if (!error) await load();
  };
  const documentLink = async (path: string) => {
    const { data, error } = await supabase.storage.from("ownership-verification").createSignedUrl(path, 600);
    if (error || !data?.signedUrl) return toast({ title: "Could not open the document", variant: "destructive" });
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };
  const listingLine = (row: RequestRow | DisputeRow) => [row.listing_name, row.listing_phone, row.listing_website].filter(Boolean).join(" · ");

  return (
    <div className="space-y-6" data-testid="ownership-reviews">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-bold"><BadgeCheck className="h-4 w-4 text-primary" />Ownership reviews ({requests.length})</h2>
        <p className="mt-1 text-sm text-muted-foreground">Approve a document to confirm ownership. Rejecting releases a claimed directory listing but keeps the business account.</p>
        <div className="mt-4 space-y-3">
          {requests.length === 0 && <p className="py-4 text-sm text-muted-foreground">No open document reviews.</p>}
          {requests.map((r) => (
            <article key={r.id} className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                <div className="text-sm">
                  <p className="font-semibold">{r.business_name}</p>
                  <p className="mt-1 text-muted-foreground">Claimant: {r.claimant_email ?? "No email"} · Joined {new Date(r.signup_date).toLocaleDateString()}</p>
                  {listingLine(r) && <p className="mt-1 text-muted-foreground">Listing: {listingLine(r)}</p>}
                  {r.note && <p className="mt-2 whitespace-pre-wrap">Note: {r.note}</p>}
                  <Button type="button" variant="link" className="h-auto px-0" onClick={() => void documentLink(r.file_path)}><FileText className="mr-1 h-4 w-4" />Open document for 10 minutes</Button>
                </div>
                <div className="grid content-start gap-2 lg:min-w-64">
                  <Input aria-label={`Reject reason for ${r.business_name}`} placeholder="Reason required to reject" maxLength={1000} value={reasons[r.id] ?? ""} onChange={(e) => setReasons((x) => ({ ...x, [r.id]: e.target.value }))} />
                  <div className="flex gap-2">
                    <Button disabled={busy === r.id} onClick={() => void action(r.id, "fn_admin_ownership_review", { p_request_id: r.id, p_decision: "approved", p_reason: null }, "Ownership confirmed")}>Approve</Button>
                    <Button variant="destructive" disabled={busy === r.id || (reasons[r.id] ?? "").trim().length < 3} onClick={() => void action(r.id, "fn_admin_ownership_review", { p_request_id: r.id, p_decision: "rejected", p_reason: reasons[r.id] }, "Claim rejected")}>Reject</Button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-bold"><ShieldAlert className="h-4 w-4 text-primary" />Ownership disputes ({disputes.length})</h2>
        <div className="mt-4 space-y-3">
          {disputes.length === 0 && <p className="py-4 text-sm text-muted-foreground">No open disputes.</p>}
          {disputes.map((d) => (
            <article key={d.id} className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
              <p className="font-semibold">{d.business_name} <span className="font-normal text-muted-foreground">({d.ownership_status})</span></p>
              <p className="mt-1 text-muted-foreground">Current claimant: {d.claimant_email ?? "No email"} · Joined {new Date(d.signup_date).toLocaleDateString()}</p>
              {listingLine(d) && <p className="mt-1 text-muted-foreground">Listing: {listingLine(d)}</p>}
              <p className="mt-2">Report from {d.name}, {d.role}: {d.email}{d.phone ? ` · ${d.phone}` : ""}</p>
              <p className="mt-2 whitespace-pre-wrap">{d.details}</p>
              {d.file_path && <Button type="button" variant="link" className="h-auto px-0" onClick={() => void documentLink(d.file_path!)}><FileText className="mr-1 h-4 w-4" />Open proof for 10 minutes</Button>}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" disabled={busy === d.id} onClick={() => void action(d.id, "fn_admin_resolve_dispute", { p_dispute_id: d.id, p_action: "keep_owner" }, "Current owner kept")}>Keep current owner</Button>
                <Button variant="destructive" disabled={busy === d.id} onClick={() => void action(d.id, "fn_admin_resolve_dispute", { p_dispute_id: d.id, p_action: "release_listing" }, "Listing released")}>Remove claim and release listing</Button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
