import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2 } from "lucide-react";

interface Props {
  trigger: React.ReactNode;
}

export default function CallbackRequestDialog({ trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ name: "", business_name: "", email: "", phone: "", city: "", help_with: "" });

  const reset = () => {
    setDone(false);
    setForm({ name: "", business_name: "", email: "", phone: "", city: "", help_with: "" });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("callback_requests").insert(form);
    setSubmitting(false);
    if (error) {
      toast({ title: "Could not send", description: error.message, variant: "destructive" });
      return;
    }
    setDone(true);
    toast({ title: "Thanks", description: "We'll be in touch within 1 business day." });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setTimeout(reset, 200); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        {done ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
            <h3 className="mt-4 text-xl font-bold text-foreground">Thanks, we'll be in touch</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              We typically respond within 1 business day.
            </p>
            <Button className="mt-6" onClick={() => setOpen(false)}>Done</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Request a callback</DialogTitle>
              <DialogDescription>
                Tell us a little about your business and what you'd like help with.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="cb-name">Your name</Label>
                  <Input id="cb-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="cb-biz">Business name</Label>
                  <Input id="cb-biz" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="cb-email">Email</Label>
                  <Input id="cb-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="cb-phone">Phone</Label>
                  <Input id="cb-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="cb-city">City</Label>
                <Input id="cb-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="cb-help">What would you like help with?</Label>
                <Textarea
                  id="cb-help"
                  rows={4}
                  value={form.help_with}
                  onChange={(e) => setForm({ ...form, help_with: e.target.value })}
                  placeholder="Setting up your profile, designing a referral campaign, reaching your existing customers…"
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full hover:bg-primary-deep">
                {submitting ? "Sending…" : "Request a callback"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}