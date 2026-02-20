import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Send, CheckCircle2 } from "lucide-react";

interface InviteBusinessModalProps {
  trigger?: React.ReactNode;
}

const InviteBusinessModal = ({ trigger }: InviteBusinessModalProps) => {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
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
          <DialogTitle className="font-display">Invite a Business to Revvin</DialogTitle>
        </DialogHeader>
        {sent ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-earnings" />
            <h3 className="font-display text-lg font-bold">Invite Sent!</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              We'll reach out to <strong>{businessName}</strong> and let them know about Revvin.
            </p>
            <p className="mt-1 text-xs text-muted-foreground italic">
              "Your customers are being referred anyway — pay only for closed deals."
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
            <Button type="submit" className="w-full gap-2">
              <Send className="h-4 w-4" /> Send Invitation
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InviteBusinessModal;
