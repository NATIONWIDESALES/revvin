import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCountry } from "@/contexts/CountryContext";
import { CheckCircle2, Wallet, Building2 } from "lucide-react";

const PayoutMethodSetup = () => {
  const { country } = useCountry();
  const [selected, setSelected] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isCA = country === "CA" || country === "ALL";
  const isUS = country === "US" || country === "ALL";

  const methods = [
    ...(isCA
      ? [
          { id: "interac", label: "Interac e-Transfer", country: "🇨🇦", note: "Fastest for Canadian referrers", speed: "Instant" },
          { id: "eft_ca", label: "Direct Deposit (EFT)", country: "🇨🇦", note: "Canadian bank account", speed: "1-3 days" },
        ]
      : []),
    ...(isUS
      ? [
          { id: "ach", label: "ACH / Direct Deposit", country: "🇺🇸", note: "US bank account", speed: "1-3 days" },
        ]
      : []),
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-base font-bold flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" /> Payout Method
        </h3>
        {saved && (
          <Badge className="bg-earnings/10 text-earnings border-0 gap-1">
            <CheckCircle2 className="h-3 w-3" /> Configured
          </Badge>
        )}
      </div>

      {saved ? (
        <div className="flex items-center gap-3 rounded-xl bg-earnings/5 border border-earnings/20 p-3">
          <Building2 className="h-5 w-5 text-earnings" />
          <div>
            <p className="text-sm font-medium">
              {methods.find((m) => m.id === selected)?.label}
            </p>
            <p className="text-xs text-muted-foreground">
              {methods.find((m) => m.id === selected)?.country} •{" "}
              {methods.find((m) => m.id === selected)?.speed}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-xs"
            onClick={() => setSaved(false)}
          >
            Change
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {methods.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelected(m.id)}
                className={`w-full flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                  selected === m.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <Building2 className={`h-5 w-5 ${selected === m.id ? "text-primary" : "text-muted-foreground"}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{m.country} {m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.note} • {m.speed}</p>
                </div>
              </button>
            ))}
          </div>
          <Button
            className="w-full"
            disabled={!selected}
            onClick={() => setSaved(true)}
          >
            Save Payout Method
          </Button>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            Payout preferences saved for processing
          </p>
        </>
      )}
    </div>
  );
};

export default PayoutMethodSetup;
