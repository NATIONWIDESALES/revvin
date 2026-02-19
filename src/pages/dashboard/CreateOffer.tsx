import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { categories } from "@/data/mockOffers";

const CreateOffer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Services",
    payout: "",
    payoutType: "flat" as "flat" | "percentage",
    location: "",
    dealSizeMin: "",
    dealSizeMax: "",
    closeTimeDays: "",
    remoteEligible: false,
    qualificationCriteria: "",
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("businesses").select("id").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) setBusinessId(data.id);
    });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setLoading(true);

    const { error } = await supabase.from("offers").insert({
      business_id: businessId,
      title: form.title,
      description: form.description,
      category: form.category,
      payout: parseFloat(form.payout),
      payout_type: form.payoutType,
      location: form.location,
      deal_size_min: form.dealSizeMin ? parseFloat(form.dealSizeMin) : null,
      deal_size_max: form.dealSizeMax ? parseFloat(form.dealSizeMax) : null,
      close_time_days: form.closeTimeDays ? parseInt(form.closeTimeDays) : null,
      remote_eligible: form.remoteEligible,
      qualification_criteria: form.qualificationCriteria || null,
    });

    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Offer created!", description: "Your referral offer is now live." });
      navigate("/dashboard");
    }
  };

  const update = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="py-8">
      <div className="container max-w-2xl">
        <Button variant="ghost" size="sm" className="mb-6 gap-1" asChild>
          <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /> Back to Dashboard</Link>
        </Button>

        <h1 className="font-display text-2xl font-bold text-foreground mb-2">Create Referral Offer</h1>
        <p className="text-muted-foreground mb-8">Define what you're willing to pay for successful referrals</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label>Offer Title</Label>
            <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Home Solar Installation" required className="mt-1" />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Describe the service and what kind of leads you're looking for..." rows={4} className="mt-1" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Category</Label>
              <select
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                {categories.filter((c) => c !== "All").map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="e.g. Los Angeles, CA" className="mt-1" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Payout Amount</Label>
              <Input type="number" value={form.payout} onChange={(e) => update("payout", e.target.value)} placeholder="500" required className="mt-1" />
            </div>
            <div>
              <Label>Payout Type</Label>
              <div className="mt-1 flex gap-2">
                <Button type="button" variant={form.payoutType === "flat" ? "default" : "outline"} size="sm" onClick={() => update("payoutType", "flat")} className="flex-1">
                  $ Flat
                </Button>
                <Button type="button" variant={form.payoutType === "percentage" ? "default" : "outline"} size="sm" onClick={() => update("payoutType", "percentage")} className="flex-1">
                  % Percentage
                </Button>
              </div>
            </div>
            <div>
              <Label>Close Time (days)</Label>
              <Input type="number" value={form.closeTimeDays} onChange={(e) => update("closeTimeDays", e.target.value)} placeholder="30" className="mt-1" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Deal Size Min ($)</Label>
              <Input type="number" value={form.dealSizeMin} onChange={(e) => update("dealSizeMin", e.target.value)} placeholder="5000" className="mt-1" />
            </div>
            <div>
              <Label>Deal Size Max ($)</Label>
              <Input type="number" value={form.dealSizeMax} onChange={(e) => update("dealSizeMax", e.target.value)} placeholder="50000" className="mt-1" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="remote" checked={form.remoteEligible} onChange={(e) => update("remoteEligible", e.target.checked)} className="rounded" />
            <Label htmlFor="remote" className="cursor-pointer">Remote eligible (referrers from anywhere can participate)</Label>
          </div>

          <div>
            <Label>Qualification Criteria (optional)</Label>
            <Textarea value={form.qualificationCriteria} onChange={(e) => update("qualificationCriteria", e.target.value)} placeholder="What makes a qualified lead?" rows={3} className="mt-1" />
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Publish Offer"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CreateOffer;
