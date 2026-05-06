"use client";

import { useEffect, useMemo, useState } from "react";
import liff from "@line/liff";

export function useAdminGuard() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_ADMIN_USER_IDS || "";
    const set = new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
    if (!userId) return false;
    return set.has(userId);
  }, [userId]);

  useEffect(() => {
    async function init() {
      try {
        await liff.init({ liffId: "2009989826-L6OPDoa5" });
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        const p = await liff.getProfile();
        setUserId(p.userId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "ไม่สามารถเริ่มต้น LIFF ได้");
      } finally {
        setIsReady(true);
      }
    }
    init();
  }, []);

  return { userId, isReady, isAdmin, error };
}

