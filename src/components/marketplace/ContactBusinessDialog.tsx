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
  slug: string;
  businessName: string;
  trigger: React.ReactNode;
  kind?: "contact" | "quote" | "referral";
  title?: string;
  description?: string;
}

export default function ContactBusinessDialog({
  slug,
  businessName,
  trigger,
  kind = "contact",
  title,
  description,
}: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const reset = () => {
    setDone(false);
    setName(""); setEmail(""); setPhone(""); setMessage("");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("mock_inquiries").insert({
      listing_slug: slug,
      kind,
      name: name || null,
      email: email || null,
      phone: phone || null,
      message: message || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Could not send", description: error.message, variant: "destructive" });
      return;
    }
    setDone(true);
    toast({ title: "Sent", description: `We've passed your message to ${businessName}.` });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setTimeout(reset, 200); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        {done ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
            <h3 className="mt-4 text-xl font-bold text-foreground">We'll be in touch</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {businessName} typically responds within 1 business day.
            </p>
            <Button className="mt-6" onClick={() => setOpen(false)}>Done</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{title ?? `Contact ${businessName}`}</DialogTitle>
              <DialogDescription>
                {description ?? "Send a quick message and they'll get back to you."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <Label htmlFor="ci-name">Your name</Label>
                <Input id="ci-name" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ci-email">Email</Label>
                  <Input id="ci-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="ci-phone">Phone</Label>
                  <Input id="ci-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="ci-msg">
                  {kind === "referral" ? "Who are you referring and what do they need?" : "What do you need?"}
                </Label>
                <Textarea
                  id="ci-msg"
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={kind === "referral" ? "Friend's name, what work, best way to reach them…" : "Briefly describe your project…"}
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full hover:bg-primary-deep">
                {submitting ? "Sending…" : kind === "referral" ? "Submit referral" : kind === "quote" ? "Request quote" : "Send message"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}