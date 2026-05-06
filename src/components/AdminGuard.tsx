"use client";

import { useEffect, useMemo, useState } from "react";
import liff from "@line/liff";
import { ensureLiffReady } from "@/src/lib/liffAuth";
import { useLiffAuth } from "@/src/components/LiffAuthProvider";

export function useAdminGuard() {
  const { isSessionReady } = useLiffAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_ADMIN_USER_IDS || "";
    const set = new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
    if (!userId) return false;
    return set.has(userId);
  }, [userId]);

  useEffect(() => {
    if (!isSessionReady) return;

    let cancelled = false;

    async function load() {
      try {
        await ensureLiffReady();
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        const p = await liff.getProfile();
        if (!cancelled) setUserId(p.userId);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "ไม่สามารถเริ่มต้น LIFF ได้");
        }
      } finally {
        if (!cancelled) setIsReady(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isSessionReady]);

  return { userId, isReady: isReady && isSessionReady, isAdmin, error };
}
