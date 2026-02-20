import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { WalletState, WalletTransaction } from "@/types/offer";

interface WalletContextType {
  wallet: WalletState;
  addFunds: (amount: number, currency?: string) => void;
  reserveFunds: (amount: number, referralId: string, description: string) => boolean;
  releasePayout: (amount: number, referralId: string, description: string) => void;
  refundReserve: (amount: number, referralId: string, description: string) => void;
  canCoverPayout: (amount: number) => boolean;
  loading: boolean;
}

const emptyWallet: WalletState = {
  available: 0,
  reserved: 0,
  paidOut: 0,
  platformFees: 0,
  totalFunded: 0,
  transactions: [],
};

const WalletContext = createContext<WalletContextType>({
  wallet: emptyWallet,
  addFunds: () => {},
  reserveFunds: () => false,
  releasePayout: () => {},
  refundReserve: () => {},
  canCoverPayout: () => false,
  loading: true,
});

export const useWallet = () => useContext(WalletContext);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletState>(emptyWallet);
  const [loading, setLoading] = useState(true);

  // Load wallet from DB
  useEffect(() => {
    if (!user) {
      setWallet(emptyWallet);
      setLoading(false);
      return;
    }

    const loadWallet = async () => {
      // Fetch balance
      const { data: balance } = await supabase
        .from("wallet_balances")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      // Fetch transactions
      const { data: txs } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      const transactions: WalletTransaction[] = (txs ?? []).map((tx: any) => ({
        id: tx.id,
        type: tx.type,
        amount: Number(tx.amount),
        description: tx.description,
        date: tx.created_at,
        referralId: tx.referral_id ?? undefined,
      }));

      if (balance) {
        setWallet({
          available: Number(balance.available),
          reserved: Number(balance.reserved),
          paidOut: Number(balance.paid_out),
          platformFees: Number(balance.platform_fees),
          totalFunded: Number(balance.total_funded),
          transactions,
        });
      } else {
        setWallet({ ...emptyWallet, transactions });
      }
      setLoading(false);
    };

    loadWallet();
  }, [user]);

  // Helper to persist balance + transaction
  const persistUpdate = useCallback(async (
    newBalance: Partial<WalletState>,
    tx: { type: string; amount: number; description: string; referral_id?: string }
  ) => {
    if (!user) return;

    // Upsert balance
    const balancePayload = {
      user_id: user.id,
      available: newBalance.available ?? 0,
      reserved: newBalance.reserved ?? 0,
      paid_out: newBalance.paidOut ?? 0,
      platform_fees: newBalance.platformFees ?? 0,
      total_funded: newBalance.totalFunded ?? 0,
    };

    await supabase
      .from("wallet_balances")
      .upsert(balancePayload, { onConflict: "user_id" });

    // Insert transaction
    await supabase
      .from("wallet_transactions")
      .insert({
        user_id: user.id,
        type: tx.type,
        amount: tx.amount,
        description: tx.description,
        referral_id: tx.referral_id ?? null,
      });
  }, [user]);

  const addFunds = useCallback((amount: number, currency?: string) => {
    const label = currency ? ` ${currency}` : "";
    setWallet((prev) => {
      const updated = {
        ...prev,
        available: prev.available + amount,
        totalFunded: prev.totalFunded + amount,
        transactions: [
          { id: crypto.randomUUID(), type: "topup" as const, amount, description: `Added $${amount}${label} to wallet`, date: new Date().toISOString() },
          ...prev.transactions,
        ],
      };
      persistUpdate(updated, { type: "topup", amount, description: `Added $${amount}${label} to wallet` });
      return updated;
    });
  }, [persistUpdate]);

  const canCoverPayout = useCallback((amount: number) => wallet.available >= amount, [wallet.available]);

  const reserveFunds = useCallback((amount: number, referralId: string, description: string): boolean => {
    if (wallet.available < amount) return false;
    setWallet((prev) => {
      const updated = {
        ...prev,
        available: prev.available - amount,
        reserved: prev.reserved + amount,
        transactions: [
          { id: crypto.randomUUID(), type: "reserve" as const, amount, description, date: new Date().toISOString(), referralId },
          ...prev.transactions,
        ],
      };
      persistUpdate(updated, { type: "reserve", amount, description, referral_id: referralId });
      return updated;
    });
    return true;
  }, [wallet.available, persistUpdate]);

  const releasePayout = useCallback((amount: number, referralId: string, description: string) => {
    const referrerPayout = Math.round(amount * 0.9);
    const fee = amount - referrerPayout;
    setWallet((prev) => {
      const updated = {
        ...prev,
        reserved: Math.max(0, prev.reserved - amount),
        paidOut: prev.paidOut + referrerPayout,
        platformFees: prev.platformFees + fee,
        transactions: [
          { id: crypto.randomUUID(), type: "fee" as const, amount: fee, description: `Platform fee (10%)`, date: new Date().toISOString(), referralId },
          { id: crypto.randomUUID(), type: "payout" as const, amount: referrerPayout, description, date: new Date().toISOString(), referralId },
          ...prev.transactions,
        ],
      };
      persistUpdate(updated, { type: "payout", amount: referrerPayout, description, referral_id: referralId });
      return updated;
    });
  }, [persistUpdate]);

  const refundReserve = useCallback((amount: number, referralId: string, description: string) => {
    setWallet((prev) => {
      const updated = {
        ...prev,
        available: prev.available + amount,
        reserved: Math.max(0, prev.reserved - amount),
        transactions: [
          { id: crypto.randomUUID(), type: "refund" as const, amount, description, date: new Date().toISOString(), referralId },
          ...prev.transactions,
        ],
      };
      persistUpdate(updated, { type: "refund", amount, description, referral_id: referralId });
      return updated;
    });
  }, [persistUpdate]);

  return (
    <WalletContext.Provider value={{ wallet, addFunds, reserveFunds, releasePayout, refundReserve, canCoverPayout, loading }}>
      {children}
    </WalletContext.Provider>
  );
};
