"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CreditBadge } from "@/components/CreditBadge";
import { useLiffAuth } from "@/src/components/LiffAuthProvider";
import { useWalletData } from "@/src/components/WalletDataProvider";
import type { BillRow, RecordRow } from "@/src/lib/supabase";

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

type RecordApi = RecordRow & {
  result_status?: string | null;
  win_amount?: number | null;
  lose_amount?: number | null;
};

type BillApi = BillRow & {
  credit_before?: number | null;
  credit_after?: number | null;
};

export default function ResultBillDetailPage() {
  const params = useParams();
  const billIdRaw = params?.billId;
  const billId = typeof billIdRaw === "string" ? billIdRaw : Array.isArray(billIdRaw) ? billIdRaw[0] : "";

  const { isSessionReady, authFetch } = useLiffAuth();
  const { wallet } = useWalletData();
  const [bill, setBill] = useState<BillApi | null>(null);
  const [records, setRecords] = useState<RecordApi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalBet = useMemo(() => records.reduce((s, r) => s + r.amount, 0), [records]);

  const load = useCallback(async () => {
    if (!billId?.trim()) {
      setError("ไม่พบรหัสบิล");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/bills/${encodeURIComponent(billId.trim())}`);
      const json = (await res.json().catch(() => ({}))) as unknown as {
        bill?: BillApi;
        records?: RecordApi[];
        error?: string;
      };
      if (!res.ok) throw new Error(json?.error || "โหลดไม่สำเร็จ");
      setBill(json.bill ?? null);
      setRecords(json.records ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, [authFetch, billId]);

  useEffect(() => {
    if (!isSessionReady || !billId?.trim()) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดบิลหลัง token พร้อม
    void load();
  }, [isSessionReady, billId, load]);

  const creditHint =
    typeof bill?.credit_after === "number"
      ? formatTHB(bill.credit_after)
      : wallet
        ? formatTHB(wallet.credit_balance)
        : "-";

  return (
    <main className="min-h-screen bg-black text-white px-4 py-6 sm:px-5">
      <section className="max-w-md mx-auto w-full min-w-0">
        <header className="flex items-center justify-between gap-3 mb-5">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight">รายละเอียดสรุปผล</h1>
            <p className="text-sm text-zinc-500 break-all">{billId || "-"}</p>
          </div>
          <Link
            href="/results"
            className="shrink-0 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200 active:scale-[0.99]"
          >
            กลับ
          </Link>
        </header>

        <div className="mb-4 min-w-0">
          <CreditBadge className="w-full max-w-full" subtitle="หลังอัปเดตจากระบบ" />
        </div>

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
        ) : bill.status !== "settled" ? (
          <div className="rounded-2xl border border-amber-900/50 bg-amber-950/25 px-4 py-3 text-sm text-amber-200">
            บิลนี้ยังไม่สรุปผล
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
                  <p className="font-semibold tabular-nums">{formatTHB(bill.total_amount ?? totalBet)}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2">
                  <p className="text-xs text-zinc-500">ได้รางวัลรวม</p>
                  <p className="font-semibold tabular-nums text-amber-200/95">{formatTHB(bill.win_amount)}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2">
                  <p className="text-xs text-zinc-500">ขาดทุนเดิมพัน</p>
                  <p className="font-semibold tabular-nums text-rose-200/85">{formatTHB(bill.lose_amount)}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2">
                  <p className="text-xs text-zinc-500">สุทธิ</p>
                  <p className="font-semibold tabular-nums">{formatTHB(bill.net_amount)}</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-emerald-900/45 bg-emerald-950/20 px-3 py-2">
                <p className="text-xs text-zinc-500">เครดิตหลังสรุป (จากบิล / โหลดล่าสุด)</p>
                <p className="font-semibold tabular-nums text-emerald-100">{creditHint}</p>
              </div>
            </div>

            <div className="grid gap-2">
              <p className="text-sm font-semibold text-zinc-300 px-1">รายเลข</p>
              {records.map((r) => {
                const st = r.result_status ?? "-";
                const lineWin = Number(r.win_amount ?? 0);
                const lineLose =
                  typeof r.lose_amount === "number" ? Number(r.lose_amount) : st === "lose" ? r.amount : 0;
                return (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">เลข {r.number}</p>
                      <p className="text-xs text-zinc-400 tabular-nums">{formatTHB(r.amount)}</p>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">ประเภท: {r.type}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full border border-zinc-700 px-2 py-0.5">ผล: {st}</span>
                      {lineWin > 0 ? (
                        <span className="rounded-full border border-amber-900/50 px-2 py-0.5 text-amber-100">
                          ได้ {formatTHB(lineWin)}
                        </span>
                      ) : null}
                      {lineLose > 0 ? (
                        <span className="rounded-full border border-rose-900/40 px-2 py-0.5 text-rose-100">
                          เสีย {formatTHB(lineLose)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
