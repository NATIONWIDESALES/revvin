import { Ticket } from "lucide-react";
import { INVITE_TERMS } from "@/lib/invite";

/**
 * Honest invite banner. No validation tick: the code is only truly checked at
 * checkout, so the wording says "applied at checkout" and states month four.
 */
const InviteBanner = ({ code, className = "" }: { code: string; className?: string }) => (
  <div className={`rounded-xl border border-primary/30 bg-primary/5 p-4 ${className}`}>
    <div className="flex items-start gap-3">
      <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium text-foreground">
          Invite <span className="font-mono">{code}</span> held: 3 months free, then $17/month USD
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{INVITE_TERMS}</p>
      </div>
    </div>
  </div>
);

export default InviteBanner;
