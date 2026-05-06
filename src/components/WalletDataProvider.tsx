"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLiffAuth } from "@/src/components/LiffAuthProvider";

export type WalletSummary = {
  id: string;
  user_id: string;
  display_name: string | null;
  credit_balance: number;
  locked_balance: number;
};

export type WalletTx = {
  id: string;
  type: string;
  amount: number;
  status: string;
  note: string | null;
  admin_note: string | null;
  created_at: string;
};

type Ctx = {
  wallet: WalletSummary | null;
  transactions: WalletTx[];
  isLoading: boolean;
  error: string | null;
  /** คืนค่าเครดิตหลัง sync จาก server */
  refreshWallet: () => Promise<WalletSummary | null>;
};

const WalletDataContext = createContext<Ctx | null>(null);

export function useWalletData(): Ctx {
  const ctx = useContext(WalletDataContext);
  if (!ctx) {
    throw new Error("useWalletData must be used within WalletDataProvider");
  }
  return ctx;
}

export function WalletDataProvider({ children }: { children: React.ReactNode }) {
  const { isSessionReady, authFetch } = useLiffAuth();
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshWallet = useCallback(async (): Promise<WalletSummary | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/wallet");
      const json = (await res.json().catch(() => ({}))) as unknown as {
        wallet?: WalletSummary;
        transactions?: WalletTx[];
        error?: string;
      };
      if (!res.ok) throw new Error(json?.error || "โหลดเครดิตไม่สำเร็จ");
      const nextWallet = json.wallet ?? null;
      setWallet(nextWallet);
      setTransactions(Array.isArray(json.transactions) ? json.transactions : []);
      return nextWallet;
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดเครดิตไม่สำเร็จ");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (!isSessionReady) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync wallet หลัง LIFF session พร้อม
    void refreshWallet();
  }, [isSessionReady, refreshWallet]);

  const value = useMemo<Ctx>(
    () => ({
      wallet,
      transactions,
      isLoading,
      error,
      refreshWallet,
    }),
    [wallet, transactions, isLoading, error, refreshWallet],
  );

  return (
    <WalletDataContext.Provider value={value}>{children}</WalletDataContext.Provider>
  );
}
