"use client";

import { useCallback, useEffect, useState } from "react";
import liff from "@line/liff";
import { ensureLiffReady } from "@/src/lib/liffAuth";
import { useLiffAuth } from "@/src/components/LiffAuthProvider";
export type StaffPermissionKey =
  | "can_view_dashboard"
  | "can_approve_deposit"
  | "can_approve_withdraw"
  | "can_cancel_bill"
  | "can_settle_result"
  | "can_adjust_credit"
  | "can_view_customers"
  | "can_export_report"
  | "can_manage_staff";

export type StaffMe = {
  userId: string;
  displayName: string | null;
  role: string;
  staffRowId: string | null;
  permissions: Partial<Record<StaffPermissionKey, boolean>>;
};

export function useStaffSession() {
  const { isSessionReady, authFetch } = useLiffAuth();
  const [me, setMe] = useState<StaffMe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/staff/me");
      const json = (await res.json().catch(() => ({}))) as StaffMe & { error?: string };
      if (!res.ok) {
        setMe(null);
        setError(json?.error || "ไม่มีสิทธิ์ Staff");
        return;
      }
      setMe({
        userId: json.userId,
        displayName: json.displayName,
        role: json.role,
        staffRowId: json.staffRowId,
        permissions: json.permissions ?? {},
      });
    } catch (e) {
      setMe(null);
      setError(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (!isSessionReady) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดสิทธิ์หลัง LIFF พร้อม
    void refresh();
  }, [isSessionReady, refresh]);

  const logout = useCallback(async () => {
    try {
      await ensureLiffReady();
      if (liff.isLoggedIn()) liff.logout();
      window.location.href = "/";
    } catch {
      window.location.href = "/";
    }
  }, []);

  const can = useCallback(
    (k: StaffPermissionKey) => Boolean(me?.permissions?.[k]),
    [me],
  );

  return { me, isLoading, error, refresh, logout, can, isSessionReady };
}
