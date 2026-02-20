import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useWallet } from "@/contexts/WalletContext";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const PaymentSuccess = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { addFunds } = useWallet();
  const { toast } = useToast();
  const amount = Number(params.get("amount") || 0);
  const currency = params.get("currency") || "USD";

  useEffect(() => {
    if (amount > 0) {
      addFunds(amount, currency);
      toast({ title: "Payment successful", description: `${currency} ${amount} added to your wallet.` });
    }
    // only run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <CheckCircle className="h-16 w-16 text-green-500" />
      <h1 className="font-display text-2xl font-bold">Payment Successful</h1>
      <p className="text-muted-foreground">
        {amount > 0 ? `${currency} ${amount} has been added to your wallet.` : "Your payment was processed."}
      </p>
      <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
    </div>
  );
};

export default PaymentSuccess;
