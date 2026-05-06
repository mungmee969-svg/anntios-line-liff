"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CreditBadge } from "@/components/CreditBadge";
import { useLiffAuth } from "@/src/components/LiffAuthProvider";
import type { BillRow } from "@/src/lib/supabase";

function formatTHB(amount: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

type BillApi = BillRow & { record_count?: number; credit_after?: number | null };

function statusLabel(status: BillRow["status"]) {
  switch (status) {
    case "settled":
      return "สรุปแล้ว";
    default:
      return status;
  }
}

export default function ResultsPage() {
  const { isSessionReady, authFetch } = useLiffAuth();
  const [bills, setBills] = useState<BillApi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/bills");
      const json = (await res.json().catch(() => ({}))) as unknown as {
        bills?: BillApi[];
        error?: string;
      };
      if (!res.ok) throw new Error(json?.error || "โหลดไม่สำเร็จ");
      const all = json.bills ?? [];
      setBills(all.filter((b) => b.status === "settled"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (!isSessionReady) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดหลัง token พร้อม
    void load();
  }, [isSessionReady, load]);

  return (
    <main className="min-h-screen bg-black text-white px-4 py-6 sm:px-5">
      <section className="max-w-md mx-auto w-full min-w-0">
        <header className="flex items-center justify-between gap-3 mb-5">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight">สรุปผลหวย</h1>
            <p className="text-sm text-zinc-500">ต่อบิล (สรุปแล้ว)</p>
          </div>
          <Link
            href="/"
            className="shrink-0 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200 active:scale-[0.99]"
          >
            หลัก
          </Link>
        </header>

        <div className="mb-4 min-w-0">
          <CreditBadge className="w-full max-w-full" />
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 px-4 py-3 text-sm text-zinc-300">
            กำลังโหลดบิลที่สรุปแล้ว...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-900/50 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : bills.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 px-4 py-3 text-sm text-zinc-300">
            ยังไม่มีบิลที่สรุปผลแล้ว
          </div>
        ) : (
          <div className="grid gap-3">
            {bills.map((b) => (
              <Link
                key={b.id}
                href={`/results/${b.id}`}
                className="block rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_14px_36px_rgba(0,0,0,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-950/70 min-w-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-zinc-500 truncate">{b.bill_no}</p>
                  <span className="shrink-0 text-xs rounded-full border border-emerald-900/50 bg-emerald-950/30 px-2 py-0.5 text-emerald-200">
                    {statusLabel(b.status)}
                  </span>
                </div>
                <p className="text-sm font-semibold text-zinc-100 mt-1 truncate">
                  {b.lottery_name ?? "-"} • {b.bet_type ?? "-"}
                </p>
                <p className="text-xs text-zinc-500 mt-1">{formatDate(b.created_at)}</p>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2">
                    <p className="text-xs text-zinc-500">ยอดรวม</p>
                    <p className="font-semibold tabular-nums">{formatTHB(b.total_amount)}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2">
                    <p className="text-xs text-zinc-500">ได้รางวัล</p>
                    <p className="font-semibold tabular-nums text-amber-200/95">{formatTHB(b.win_amount)}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2">
                    <p className="text-xs text-zinc-500">ขาดทุนเดิมพัน</p>
                    <p className="font-semibold tabular-nums text-rose-200/85">{formatTHB(b.lose_amount)}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2">
                    <p className="text-xs text-zinc-500">สุทธิ</p>
                    <p className="font-semibold tabular-nums">{formatTHB(b.net_amount)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
