import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Save, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const ProfileEdit = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    city: "",
    state: "",
    bio: "",
    avatar_url: "",
  });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setForm({
          full_name: data.full_name ?? "",
          phone: data.phone ?? "",
          city: data.city ?? "",
          state: data.state ?? "",
          bio: data.bio ?? "",
          avatar_url: data.avatar_url ?? "",
        });
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name || null,
        phone: form.phone || null,
        city: form.city || null,
        state: form.state || null,
        bio: form.bio || null,
        avatar_url: form.avatar_url || null,
      })
      .eq("user_id", user.id);

    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    }
  };

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="container max-w-2xl">
        <Button variant="ghost" size="sm" className="mb-6 gap-1" asChild>
          <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /> Back to Dashboard</Link>
        </Button>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Edit Profile</h1>
              <p className="text-sm text-muted-foreground">Update your personal information</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
              <div>
                <Label>Full Name</Label>
                <Input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} placeholder="Your name" className="mt-1" />
              </div>

              <div>
                <Label>Avatar URL</Label>
                <Input value={form.avatar_url} onChange={(e) => update("avatar_url", e.target.value)} placeholder="https://..." className="mt-1" />
                {form.avatar_url && (
                  <img src={form.avatar_url} alt="Avatar preview" className="mt-2 h-16 w-16 rounded-full object-cover border border-border" />
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="e.g. Vancouver" className="mt-1" />
                </div>
                <div>
                  <Label>Province / State</Label>
                  <Input value={form.state} onChange={(e) => update("state", e.target.value)} placeholder="e.g. BC" className="mt-1" />
                </div>
              </div>

              <div>
                <Label>Phone</Label>
                <Input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="(555) 123-4567" className="mt-1" />
              </div>

              <div>
                <Label>Bio</Label>
                <Textarea value={form.bio} onChange={(e) => update("bio", e.target.value)} placeholder="Tell us about yourself..." rows={3} className="mt-1" />
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full gap-2" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfileEdit;
