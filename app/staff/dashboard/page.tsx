"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useLiffAuth } from "@/src/components/LiffAuthProvider";

type Stats = {
  totalCustomerCredit: number;
  pendingDeposits: number;
  pendingWithdraws: number;
  pendingBills: number;
  playVolumeToday: number;
  netResultToday: number;
  billsToday: number;
  billsPendingSettle: number;
  activeCustomersToday: number;
};

function fmt(n: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(n);
}

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: "gold" | "emerald";
}) {
  return (
    <div
      className={`rounded-2xl border p-4 backdrop-blur-xl ${
        accent === "gold"
          ? "border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-transparent shadow-[0_0_40px_rgba(245,158,11,0.08)]"
          : accent === "emerald"
            ? "border-emerald-500/20 bg-emerald-500/[0.07] shadow-[0_0_36px_rgba(16,185,129,0.08)]"
            : "border-white/[0.08] bg-white/[0.03]"
      }`}
    >
      <p className="text-[11px] uppercase tracking-wide text-zinc-500 font-medium">{label}</p>
      <p className="mt-2 text-xl font-bold tabular-nums text-zinc-50">{value}</p>
    </div>
  );
}

export default function StaffDashboardPage() {
  const { authFetch } = useLiffAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await authFetch("/api/staff/stats");
      const j = (await res.json()) as Stats & { error?: string };
      if (!res.ok) throw new Error(j.error || "โหลดไม่สำเร็จ");
      setStats(j);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    }
  }, [authFetch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">ภาพรวมระบบ — AnntiOS Staff OS</p>
      </div>

      {err ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-100">
          {err}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="เครดิตลูกค้ารวม" value={stats ? fmt(stats.totalCustomerCredit) : "—"} accent="gold" />
        <Kpi label="เติมรออนุมัติ" value={stats?.pendingDeposits ?? "—"} />
        <Kpi label="ถอนรออนุมัติ" value={stats?.pendingWithdraws ?? "—"} />
        <Kpi label="บิลรอดำเนินการ" value={stats?.pendingBills ?? "—"} />
        <Kpi label="บิลวันนี้" value={stats?.billsToday ?? "—"} accent="emerald" />
        <Kpi label="ยอดเล่นวันนี้" value={stats ? fmt(stats.playVolumeToday) : "—"} />
        <Kpi label="ได้เสียวันนี้ (สุทธิ)" value={stats ? fmt(stats.netResultToday) : "—"} />
        <Kpi label="บิลรอตรวจผล" value={stats?.billsPendingSettle ?? "—"} />
        <Kpi label="ลูกค้า active วันนี้" value={stats?.activeCustomersToday ?? "—"} />
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-5">
        <p className="text-sm font-semibold text-zinc-200 mb-3">Quick actions</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/staff/deposits"
            className="rounded-xl border border-emerald-500/25 bg-emerald-950/30 px-4 py-3 text-center text-sm font-medium text-emerald-100 hover:bg-emerald-950/50"
          >
            อนุมัติเติม
          </Link>
          <Link
            href="/staff/bills"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm font-medium hover:border-amber-500/30"
          >
            ตรวจบิล
          </Link>
          <Link
            href="/staff/customers"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm font-medium hover:border-amber-500/30"
          >
            ค้นหาลูกค้า
          </Link>
          <Link
            href="/staff/results"
            className="rounded-xl border border-amber-500/25 bg-amber-950/20 px-4 py-3 text-center text-sm font-medium text-amber-100 hover:bg-amber-950/35"
          >
            สรุปผลหวย
          </Link>
        </div>
      </section>
    </div>
  );
}
