"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAdminGuard } from "@/src/components/AdminGuard";
import { useLiffAuth } from "@/src/components/LiffAuthProvider";

type Stats = {
  totalCustomerCredit: number;
  pendingDeposits: number;
  pendingWithdraws: number;
  pendingBills: number;
  playVolumeToday: number;
  netResultToday: number;
};

function formatTHB(amount: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function AdminDashboardPage() {
  const { authFetch } = useLiffAuth();
  const { isReady, isAdmin, error } = useAdminGuard();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await authFetch("/api/admin/stats");
      const json = (await res.json().catch(() => ({}))) as unknown as Stats & { error?: string };
      if (!res.ok) throw new Error(json?.error || "โหลดไม่สำเร็จ");
      setStats({
        totalCustomerCredit: json.totalCustomerCredit,
        pendingDeposits: json.pendingDeposits,
        pendingWithdraws: json.pendingWithdraws,
        pendingBills: json.pendingBills,
        playVolumeToday: json.playVolumeToday,
        netResultToday: json.netResultToday,
      });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (!isReady || !isAdmin) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดสถิติหลังยืนยันแอดมิน
    void load();
  }, [isReady, isAdmin, load]);

  if (!isReady) {
    return (
      <main className="min-h-screen flex items-center justify-center text-zinc-400">
        กำลังโหลด...
      </main>
    );
  }
  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-5 text-rose-200">{error}</main>
    );
  }
  if (!isAdmin) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-5 gap-3">
        <p className="font-semibold">ไม่มีสิทธิ์เข้าหน้าแอดมิน</p>
        <Link href="/" className="rounded-xl border border-zinc-700 px-4 py-2 text-sm">
          กลับหน้าแรก
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 max-w-5xl mx-auto w-full">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">แดชบอร์ด</h1>
          <p className="text-sm text-zinc-500 mt-1">สรุปภาพรวมระบบเครดิตและบิล</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? "กำลังรีเฟรช..." : "รีเฟรช"}
        </button>
      </header>

      {loadError ? (
        <div className="rounded-2xl border border-rose-900/50 bg-rose-950/25 px-4 py-3 text-sm text-rose-200 mb-6">
          {loadError}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard title="ยอดเครดิตลูกค้ารวม" accent="gold">
          <p className="text-xl font-bold tabular-nums text-amber-100">
            {stats ? formatTHB(stats.totalCustomerCredit) : "—"}
          </p>
        </DashboardCard>
        <DashboardCard title="คำขอเติม (รอดำเนินการ)">
          <p className="text-xl font-bold text-zinc-100">{stats?.pendingDeposits ?? "—"}</p>
          <Link href="/admin/deposits" className="text-xs text-emerald-400 mt-2 inline-block">
            เปิดจัดการ →
          </Link>
        </DashboardCard>
        <DashboardCard title="คำขอถอน (รอดำเนินการ)">
          <p className="text-xl font-bold text-zinc-100">{stats?.pendingWithdraws ?? "—"}</p>
          <Link href="/admin/withdraws" className="text-xs text-emerald-400 mt-2 inline-block">
            เปิดจัดการ →
          </Link>
        </DashboardCard>
        <DashboardCard title="บิลรอดำเนินการ">
          <p className="text-xl font-bold text-zinc-100">{stats?.pendingBills ?? "—"}</p>
          <Link href="/admin/bills?status=pending" className="text-xs text-emerald-400 mt-2 inline-block">
            ดูบิล →
          </Link>
        </DashboardCard>
        <DashboardCard title="ยอดเล่นวันนี้ (จาก bet_debit)">
          <p className="text-xl font-bold tabular-nums text-zinc-100">
            {stats ? formatTHB(stats.playVolumeToday) : "—"}
          </p>
        </DashboardCard>
        <DashboardCard title="ยอดสุทธิบิลที่สรุปวันนี้">
          <p
            className={`text-xl font-bold tabular-nums ${
              (stats?.netResultToday ?? 0) >= 0 ? "text-emerald-200" : "text-rose-200"
            }`}
          >
            {stats ? formatTHB(stats.netResultToday) : "—"}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">ผลต่อลูกค้ารวม (ตามฟิลด์สุทธิของบิล)</p>
        </DashboardCard>
      </section>
    </main>
  );
}

function DashboardCard({
  title,
  children,
  accent,
}: {
  title: string;
  children: React.ReactNode;
  accent?: "gold";
}) {
  return (
    <article
      className={`rounded-2xl border p-5 ${
        accent === "gold"
          ? "border-amber-500/35 bg-gradient-to-br from-emerald-950/55 to-black"
          : "border-zinc-800 bg-zinc-950/45"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{title}</p>
      <div className="mt-2">{children}</div>
    </article>
  );
}
