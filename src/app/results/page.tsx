"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import liff from "@line/liff";
import { ensureLiffReady } from "@/src/lib/liffAuth";
import { getBills, type BillRow } from "@/src/lib/supabase";

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

export default function ResultsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bills, setBills] = useState<BillRow[]>([]);
  const abortRef = useRef({ aborted: false });

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

        const all = await getBills(p.userId);
        if (abortState.aborted) return;
        setBills(all.filter((b) => b.status === "settled"));
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
  }, []);

  return (
    <main className="min-h-screen bg-black text-white px-5 py-6">
      <section className="max-w-md mx-auto">
        <header className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight">สรุปผลหวย</h1>
            <p className="text-sm text-zinc-500 break-all">
              {userId ? `userId: ${userId}` : "กำลังโหลดผู้ใช้..."}
            </p>
          </div>
          <Link
            href="/"
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200 transition-all duration-200 hover:bg-zinc-800/70 hover:-translate-y-0.5 active:scale-[0.99]"
          >
            กลับหน้าแรก
          </Link>
        </header>

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
                className="block rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_14px_36px_rgba(0,0,0,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-950/70"
              >
                <p className="text-xs text-zinc-500">{b.bill_no}</p>
                <p className="text-sm font-semibold text-zinc-100 mt-1">
                  {b.lottery_name ?? "-"}
                </p>
                <p className="text-xs text-zinc-500 mt-1">{formatDate(b.created_at)}</p>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2">
                    <p className="text-xs text-zinc-500">ยอดรวม</p>
                    <p className="font-semibold">{formatTHB(b.total_amount)}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2">
                    <p className="text-xs text-zinc-500">สุทธิ</p>
                    <p className="font-semibold">{formatTHB(b.net_amount)}</p>
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

