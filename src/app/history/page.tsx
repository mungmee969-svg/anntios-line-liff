"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import liff from "@line/liff";
import { ensureLiffReady } from "@/src/lib/liffAuth";
import { getBills, getBillRecords, type BillRow } from "@/src/lib/supabase";

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

export default function HistoryPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bills, setBills] = useState<Array<BillRow & { recordCount: number }>>(
    [],
  );
  const abortRef = useRef<{ aborted: boolean }>({ aborted: false });

  const headerSubtitle = useMemo(() => {
    if (!userId) return "กำลังโหลดผู้ใช้จาก LINE...";
    return `userId: ${userId}`;
  }, [userId]);

  useEffect(() => {
    abortRef.current.aborted = false;
    const abortState = abortRef.current;
    async function load() {
      setIsLoading(true);
      setError(null);
      setBills([]);

      try {
        await ensureLiffReady();
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        const p = await liff.getProfile();
        if (abortState.aborted) return;
        setUserId(p.userId);

        const data = await getBills(p.userId);
        if (abortState.aborted) return;
        const withCount = await Promise.all(
          data.map(async (b) => {
            try {
              const records = await getBillRecords(b.id);
              return { ...b, recordCount: records.length };
            } catch {
              return { ...b, recordCount: 0 };
            }
          }),
        );
        if (abortState.aborted) return;
        setBills(withCount);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่";
        setError(msg);
      } finally {
        if (!abortState.aborted) setIsLoading(false);
      }
    }

    load();
    return () => {
      abortState.aborted = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-black text-white px-5 py-6">
      <section className="max-w-md mx-auto">
        <header className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight">ประวัติรายการ</h1>
            <p className="text-sm text-zinc-500 break-all">{headerSubtitle}</p>
          </div>

          <Link
            href="/"
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200 transition-all duration-200 hover:bg-zinc-800/70 hover:-translate-y-0.5 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          >
            กลับหน้าแรก
          </Link>
        </header>

        {isLoading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 px-4 py-3 text-sm text-zinc-300">
            กำลังโหลดรายการ...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-900/50 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : bills.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 px-4 py-3 text-sm text-zinc-300">
            ยังไม่มีรายการ
          </div>
        ) : (
          <div className="grid gap-3">
            {bills.map((bill) => (
              <Link
                key={bill.id}
                href={`/history/${bill.id}`}
                className="block rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_14px_36px_rgba(0,0,0,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-950/70"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-zinc-500">{bill.bill_no}</p>
                    <p className="text-sm font-semibold text-zinc-100 mt-1">
                      {bill.lottery_name ?? "-"} • {bill.bet_type ?? "-"}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {formatDate(bill.created_at)} • {bill.recordCount} รายการ
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

                <div className="mt-4 flex items-end justify-between">
                  <p className="text-sm text-zinc-500">ยอดรวม</p>
                  <p className="text-base font-semibold">
                    {formatTHB(bill.total_amount)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

