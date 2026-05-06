"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import liff from "@line/liff";
import { ensureLiffReady } from "@/src/lib/liffAuth";
import { getBill, getBillRecords, type BillRow, type RecordRow } from "@/src/lib/supabase";

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

export default function ResultBillDetailPage({ params }: { params: { billId: string } }) {
  const billId = params.billId;
  const [bill, setBill] = useState<BillRow | null>(null);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef({ aborted: false });

  const totalBet = useMemo(() => records.reduce((s, r) => s + r.amount, 0), [records]);

  useEffect(() => {
    abortRef.current.aborted = false;
    const abortState = abortRef.current;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        await ensureLiffReady();
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        const b = await getBill(billId);
        if (abortState.aborted) return;
        setBill(b);
        const rs = await getBillRecords(billId);
        if (abortState.aborted) return;
        setRecords(rs);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ";
        setError(msg);
      } finally {
        if (!abortState.aborted) setIsLoading(false);
      }
    }
    load();
    return () => {
      abortState.aborted = true;
    };
  }, [billId]);

  return (
    <main className="min-h-screen bg-black text-white px-5 py-6">
      <section className="max-w-md mx-auto">
        <header className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight">รายละเอียดสรุปผล</h1>
            <p className="text-sm text-zinc-500 break-all">{billId}</p>
          </div>
          <Link
            href="/results"
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200 transition-all duration-200 hover:bg-zinc-800/70 hover:-translate-y-0.5 active:scale-[0.99]"
          >
            กลับ
          </Link>
        </header>

        {isLoading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 px-4 py-3 text-sm text-zinc-300">
            กำลังโหลด...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-900/50 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : !bill ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 px-4 py-3 text-sm text-zinc-300">
            ไม่พบบิล
          </div>
        ) : (
          <div className="grid gap-3">
            <div className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black p-5">
              <p className="text-xs text-zinc-500">{bill.bill_no}</p>
              <p className="text-sm font-semibold text-zinc-100 mt-1">
                {bill.lottery_name ?? "-"} • {bill.bet_type ?? "-"}
              </p>
              <p className="text-xs text-zinc-500 mt-1">{formatDate(bill.created_at)}</p>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2">
                  <p className="text-xs text-zinc-500">ยอดแทง</p>
                  <p className="font-semibold">{formatTHB(bill.total_amount ?? totalBet)}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2">
                  <p className="text-xs text-zinc-500">ได้</p>
                  <p className="font-semibold">{formatTHB(bill.win_amount)}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2">
                  <p className="text-xs text-zinc-500">เสีย</p>
                  <p className="font-semibold">{formatTHB(bill.lose_amount)}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2">
                  <p className="text-xs text-zinc-500">สุทธิ</p>
                  <p className="font-semibold">{formatTHB(bill.net_amount)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 px-4 py-3 text-xs text-zinc-400">
              หน้านี้เป็นโครงสำหรับสรุปผลแบบ bill-based (รายละเอียดได้/เสียต่อเลขจะเพิ่มโดยแอดมินภายหลัง)
            </div>

            <div className="grid gap-2">
              {records.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">เลข {r.number}</p>
                    <p className="text-xs text-zinc-500">{formatTHB(r.amount)}</p>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">ประเภท: {r.type}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

