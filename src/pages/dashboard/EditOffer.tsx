import { useState, useEffect } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, MapPin } from "lucide-react";
import { categories, RESTRICTED_CATEGORIES } from "@/lib/offerUtils";

const EditOffer = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Services",
    payout: "",
    location: "",
    dealSizeMin: "",
    dealSizeMax: "",
    closeTimeDays: "",
    remoteEligible: false,
    qualificationCriteria: "",
    country: "US" as "US" | "CA",
  });

  useEffect(() => {
    if (!user || !id) return;
    const load = async () => {
      const { data, error } = await supabase
        .from("offers")
        .select("*, businesses(user_id)")
        .eq("id", id)
        .limit(1);

      const offer = data?.[0];
      if (error || !offer || (offer as any).businesses?.user_id !== user.id) {
        toast({ title: "Not found", description: "Offer not found or you don't have access.", variant: "destructive" });
        navigate("/dashboard");
        return;
      }

      setForm({
        title: offer.title || "",
        description: offer.description || "",
        category: offer.category || "Services",
        payout: String(offer.payout || ""),
        location: offer.location || "",
        dealSizeMin: offer.deal_size_min ? String(offer.deal_size_min) : "",
        dealSizeMax: offer.deal_size_max ? String(offer.deal_size_max) : "",
        closeTimeDays: offer.close_time_days ? String(offer.close_time_days) : "",
        remoteEligible: offer.remote_eligible || false,
        qualificationCriteria: offer.qualification_criteria || "",
        country: (offer.country === "CA" ? "CA" : "US") as "US" | "CA",
      });
      setLoading(false);
    };
    load();
  }, [user, id]);

  const update = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    const payoutNum = parseFloat(form.payout);
    if (!Number.isFinite(payoutNum) || payoutNum <= 0) {
      toast({ title: "Invalid payout", description: "Payout must be greater than $0.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("offers")
        .update({
          title: form.title.trim(),
          description: form.description.trim(),
          category: form.category,
          payout: payoutNum,
          location: form.location.trim(),
          country: form.country,
          currency: form.country === "CA" ? "CAD" : "USD",
          deal_size_min: form.dealSizeMin ? parseFloat(form.dealSizeMin) : null,
          deal_size_max: form.dealSizeMax ? parseFloat(form.dealSizeMax) : null,
          close_time_days: form.closeTimeDays ? parseInt(form.closeTimeDays) : null,
          remote_eligible: form.remoteEligible,
          qualification_criteria: form.qualificationCriteria.trim() || null,
          approval_status: RESTRICTED_CATEGORIES.includes(form.category) ? "pending_approval" : "approved",
        })
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Offer updated", description: "Your changes are live." });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save changes", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="py-8">
      <div className="container max-w-3xl">
        <Button variant="ghost" size="sm" className="mb-6 gap-1" asChild>
          <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /> Back to Dashboard</Link>
        </Button>

        <h1 className="font-display text-2xl font-bold text-foreground mb-2">Edit Offer</h1>
        <p className="text-muted-foreground mb-6">Update your referral offer details. Active referrals keep their original terms.</p>

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
          <div>
            <Label>Offer Title</Label>
            <Input value={form.title} onChange={(e) => update("title", e.target.value)} required className="mt-1" />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={4} className="mt-1" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Category</Label>
              <select value={form.category} onChange={(e) => update("category", e.target.value)} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                {categories.filter((c) => c !== "All").map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
            <div>
              <Label>Service Location</Label>
              <Input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="e.g. Los Angeles, CA" className="mt-1" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Country</Label>
              <div className="mt-1 flex gap-2">
                <Button type="button" variant={form.country === "US" ? "default" : "outline"} size="sm" onClick={() => update("country", "US")} className="flex-1">🇺🇸 USA</Button>
                <Button type="button" variant={form.country === "CA" ? "default" : "outline"} size="sm" onClick={() => update("country", "CA")} className="flex-1">🇨🇦 Canada</Button>
              </div>
            </div>
            <div>
              <Label>Payout Amount ($)</Label>
              <Input type="number" value={form.payout} onChange={(e) => update("payout", e.target.value)} required className="mt-1" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div><Label>Deal Size Min ($)</Label><Input type="number" value={form.dealSizeMin} onChange={(e) => update("dealSizeMin", e.target.value)} className="mt-1" /></div>
            <div><Label>Deal Size Max ($)</Label><Input type="number" value={form.dealSizeMax} onChange={(e) => update("dealSizeMax", e.target.value)} className="mt-1" /></div>
            <div><Label>Est. Close Time (days)</Label><Input type="number" value={form.closeTimeDays} onChange={(e) => update("closeTimeDays", e.target.value)} className="mt-1" /></div>
          </div>

          <div>
            <Label>Qualification Criteria</Label>
            <Textarea value={form.qualificationCriteria} onChange={(e) => update("qualificationCriteria", e.target.value)} rows={3} className="mt-1" />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="remote" checked={form.remoteEligible} onChange={(e) => update("remoteEligible", e.target.checked)} className="rounded" />
            <Label htmlFor="remote" className="cursor-pointer">Remote eligible</Label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => navigate("/dashboard")}>Cancel</Button>
            <Button type="submit" className="flex-1 gap-2" disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditOffer;
