import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Loader2, CheckCircle2, CreditCard } from "lucide-react";
import { motion } from "framer-motion";

const METHODS = [
  { id: "paypal", label: "PayPal", desc: "Receive payouts to your PayPal email" },
  { id: "virtual_card", label: "Virtual Prepaid Card", desc: "Delivered to your email" },
] as const;

type Method = typeof METHODS[number]["id"];

const PayoutPreferences = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [method, setMethod] = useState<Method | null>(null);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasPrefs, setHasPrefs] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("referrer_payout_preferences")
      .select("*")
      .eq("user_id", user.id)
      .limit(1)
      .then(({ data }) => {
        const pref = data?.[0];
        if (pref?.method) {
          setMethod(pref.method as Method);
          setEmail(pref.email ?? "");
          setHasPrefs(true);
        }
        setLoading(false);
      });
  }, [user]);

  const handleSave = async () => {
    if (!user || !method || !email) return;
    setSaving(true);
    const payload = { user_id: user.id, method, email };

    if (hasPrefs) {
      await supabase
        .from("referrer_payout_preferences")
        .update({ method, email })
        .eq("user_id", user.id);
    } else {
      await supabase.from("referrer_payout_preferences").insert(payload);
    }

    setHasPrefs(true);
    setEditing(false);
    setSaving(false);
    toast({ title: "Payout method saved", description: "Your earnings will be sent via your chosen method." });
  };

  if (loading) return null;

  // Show saved state
  if (hasPrefs && !editing) {
    const m = METHODS.find((m) => m.id === method);
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Payout Method</h2>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{m?.label}</p>
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          Edit
        </Button>
        <p className="text-xs text-muted-foreground mt-3">
          When your referral closes, we send your earnings via your chosen method. Most payouts arrive within 3-5 business days.
        </p>
      </div>
    );
  }

  // Edit / setup form
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Payout Method</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        {METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMethod(m.id)}
            className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all text-center ${
              method === m.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40"
            }`}
          >
            <CreditCard className={`h-5 w-5 ${method === m.id ? "text-primary" : "text-muted-foreground"}`} />
            <span className="font-medium text-sm">{m.label}</span>
            <span className="text-xs text-muted-foreground">{m.desc}</span>
          </button>
        ))}
      </div>

      {method && (
        <div className="mb-4">
          <Label>Email for payout delivery</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1"
            required
          />
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={!method || !email || saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {saving ? "Saving..." : "Save Payout Method"}
        </Button>
        {editing && (
          <Button variant="outline" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        When your referral closes, we send your earnings via your chosen method. Most payouts arrive within 3-5 business days.
      </p>
    </motion.div>
  );
};

export default PayoutPreferences;
