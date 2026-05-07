"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import liff from "@line/liff";
import {
  ensureLiffReady,
  forceLiffRelogin,
  getFreshIdToken,
  isLikelyExpiredIdTokenError,
  loginKeepingPath,
  liffAuthedFetch,
} from "@/src/lib/liffAuth";

type LiffAuthContextValue = {
  isSessionReady: boolean;
  isVerifying: boolean;
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
};

const LiffAuthContext = createContext<LiffAuthContextValue | null>(null);

export function useLiffAuth(): LiffAuthContextValue {
  const ctx = useContext(LiffAuthContext);
  if (!ctx) {
    throw new Error("useLiffAuth must be used within LiffAuthProvider");
  }
  return ctx;
}

export function LiffAuthProvider({ children }: { children: React.ReactNode }) {
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const authFetch = useCallback((input: RequestInfo, init?: RequestInit) => {
    return liffAuthedFetch(input, init ?? {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setIsVerifying(true);
      setSessionError(null);
      try {
        await ensureLiffReady();

        if (!liff.isLoggedIn()) {
          loginKeepingPath();
          return;
        }

        let token: string;
        try {
          token = await getFreshIdToken();
        } catch {
          await forceLiffRelogin();
          return;
        }

        const r = await fetch("/api/wallet", {
          headers: { authorization: `Bearer ${token}` },
        });
        const text = await r.text();

        if (!r.ok && isLikelyExpiredIdTokenError(r.status, text)) {
          await forceLiffRelogin();
          return;
        }

        if (!cancelled) setIsSessionReady(true);
      } catch (e) {
        if (!cancelled) {
          setSessionError(e instanceof Error ? e.message : "ไม่สามารถเข้าสู่ระบบ LINE ได้");
        }
      } finally {
        if (!cancelled) setIsVerifying(false);
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const overlay = useMemo(() => {
    if (sessionError) {
      return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black text-white px-6">
          <div className="max-w-sm text-center space-y-4">
            <p className="text-sm text-zinc-200">{sessionError}</p>
            <button
              type="button"
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black active:scale-[0.99]"
              onClick={() => window.location.reload()}
            >
              ลองอีกครั้ง
            </button>
          </div>
        </div>
      );
    }

    if (!isSessionReady && (isVerifying || !sessionError)) {
      return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black text-white px-6">
          <div className="max-w-sm text-center space-y-2">
            <p className="text-sm font-semibold">กำลังยืนยันตัวตน LINE</p>
            <p className="text-xs text-zinc-500">กรุณารอสักครู่…</p>
          </div>
        </div>
      );
    }

    return null;
  }, [isSessionReady, isVerifying, sessionError]);

  const value = useMemo<LiffAuthContextValue>(
    () => ({ isSessionReady, isVerifying, authFetch }),
    [isSessionReady, isVerifying, authFetch],
  );

  return (
    <LiffAuthContext.Provider value={value}>
      {overlay}
      {isSessionReady ? children : null}
    </LiffAuthContext.Provider>
  );
}
