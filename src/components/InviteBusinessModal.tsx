import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Send, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface InviteBusinessModalProps {
  trigger?: React.ReactNode;
}

const InviteBusinessModal = ({ trigger }: InviteBusinessModalProps) => {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    // Log the invite via the send-notification edge function (Resend)
    await supabase.functions.invoke("send-notification", {
      body: {
        to: businessEmail,
        subject: `You've been invited to Revvin — ${businessName}`,
        html: `<p>Hi there,</p><p>Someone thinks <strong>${businessName}</strong> should be on Revvin — a referral marketplace where you only pay for closed deals.</p><p><a href="https://revvin.lovable.app/auth?mode=signup&role=business">Create your free account →</a></p><p>— The Revvin Team</p>`,
      },
    }).catch(() => {});
    setSending(false);
    setSent(true);
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setSent(false);
      setBusinessName("");
      setBusinessEmail("");
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => v ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="gap-2">
            <Building2 className="h-4 w-4" /> Invite a Business
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a Business to Revvin</DialogTitle>
        </DialogHeader>
        {sent ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-earnings" />
            <h3 className="text-lg font-bold">Invite Sent!</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              We'll reach out to <strong>{businessName}</strong> and let them know about Revvin.
            </p>
            <p className="mt-1 text-xs text-muted-foreground italic">
              "Your customers are being referred anyway. Pay only for closed deals."
            </p>
            <Button className="mt-6" onClick={handleClose}>Done</Button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-4 pt-2">
            <div>
              <Label>Business Name</Label>
              <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. ABC Roofing" required className="mt-1" />
            </div>
            <div>
              <Label>Contact Email</Label>
              <Input type="email" value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} placeholder="owner@business.com" required className="mt-1" />
            </div>
            <p className="text-xs text-muted-foreground">
              We'll send them an invitation explaining how Revvin works and why they should list their referral program.
            </p>
            <Button type="submit" className="w-full gap-2" disabled={sending}>
              <Send className="h-4 w-4" /> {sending ? "Sending..." : "Send Invitation"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InviteBusinessModal;
