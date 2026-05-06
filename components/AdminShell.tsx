"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/deposits", label: "เติมเครดิต" },
  { href: "/admin/withdraws", label: "ถอนเครดิต" },
  { href: "/admin/bills", label: "บิลลูกค้า" },
  { href: "/admin/results", label: "ตรวจผล" },
  { href: "/admin/customers", label: "ลูกค้า" },
  { href: "/admin/settings", label: "ตั้งค่า" },
] as const;

function isNavActive(pathname: string, href: string) {
  if (href === "/admin/dashboard") return pathname === "/admin/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ href, label, mobile }: { href: string; label: string; mobile?: boolean }) {
  const pathname = usePathname();
  const active = isNavActive(pathname, href);
  const base =
    "rounded-xl px-3 py-2 text-sm font-medium transition-colors border border-transparent block text-center md:text-left";
  const inactive = mobile
    ? "text-zinc-400"
    : "text-zinc-300 hover:bg-zinc-900/70 hover:border-zinc-800";
  const activeCls = "bg-zinc-100 text-black border-zinc-200";
  return (
    <Link href={href} className={`${base} ${active ? activeCls : inactive}`}>
      {label}
    </Link>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row">
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-zinc-800/80 bg-zinc-950/80 p-4 gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400/85">แอดมิน</p>
          <p className="text-lg font-bold text-zinc-100 mt-1">AnntiOS</p>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((it) => (
            <NavLink key={it.href} href={it.href} label={it.label} />
          ))}
          <NavLink href="/" label="หน้า LIFF (ลูกค้า)" />
        </nav>
      </aside>

      <div className="flex-1 min-w-0 pb-24 md:pb-8">{children}</div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800 bg-black/92 backdrop-blur-md px-1 py-2 safe-area-pb">
        <div className="flex justify-between gap-0.5 max-w-lg mx-auto">
          {[
            NAV[0],
            NAV[1],
            NAV[2],
            NAV[3],
            NAV[4],
          ].map((it) => (
            <div key={it.href} className="flex-1 min-w-0">
              <NavLink href={it.href} label={it.label.split(" ")[0] ?? it.label} mobile />
            </div>
          ))}
        </div>
        <div className="flex gap-1 justify-center mt-1">
          <Link
            href="/admin/customers"
            className="text-[11px] text-zinc-500 px-2 py-1"
          >
            ลูกค้า
          </Link>
          <Link href="/admin/settings" className="text-[11px] text-zinc-500 px-2 py-1">
            ตั้งค่า
          </Link>
        </div>
      </nav>
    </div>
  );
}
