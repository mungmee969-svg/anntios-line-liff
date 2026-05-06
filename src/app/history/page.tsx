"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import liff from "@line/liff";
import { getRecords, type RecordRow } from "@/src/lib/supabase";

type RecordStatus = "รอดำเนินการ" | "สำเร็จ" | "ยกเลิก";

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

function typePill(t: RecordRow["type"]) {
  return (
    <span className="rounded-full border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-xs text-zinc-200">
      {t}
    </span>
  );
}

function statusFromId(id: string): RecordStatus {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum = (sum + id.charCodeAt(i)) % 997;
  const m = sum % 3;
  if (m === 0) return "รอดำเนินการ";
  if (m === 1) return "สำเร็จ";
  return "ยกเลิก";
}

function statusStyle(status: RecordStatus) {
  switch (status) {
    case "รอดำเนินการ":
      return "border-amber-900/50 bg-amber-950/25 text-amber-200";
    case "สำเร็จ":
      return "border-emerald-900/50 bg-emerald-950/25 text-emerald-200";
    case "ยกเลิก":
      return "border-rose-900/50 bg-rose-950/25 text-rose-200";
  }
}

export default function HistoryPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const abortRef = useRef<{ aborted: boolean }>({ aborted: false });

  const headerSubtitle = useMemo(() => {
    if (!userId) return "กำลังโหลดผู้ใช้จาก LINE...";
    return `userId: ${userId}`;
  }, [userId]);

  useEffect(() => {
    abortRef.current.aborted = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      setRecords([]);

      try {
        await liff.init({ liffId: "2009989826-L6OPDoa5" });
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        const p = await liff.getProfile();
        if (abortRef.current.aborted) return;
        setUserId(p.userId);

        const data = await getRecords(p.userId);
        if (abortRef.current.aborted) return;
        setRecords(data);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่";
        setError(msg);
      } finally {
        if (!abortRef.current.aborted) setIsLoading(false);
      }
    }

    load();
    return () => {
      abortRef.current.aborted = true;
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
        ) : records.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 px-4 py-3 text-sm text-zinc-300">
            ยังไม่มีรายการ
          </div>
        ) : (
          <div className="grid gap-3">
            {records.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_14px_36px_rgba(0,0,0,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-950/70"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold tracking-tight">
                        เลข {item.number}
                      </p>
                      {typePill(item.type)}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      {formatDate(item.created_at)}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-xs ${statusStyle(
                      statusFromId(item.id),
                    )}`}
                  >
                    {statusFromId(item.id)}
                  </span>
                </div>

                <div className="mt-4 flex items-end justify-between">
                  <p className="text-sm text-zinc-500">จำนวนเงิน</p>
                  <p className="text-base font-semibold">{formatTHB(item.amount)}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

