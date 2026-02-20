import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/contexts/WalletContext";
import { useCountry } from "@/contexts/CountryContext";
import { useToast } from "@/hooks/use-toast";
import { Wallet, CreditCard, Building2, ArrowRight } from "lucide-react";

interface AddFundsModalProps {
  open: boolean;
  onClose: () => void;
}

const AddFundsModal = ({ open, onClose }: AddFundsModalProps) => {
  const { addFunds } = useWallet();
  const { country, displayCurrency, currencySymbol } = useCountry();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");

  if (!open) return null;

  const isCA = country === "CA";
  const methods = isCA
    ? [
        { id: "card", label: "Credit Card", icon: CreditCard, note: "Visa, Mastercard" },
        { id: "interac", label: "Interac e-Transfer", icon: Building2, note: "Instant" },
        { id: "eft", label: "EFT / Bank Transfer", icon: Building2, note: "1-3 business days" },
      ]
    : [
        { id: "card", label: "Credit Card", icon: CreditCard, note: "Visa, Mastercard, Amex" },
        { id: "ach", label: "ACH Bank Transfer", icon: Building2, note: "1-3 business days" },
      ];

  const handleFund = () => {
    const val = parseFloat(amount);
    if (!val || val <= 0 || !method) return;
    addFunds(val, displayCurrency);
    toast({
      title: `${currencySymbol(displayCurrency)}${val} added`,
      description: `Funded via ${methods.find((m) => m.id === method)?.label}. Balance updated.`,
    });
    setAmount("");
    setMethod("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold">Add Funds</h3>
            <p className="text-xs text-muted-foreground">
              {isCA ? "🇨🇦 Canada" : "🇺🇸 United States"} • {displayCurrency}
            </p>
          </div>
        </div>

        {/* Amount */}
        <div className="mb-4">
          <label className="text-sm font-medium mb-1.5 block">Amount ({displayCurrency})</label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="500"
            className="text-lg font-bold"
          />
          <div className="flex gap-2 mt-2">
            {[250, 500, 1000, 2500].map((amt) => (
              <Button
                key={amt}
                variant="outline"
                size="sm"
                className="flex-1 text-xs font-bold"
                onClick={() => setAmount(String(amt))}
              >
                {currencySymbol(displayCurrency)}{amt}
              </Button>
            ))}
          </div>
        </div>

        {/* Payment Method */}
        <div className="mb-5">
          <label className="text-sm font-medium mb-1.5 block">Payment Method</label>
          <div className="space-y-2">
            {methods.map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`w-full flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                  method === m.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <m.icon className={`h-5 w-5 ${method === m.id ? "text-primary" : "text-muted-foreground"}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.note}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground mb-4 flex items-center gap-1">
          <CreditCard className="h-3 w-3" /> Powered by Stripe — prototype only
        </p>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1 gap-1"
            disabled={!amount || !method}
            onClick={handleFund}
          >
            Fund Wallet <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddFundsModal;
