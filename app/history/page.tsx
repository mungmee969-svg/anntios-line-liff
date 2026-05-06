"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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

function statusStyle(status: BillRow["status"]) {
  switch (status) {
    case "pending":
      return "border-amber-900/50 bg-amber-950/25 text-amber-200";
    case "accepted":
      return "border-sky-900/50 bg-sky-950/25 text-sky-200";
    case "rejected":
      return "border-rose-900/50 bg-rose-950/25 text-rose-200";
    case "settled":
      return "border-emerald-900/50 bg-emerald-950/25 text-emerald-200";
    case "cancelled":
      return "border-zinc-800 bg-zinc-950/25 text-zinc-200";
  }
}

function statusLabel(status: BillRow["status"]) {
  switch (status) {
    case "pending":
      return "รอดำเนินการ";
    case "accepted":
      return "รับแล้ว";
    case "rejected":
      return "ปฏิเสธ";
    case "settled":
      return "สรุปแล้ว";
    case "cancelled":
      return "ยกเลิก";
  }
}

type BillWithCount = BillRow & { record_count: number };

export default function HistoryPage() {
  const { isSessionReady, authFetch } = useLiffAuth();
  const [bills, setBills] = useState<BillWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const headerSubtitle = useMemo(() => "บิลของคุณ", []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/bills");
      const json = (await res.json().catch(() => ({}))) as unknown as {
        bills?: BillWithCount[];
        error?: string;
      };
      if (!res.ok) throw new Error(json?.error || "โหลดไม่สำเร็จ");
      setBills(json.bills ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (!isSessionReady) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load จาก session พร้อม
    void load();
  }, [isSessionReady, load]);

  return (
    <main className="min-h-screen bg-black text-white px-4 py-6 sm:px-5">
      <section className="max-w-md mx-auto w-full min-w-0">
        <header className="flex flex-col gap-3 mb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight">ประวัติบิล</h1>
            <p className="text-sm text-zinc-500">{headerSubtitle}</p>
          </div>
          <Link
            href="/"
            className="shrink-0 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200 text-center"
          >
            หลัก
          </Link>
        </header>

        <div className="mb-4 min-w-0">
          <CreditBadge className="w-full max-w-full" />
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 px-4 py-3 text-sm text-zinc-300">
            กำลังโหลด...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-900/50 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : bills.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 px-4 py-3 text-sm text-zinc-300">
            ยังไม่มีบิล
          </div>
        ) : (
          <div className="grid gap-3">
            {bills.map((bill) => (
              <Link
                key={bill.id}
                href={`/history/${bill.id}`}
                className="block rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black p-5 min-w-0 transition-transform active:scale-[0.99] hover:bg-zinc-950/80"
              >
                <div className="flex items-start justify-between gap-3 min-w-0">
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-500 truncate">{bill.bill_no}</p>
                    <p className="text-sm font-semibold text-zinc-100 mt-1 truncate">
                      {bill.lottery_name ?? "-"} • {bill.bet_type ?? "-"}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {formatDate(bill.created_at)} •{" "}
                      <span className="text-emerald-200/90">{bill.record_count} รายการ</span>
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-xs ${statusStyle(
                      bill.status,
                    )}`}
                  >
                    {statusLabel(bill.status)}
                  </span>
                </div>

                <div className="mt-4 flex items-end justify-between gap-3">
                  <p className="text-sm text-zinc-500">ยอดรวม</p>
                  <p className="text-base font-semibold tabular-nums">{formatTHB(bill.total_amount)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
