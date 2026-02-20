import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import type { WalletState, WalletTransaction } from "@/types/offer";

interface WalletContextType {
  wallet: WalletState;
  addFunds: (amount: number) => void;
  reserveFunds: (amount: number, referralId: string, description: string) => boolean;
  releasePayout: (amount: number, referralId: string, description: string) => void;
  refundReserve: (amount: number, referralId: string, description: string) => void;
  canCoverPayout: (amount: number) => boolean;
}

const defaultWallet: WalletState = {
  available: 2500,
  reserved: 0,
  totalFunded: 2500,
  transactions: [
    { id: "t1", type: "topup", amount: 2500, description: "Initial wallet funding", date: new Date(Date.now() - 7 * 86400000).toISOString() },
  ],
};

const WalletContext = createContext<WalletContextType>({
  wallet: defaultWallet,
  addFunds: () => {},
  reserveFunds: () => false,
  releasePayout: () => {},
  refundReserve: () => {},
  canCoverPayout: () => false,
});

export const useWallet = () => useContext(WalletContext);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [wallet, setWallet] = useState<WalletState>(defaultWallet);

  const addFunds = useCallback((amount: number) => {
    setWallet((prev) => ({
      ...prev,
      available: prev.available + amount,
      totalFunded: prev.totalFunded + amount,
      transactions: [
        { id: crypto.randomUUID(), type: "topup", amount, description: `Added $${amount} to wallet`, date: new Date().toISOString() },
        ...prev.transactions,
      ],
    }));
  }, []);

  const canCoverPayout = useCallback((amount: number) => wallet.available >= amount, [wallet.available]);

  const reserveFunds = useCallback((amount: number, referralId: string, description: string): boolean => {
    if (wallet.available < amount) return false;
    setWallet((prev) => ({
      ...prev,
      available: prev.available - amount,
      reserved: prev.reserved + amount,
      transactions: [
        { id: crypto.randomUUID(), type: "reserve", amount, description, date: new Date().toISOString(), referralId },
        ...prev.transactions,
      ],
    }));
    return true;
  }, [wallet.available]);

  const releasePayout = useCallback((amount: number, referralId: string, description: string) => {
    setWallet((prev) => ({
      ...prev,
      reserved: Math.max(0, prev.reserved - amount),
      transactions: [
        { id: crypto.randomUUID(), type: "payout", amount, description, date: new Date().toISOString(), referralId },
        ...prev.transactions,
      ],
    }));
  }, []);

  const refundReserve = useCallback((amount: number, referralId: string, description: string) => {
    setWallet((prev) => ({
      ...prev,
      available: prev.available + amount,
      reserved: Math.max(0, prev.reserved - amount),
      transactions: [
        { id: crypto.randomUUID(), type: "refund", amount, description, date: new Date().toISOString(), referralId },
        ...prev.transactions,
      ],
    }));
  }, []);

  return (
    <WalletContext.Provider value={{ wallet, addFunds, reserveFunds, releasePayout, refundReserve, canCoverPayout }}>
      {children}
    </WalletContext.Provider>
  );
};
