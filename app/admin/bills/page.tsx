"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAdminGuard } from "@/src/components/AdminGuard";
import { useLiffAuth } from "@/src/components/LiffAuthProvider";

type Bill = {
  id: string;
  bill_no: string;
  user_id: string;
  display_name: string | null;
  lottery_name: string | null;
  bet_type: string | null;
  total_amount: number;
  status: string;
  created_at: string;
};

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

function StatusBadge({ status, className = "" }: { status: string; className?: string }) {
  const map: Record<string, string> = {
    pending: "border-amber-800/60 bg-amber-950/35 text-amber-200",
    accepted: "border-sky-800/50 bg-sky-950/30 text-sky-200",
    rejected: "border-rose-800/50 bg-rose-950/30 text-rose-200",
    settled: "border-emerald-800/50 bg-emerald-950/30 text-emerald-200",
    cancelled: "border-zinc-700 bg-zinc-900/40 text-zinc-300",
  };
  return (
    <span
      className={`text-xs rounded-full border px-2 py-0.5 capitalize ${map[status] ?? map.pending} ${className}`}
    >
      {status}
    </span>
  );
}

export default function AdminBillsPage() {
  return (
    <Suspense fallback={<main className="px-4 py-6 text-zinc-400">กำลังโหลด...</main>}>
      <AdminBillsInner />
    </Suspense>
  );
}

function AdminBillsInner() {
  const searchParams = useSearchParams();
  const { authFetch } = useLiffAuth();
  const authedAdminFetch = useCallback(
    (input: RequestInfo, init: RequestInit = {}) => authFetch(input, init),
    [authFetch],
  );
  const { isReady, isAdmin, error } = useAdminGuard();
  const [bills, setBills] = useState<Bill[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>(
    () => searchParams.get("status") ?? "pending",
  );
  const [isLoading, setIsLoading] = useState(false);

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    if (filterStatus) sp.set("status", filterStatus);
    const s = sp.toString();
    return s ? `?${s}` : "";
  }, [filterStatus]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await authedAdminFetch(`/api/admin/bills${query}`);
      const json = (await res.json().catch(() => ({}))) as unknown as { bills?: Bill[]; error?: string };
      if (!res.ok) throw new Error(json?.error || "โหลดไม่สำเร็จ");
      setBills(json.bills ?? []);
    } catch (e) {
      alert(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, [query, authedAdminFetch]);

  async function cancelBill(billId: string) {
    const reason = prompt("เหตุผลยกเลิก (optional)") ?? "";
    const ok = confirm("ยืนยันยกเลิกบิลนี้? (จะคืนเครดิต)");
    if (!ok) return;
    const res = await authedAdminFetch("/api/admin/cancel-bill", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ billId, reason }),
    });
    const json = (await res.json().catch(() => ({}))) as unknown as { error?: string };
    if (!res.ok) {
      alert(json?.error || "ยกเลิกไม่สำเร็จ");
      return;
    }
    await load();
  }

  useEffect(() => {
    if (!isReady || !isAdmin) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [isReady, isAdmin, load]);

  if (!isReady) return <main className="px-4 py-6 text-zinc-400">กำลังโหลด...</main>;
  if (error) return <main className="px-4 py-6 text-rose-200">{error}</main>;
  if (!isAdmin) return <main className="px-4 py-6">ไม่มีสิทธิ์</main>;

  return (
    <main className="px-4 py-6 text-white max-w-5xl mx-auto w-full">
      <section className="w-full">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight">บิลลูกค้า</h1>
            <p className="text-sm text-zinc-500">กรองสถานะ / ยกเลิก / ส่งบิลใหม่</p>
          </div>
          <Link href="/admin/dashboard" className="text-sm text-emerald-400 hover:underline underline-offset-2">
            แดชบอร์ด
          </Link>
        </header>

        <div className="grid gap-3 mb-4">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm"
            >
              <option value="">ทุกสถานะ</option>
              <option value="pending">pending</option>
              <option value="accepted">accepted</option>
              <option value="rejected">rejected</option>
              <option value="cancelled">cancelled</option>
              <option value="settled">settled</option>
            </select>
            <button
              type="button"
              onClick={load}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
              disabled={isLoading}
            >
              {isLoading ? "กำลังโหลด..." : "รีเฟรช"}
            </button>
          </div>
        </div>

        {bills.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 px-4 py-3 text-sm text-zinc-300">
            ไม่มีบิล
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-zinc-800">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-950/80 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">บิล</th>
                    <th className="px-4 py-3">ลูกค้า</th>
                    <th className="px-4 py-3">หวย</th>
                    <th className="px-4 py-3">ยอด</th>
                    <th className="px-4 py-3">สถานะ</th>
                    <th className="px-4 py-3">การทำงาน</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((b) => (
                    <tr key={b.id} className="border-t border-zinc-800/80">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-zinc-400">{b.bill_no}</div>
                        <div className="text-xs text-zinc-500">{formatDate(b.created_at)}</div>
                      </td>
                      <td className="px-4 py-3 break-all max-w-[200px]">{b.display_name ?? b.user_id}</td>
                      <td className="px-4 py-3">
                        <div>{b.lottery_name ?? "-"}</div>
                        <div className="text-xs text-zinc-500">{b.bet_type ?? "-"}</div>
                      </td>
                      <td className="px-4 py-3 tabular-nums font-medium">{formatTHB(b.total_amount)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2">
                          <Link
                            href={`/admin/bills/${b.id}`}
                            className="text-center rounded-xl border border-zinc-700 bg-zinc-900/50 px-2 py-1.5 font-medium"
                          >
                            รายละเอียด
                          </Link>
                          {b.status !== "cancelled" && b.status !== "settled" ? (
                            <button
                              type="button"
                              onClick={() => cancelBill(b.id)}
                              className="rounded-xl bg-rose-950/50 border border-rose-900/50 px-2 py-1.5 font-medium text-rose-100"
                            >
                              ยกเลิกบิล
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden grid gap-3">
              {bills.map((b) => (
                <article
                  key={b.id}
                  className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-zinc-500">{b.bill_no}</p>
                      <p className="text-sm font-semibold text-zinc-100 mt-1">
                        {b.lottery_name ?? "-"} • {b.bet_type ?? "-"}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1 break-all">
                        {b.user_id} • {b.display_name ?? "-"}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">{formatDate(b.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">{formatTHB(b.total_amount)}</p>
                      <StatusBadge status={b.status} className="mt-2 inline-block" />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Link
                      href={`/admin/bills/${b.id}`}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm font-semibold text-center"
                    >
                      รายละเอียด
                    </Link>
                    {b.status !== "cancelled" && b.status !== "settled" ? (
                      <button
                        type="button"
                        onClick={() => cancelBill(b.id)}
                        className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"
                      >
                        ยกเลิกบิล
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

