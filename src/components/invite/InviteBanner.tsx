import { Ticket } from "lucide-react";
import { INVITE_TERMS } from "@/lib/invite";

/**
 * Honest invite banner. No validation tick: the code is only truly checked at
 * checkout, so the wording says "applied at checkout" and states month four.
 *
 * `compact` renders a single line above the form. The full terms then render
 * separately (see InviteTerms) below the submit button, which is the real
 * commit point.
 */
const InviteBanner = ({
  code,
  className = "",
  compact = false,
}: {
  code: string;
  className?: string;
  compact?: boolean;
}) => {
  if (compact) {
    return (
      <p
        className={`flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-[13px] font-medium text-foreground ${className}`}
      >
        <Ticket className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
        <span>
          Invite <span className="font-mono">{code}</span> applied &middot; 3 months free, then $17/month
        </span>
      </p>
    );
  }

  return (
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
};

/** Full invite disclosure. Rendered below the submit button. */
export const InviteTerms = ({ className = "" }: { className?: string }) => (
  <p className={`text-[11px] leading-relaxed text-muted-foreground ${className}`}>{INVITE_TERMS}</p>
);

export default InviteBanner;
