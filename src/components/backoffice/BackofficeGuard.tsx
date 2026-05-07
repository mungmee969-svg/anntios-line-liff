"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  backofficeCan,
  type BackofficePermissionKey,
  type BackofficePermissionKey as BackofficePermissionKey2,
} from "@/src/lib/backoffice-permissions";

type BackofficeMe = {
  id: string;
  username: string;
  displayName: string | null;
  role: string;
  isActive: boolean;
  permissions: Partial<Record<BackofficePermissionKey2, boolean>>;
};

type MeResp =
  | { user: BackofficeMe }
  | { error: string };

export function BackofficeGuard({
  children,
  requiredPermission,
}: {
  children: React.ReactNode;
  requiredPermission?: BackofficePermissionKey;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<MeResp | null>(null);

  const isLoginPage = pathname === "/backoffice/login";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/backoffice/auth/me", { cache: "no-store" });
        const j = (await res.json().catch(() => ({}))) as MeResp;
        if (!res.ok) {
          if (!cancelled) {
            setMe(j);
            setIsLoading(false);
            if (!isLoginPage) router.replace("/backoffice/login");
          }
          return;
        }
        if (!cancelled) {
          setMe(j);
          setIsLoading(false);
          if (isLoginPage) router.replace("/backoffice/dashboard");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "โหลด session ไม่สำเร็จ");
          setIsLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router, isLoginPage]);

  const forbidden = useMemo(() => {
    if (!requiredPermission) return false;
    if (!me || "error" in me) return false;
    return !backofficeCan(me.user.permissions, requiredPermission);
  }, [me, requiredPermission]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center text-emerald-200/80">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl px-8 py-6">
          <p className="text-sm font-medium tracking-wide">AnntiOS Backoffice</p>
          <p className="text-xs text-zinc-500 mt-2">กำลังตรวจสอบสิทธิ์…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-rose-500/25 bg-rose-950/20 backdrop-blur-xl p-6 text-center">
          <p className="text-rose-100 font-semibold">เกิดข้อผิดพลาด</p>
          <p className="text-xs text-zinc-400 mt-2 break-all">{error}</p>
        </div>
      </div>
    );
  }

  if (!me || "error" in me) {
    return null; // router.replace already handled
  }

  if (!me.user.isActive) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-rose-500/25 bg-rose-950/20 backdrop-blur-xl p-6 text-center">
          <p className="text-rose-100 font-semibold">บัญชีถูกปิดใช้งาน</p>
          <p className="text-xs text-zinc-400 mt-2">ติดต่อ Owner เพื่อเปิดสิทธิ์</p>
        </div>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-rose-500/25 bg-rose-950/20 backdrop-blur-xl p-6 text-center">
          <p className="text-rose-100 font-semibold">ไม่มีสิทธิ์เข้าหลังบ้าน</p>
          <p className="text-xs text-zinc-400 mt-2">permission ไม่พอสำหรับหน้านี้</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

