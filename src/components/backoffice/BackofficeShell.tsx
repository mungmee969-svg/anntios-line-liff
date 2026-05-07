"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Coins,
  LayoutDashboard,
  LogOut,
  Radio,
  ReceiptText,
  Search,
  Settings,
  Users,
  Wallet,
  UserCog,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type MeResp =
  | { user: { username: string; displayName: string | null } }
  | { error: string };

const NAV = [
  { href: "/backoffice/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/backoffice/bills", label: "บิลลูกค้า", icon: ReceiptText },
  { href: "/backoffice/deposits", label: "เติมเครดิต", icon: Coins },
  { href: "/backoffice/withdraws", label: "ถอนเครดิต", icon: Wallet },
  { href: "/backoffice/customers", label: "ลูกค้า", icon: Users },
  { href: "/backoffice/results", label: "ตรวจผล", icon: Radio },
  { href: "/backoffice/reports", label: "รายงาน", icon: BarChart3 },
  { href: "/backoffice/staff", label: "พนักงาน", icon: UserCog },
  { href: "/backoffice/settings", label: "ตั้งค่า", icon: Settings },
] as const;

function navActive(pathname: string, href: string) {
  if (href === "/backoffice/dashboard") return pathname === "/backoffice/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BackofficeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());
  const [me, setMe] = useState<{ username: string; displayName: string | null } | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadMe() {
      try {
        const res = await fetch("/api/backoffice/auth/me", { cache: "no-store" });
        const j = (await res.json().catch(() => ({}))) as MeResp;
        if (!cancelled && res.ok && "user" in j) {
          setMe({ username: j.user.username, displayName: j.user.displayName ?? null });
        }
      } catch {
        // ignore
      }
    }
    void loadMe();
    return () => {
      cancelled = true;
    };
  }, []);

  const timeStr = useMemo(
    () =>
      new Intl.DateTimeFormat("th-TH", {
        dateStyle: "short",
        timeStyle: "medium",
      }).format(now),
    [now],
  );

  async function logout() {
    await fetch("/api/backoffice/auth/logout", { method: "POST" }).catch(() => null);
    router.replace("/backoffice/login");
  }

  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100 flex flex-col md:flex-row overflow-x-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-white/[0.06] bg-gradient-to-b from-[#0a0c10] to-[#050508] backdrop-blur-xl">
        <div className="p-5 border-b border-white/[0.06]">
          <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400/90 font-semibold">AnntiOS</p>
          <p className="text-lg font-bold mt-1 bg-gradient-to-r from-amber-200 to-emerald-300 bg-clip-text text-transparent">
            Backoffice
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
              <p className="text-xs text-zinc-500 truncate">Command Bar</p>
              <p className="text-sm font-semibold truncate text-zinc-100">
                {me?.displayName ?? me?.username ?? "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono tabular-nums">
            {timeStr}
          </div>
          <Link
            href="/backoffice/customers"
            className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-zinc-300 hover:text-amber-200 transition-colors"
            aria-label="ค้นหา"
          >
            <Search className="size-4" />
          </Link>
          <button
            type="button"
            onClick={() => void logout()}
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
                <span className="truncate max-w-[4.8rem] text-center">{label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </div>
        <div className="flex justify-center gap-4 pb-1 text-[10px] text-zinc-500">
          <Link href="/backoffice/reports" className={navActive(pathname, "/backoffice/reports") ? "text-amber-200" : ""}>
            รายงาน
          </Link>
          <Link href="/backoffice/settings" className={navActive(pathname, "/backoffice/settings") ? "text-amber-200" : ""}>
            ตั้งค่า
          </Link>
        </div>
      </nav>
    </div>
  );
}

