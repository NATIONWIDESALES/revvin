import { ShieldCheck, XCircle, Wallet, Database } from "lucide-react";

const items = [
  { icon: XCircle, label: "Cancel anytime" },
  { icon: ShieldCheck, label: "No contract" },
  { icon: Wallet, label: "No setup fee" },
  { icon: Database, label: "Your data is kept if you cancel" },
];

const RiskReversalStrip = ({ className = "" }: { className?: string }) => {
  return (
    <div
      className={`rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5 ${className}`}
      role="list"
      aria-label="Risk-free guarantees"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map(({ icon: Icon, label }) => (
          <div
            key={label}
            role="listitem"
            className="flex items-center gap-2.5 text-xs font-medium text-foreground sm:text-sm"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="leading-tight">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RiskReversalStrip;