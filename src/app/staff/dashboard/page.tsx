"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, Coins, CreditCard, FileText, ReceiptText } from "lucide-react";

type DashboardMock = {
  billsToday: number;
  pendingDeposits: number;
  pendingWithdraws: number;
  totalCredit: number;
  onlineCustomers: number;
  updatedAt: string;
};

function fmt(n: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(n);
}

function GlassCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "gold" | "emerald";
}) {
  return (
    <div
      className={`rounded-2xl border p-4 backdrop-blur-xl ${
        accent === "gold"
          ? "border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-white/[0.03] to-transparent shadow-[0_0_46px_rgba(245,158,11,0.10)]"
          : accent === "emerald"
            ? "border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.10] via-white/[0.03] to-transparent shadow-[0_0_42px_rgba(16,185,129,0.10)]"
            : "border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-white/[0.02]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500 font-medium">{label}</p>
          <p className="mt-2 text-xl font-bold tabular-nums text-zinc-50 truncate">{value}</p>
          {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
        </div>
        <div
          className={`shrink-0 rounded-2xl border p-2 ${
            accent === "gold"
              ? "border-amber-500/25 bg-amber-500/10 text-amber-200"
              : accent === "emerald"
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                : "border-white/10 bg-white/[0.04] text-zinc-300"
          }`}
        >
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

export default function StaffDashboardPage() {
  const [data, setData] = useState<DashboardMock | null>(null);

  useEffect(() => {
    // Mock data (Phase 1) — keep LIFF-safe, no network dependency
    const t = setTimeout(() => {
      setData({
        billsToday: 34,
        pendingDeposits: 7,
        pendingWithdraws: 3,
        totalCredit: 125_400,
        onlineCustomers: 12,
        updatedAt: new Date().toISOString(),
      });
    }, 250);
    return () => clearTimeout(t);
  }, []);

  const updatedText = useMemo(() => {
    if (!data?.updatedAt) return "—";
    return new Intl.DateTimeFormat("th-TH", { dateStyle: "short", timeStyle: "short" }).format(
      new Date(data.updatedAt),
    );
  }, [data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">ภาพรวมระบบ — Dark premium / glass cards</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 min-w-0">
        <GlassCard
          label="บิลวันนี้"
          value={data ? data.billsToday : "—"}
          hint={`อัปเดต: ${updatedText}`}
          icon={ReceiptText}
          accent="emerald"
        />
        <GlassCard
          label="เติมเครดิตรออนุมัติ"
          value={data ? data.pendingDeposits : "—"}
          hint="งานที่ต้องเคลียร์ก่อน"
          icon={Coins}
        />
        <GlassCard
          label="ถอนเครดิตรออนุมัติ"
          value={data ? data.pendingWithdraws : "—"}
          hint="เช็กยอดก่อนอนุมัติ"
          icon={CreditCard}
        />
        <GlassCard
          label="เครดิตรวม"
          value={data ? fmt(data.totalCredit) : "—"}
          hint="รวมเครดิตลูกค้าทั้งหมด"
          icon={FileText}
          accent="gold"
        />
        <GlassCard
          label="ลูกค้าออนไลน์"
          value={data ? data.onlineCustomers : "—"}
          hint="active ในช่วงล่าสุด"
          icon={Activity}
        />
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-5">
        <p className="text-sm font-semibold text-zinc-200 mb-3">Quick actions</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/staff/deposits"
            className="rounded-xl border border-emerald-500/25 bg-emerald-950/30 px-4 py-3 text-center text-sm font-medium text-emerald-100 hover:bg-emerald-950/50"
          >
            เติมรออนุมัติ
          </Link>
          <Link
            href="/staff/withdraws"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm font-medium hover:border-amber-500/30"
          >
            ถอนรออนุมัติ
          </Link>
          <Link
            href="/staff/bills"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm font-medium hover:border-amber-500/30"
          >
            บิลลูกค้า
          </Link>
          <Link
            href="/staff/results"
            className="rounded-xl border border-amber-500/25 bg-amber-950/20 px-4 py-3 text-center text-sm font-medium text-amber-100 hover:bg-amber-950/35"
          >
            ตรวจผล
          </Link>
        </div>
      </section>
    </div>
  );
}

