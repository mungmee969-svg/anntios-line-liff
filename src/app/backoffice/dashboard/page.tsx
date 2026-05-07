"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import { Activity, Coins, CreditCard, DollarSign, FileText, ReceiptText, Sparkles, Users } from "lucide-react";

type IconType = ComponentType<{ className?: string }>;
type Kpi = { label: string; value: string; hint?: string; accent?: "gold" | "emerald"; icon: IconType };

function GlassKpi({ label, value, hint, icon: Icon, accent }: Kpi) {
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

function fmtTHB(n: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n);
}

export default function BackofficeDashboardPage() {
  // MVP: mock data (Phase 1). Hook up /api/backoffice/stats next.
  const [mock] = useState(() => ({
    totalCustomerCredit: 125_400,
    pendingDeposits: 7,
    pendingWithdraws: 3,
    billsToday: 34,
    billsPendingSettle: 8,
    playVolumeToday: 98_500,
    payoutToday: 82_300,
    netToday: 16_200,
    onlineCustomers: 12,
    updatedAt: new Date().toISOString(),
  }));

  const updatedText = useMemo(() => {
    return new Intl.DateTimeFormat("th-TH", { dateStyle: "short", timeStyle: "short" }).format(new Date(mock.updatedAt));
  }, [mock.updatedAt]);

  const kpis: Kpi[] = [
    { label: "เครดิตลูกค้ารวม", value: fmtTHB(mock.totalCustomerCredit), hint: `อัปเดต: ${updatedText}`, accent: "gold", icon: Users },
    { label: "เติมเครดิตรออนุมัติ", value: `${mock.pendingDeposits}`, hint: "งานที่ต้องเคลียร์", icon: Coins },
    { label: "ถอนเครดิตรออนุมัติ", value: `${mock.pendingWithdraws}`, hint: "เช็กยอดก่อนอนุมัติ", icon: CreditCard },
    { label: "บิลวันนี้", value: `${mock.billsToday}`, hint: "รวมทุกสถานะ", accent: "emerald", icon: ReceiptText },
    { label: "บิลรอตรวจ", value: `${mock.billsPendingSettle}`, hint: "รอ settle", icon: FileText },
    { label: "ยอดเล่นวันนี้", value: fmtTHB(mock.playVolumeToday), hint: "stake รวม", icon: DollarSign },
    { label: "ยอดจ่ายวันนี้", value: fmtTHB(mock.payoutToday), hint: "payout รวม", icon: Sparkles },
    { label: "กำไรสุทธิวันนี้", value: fmtTHB(mock.netToday), hint: "สุทธิ", accent: "emerald", icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">ภาพรวมระบบ — AnntiOS Backoffice</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 min-w-0">
        {kpis.map((k) => (
          <GlassKpi key={k.label} {...k} />
        ))}
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-5">
        <p className="text-sm font-semibold text-zinc-200 mb-3">Quick actions</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/backoffice/deposits"
            className="rounded-xl border border-emerald-500/25 bg-emerald-950/30 px-4 py-3 text-center text-sm font-medium text-emerald-100 hover:bg-emerald-950/50"
          >
            อนุมัติเติมเครดิต
          </Link>
          <Link
            href="/backoffice/bills"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm font-medium hover:border-amber-500/30"
          >
            ตรวจบิล
          </Link>
          <Link
            href="/backoffice/customers"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm font-medium hover:border-amber-500/30"
          >
            ค้นหาลูกค้า
          </Link>
          <Link
            href="/backoffice/staff"
            className="rounded-xl border border-amber-500/25 bg-amber-950/20 px-4 py-3 text-center text-sm font-medium text-amber-100 hover:bg-amber-950/35"
          >
            เพิ่มพนักงาน
          </Link>
        </div>
      </section>
    </div>
  );
}

