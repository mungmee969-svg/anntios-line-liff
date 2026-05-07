"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Coins,
  LayoutDashboard,
  LogOut,
  Radio,
  Search,
  Settings,
  Ticket,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useStaffSession } from "@/src/components/staff/useStaffSession";

const NAV = [
  { href: "/staff/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/staff/bills", label: "บิลลูกค้า", icon: Ticket },
  { href: "/staff/deposits", label: "เติมเครดิต", icon: Coins },
  { href: "/staff/withdraws", label: "ถอนเครดิต", icon: Wallet },
  { href: "/staff/customers", label: "ลูกค้า", icon: Users },
  { href: "/staff/results", label: "ตรวจผล", icon: Radio },
  { href: "/staff/reports", label: "รายงาน", icon: BarChart3 },
  { href: "/staff/settings", label: "ตั้งค่า", icon: Settings },
] as const;

function navActive(pathname: string, href: string) {
  if (href === "/staff/dashboard") return pathname === "/staff/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function StaffOsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { me, isLoading, error, logout, isSessionReady } = useStaffSession();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = useMemo(
    () =>
      new Intl.DateTimeFormat("th-TH", {
        dateStyle: "short",
        timeStyle: "medium",
      }).format(now),
    [now],
  );

  if (!isSessionReady || isLoading) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center text-emerald-200/80">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl px-8 py-6 shadow-[0_0_60px_rgba(16,185,129,0.12)]">
          <p className="text-sm font-medium tracking-wide">AnntiOS Staff OS</p>
          <p className="text-xs text-zinc-500 mt-2">กำลังเชื่อมต่อ...</p>
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-rose-500/25 bg-rose-950/20 backdrop-blur-xl p-6 text-center">
          <p className="text-rose-100 font-semibold">ไม่มีสิทธิ์เข้าหลังบ้าน</p>
          <p className="text-xs text-zinc-400 mt-2 break-all">
            {error ?? "เพิ่ม line_user_id ในตาราง staff_users หรือใช้บัญชี Owner (NEXT_PUBLIC_ADMIN_USER_IDS)"}
          </p>
          <Link
            href="/"
            className="inline-block mt-5 rounded-xl bg-emerald-500/90 px-5 py-2.5 text-sm font-semibold text-black"
          >
            กลับหน้าแรก
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100 flex flex-col md:flex-row overflow-x-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-white/[0.06] bg-gradient-to-b from-[#0a0c10] to-[#050508] backdrop-blur-xl">
        <div className="p-5 border-b border-white/[0.06]">
          <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400/90 font-semibold">AnntiOS</p>
          <p className="text-lg font-bold mt-1 bg-gradient-to-r from-amber-200 to-emerald-300 bg-clip-text text-transparent">
            Staff OS
          </p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto min-h-0">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = navActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all border ${
                  active
                    ? "border-amber-500/35 bg-amber-500/10 text-amber-100 shadow-[inset_0_1px_0_rgba(255,215,128,0.12)]"
                    : "border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
                }`}
              >
                <Icon className="size-4 shrink-0 opacity-90" strokeWidth={1.75} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/[0.06] text-[11px] text-zinc-500">
          <Link href="/admin/dashboard" className="text-emerald-400/90 hover:underline">
            Owner → Admin
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Top bar */}
        <header className="shrink-0 flex flex-wrap items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-black/40 backdrop-blur-xl">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="hidden sm:flex rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-emerald-300/90 items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              Online
            </div>
            <div className="min-w-0">
              <p className="text-xs text-zinc-500 truncate">Command Center</p>
              <p className="text-sm font-semibold truncate text-zinc-100">
                {me.displayName ?? me.userId}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono tabular-nums">
            {timeStr}
          </div>
          <Link
            href="/staff/customers"
            className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-zinc-300 hover:text-amber-200 transition-colors"
            aria-label="ค้นหา"
          >
            <Search className="size-4" />
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 rounded-xl border border-rose-500/25 bg-rose-950/30 px-3 py-2 text-xs font-semibold text-rose-100 hover:bg-rose-950/50"
          >
            <LogOut className="size-3.5" />
            ออก
          </button>
        </header>

        {/* Workspace */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 md:p-6 pb-24 md:pb-6">
          <div className="max-w-6xl mx-auto min-h-0">{children}</div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-white/[0.08] bg-black/85 backdrop-blur-2xl pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-stretch px-1 py-2">
          {NAV.slice(0, 5).map(({ href, label, icon: Icon }) => {
            const active = navActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-medium ${
                  active ? "text-amber-200" : "text-zinc-500"
                }`}
              >
                <Icon className="size-5" strokeWidth={1.75} />
                <span className="truncate max-w-[4.2rem] text-center">{label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </div>
        <div className="flex justify-center gap-4 pb-1 text-[10px] text-zinc-500">
          <Link href="/staff/reports" className={navActive(pathname, "/staff/reports") ? "text-amber-200" : ""}>
            รายงาน
          </Link>
          <Link href="/staff/settings" className={navActive(pathname, "/staff/settings") ? "text-amber-200" : ""}>
            ตั้งค่า
          </Link>
        </div>
      </nav>
    </div>
  );
}
