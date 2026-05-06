"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminGuard } from "@/src/components/AdminGuard";
import { useLiffAuth } from "@/src/components/LiffAuthProvider";

type Tx = {
  id: string;
  user_id: string;
  display_name: string | null;
  type: string;
  amount: number;
  status: string;
  bank_name?: string | null;
  account_name?: string | null;
  account_number?: string | null;
  note: string | null;
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

export default function AdminWithdrawsPage() {
  const { authFetch } = useLiffAuth();
  const authedAdminFetch = useCallback(
    (input: RequestInfo, init: RequestInit = {}) => authFetch(input, init),
    [authFetch],
  );
  const { isReady, isAdmin, error } = useAdminGuard();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [isLoading, setIsLoading] = useState(false);

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("type", "withdraw");
    if (filterStatus) sp.set("status", filterStatus);
    return `?${sp.toString()}`;
  }, [filterStatus]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await authedAdminFetch(`/api/admin/transactions${query}`);
      const json = (await res.json().catch(() => ({}))) as unknown as { transactions?: Tx[]; error?: string };
      if (!res.ok) throw new Error(json?.error || "โหลดไม่สำเร็จ");
      setTxs(json.transactions ?? []);
    } catch (e) {
      alert(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, [query, authedAdminFetch]);

  async function approve(txId: string) {
    if (!confirm("ยืนยันโอนเงินคืนและอนุมัติถอนเครดิต?")) return;
    const res = await authedAdminFetch("/api/admin/approve-withdraw", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ txId }),
    });
    const json = (await res.json().catch(() => ({}))) as unknown as { error?: string };
    if (!res.ok) {
      alert(json?.error || "ทำรายการไม่สำเร็จ");
      return;
    }
    await load();
  }

  async function reject(txId: string) {
    const reason = prompt("เหตุผล (optional)") ?? "";
    const res = await authedAdminFetch("/api/admin/reject-withdraw", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ txId, adminNote: reason }),
    });
    const json = (await res.json().catch(() => ({}))) as unknown as { error?: string };
    if (!res.ok) {
      alert(json?.error || "ทำรายการไม่สำเร็จ");
      return;
    }
    await load();
  }

  useEffect(() => {
    if (!isReady || !isAdmin) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดรายการหลังยืนยันแอดมิน
    void load();
  }, [isReady, isAdmin, load]);

  if (!isReady) return <main className="px-4 py-6 text-zinc-400">กำลังโหลด...</main>;
  if (error) return <main className="px-4 py-6 text-rose-200">{error}</main>;
  if (!isAdmin) return <main className="px-4 py-6">ไม่มีสิทธิ์</main>;

  return (
    <main className="px-4 py-6 max-w-3xl mx-auto">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">คำขอถอนเครดิต</h1>
          <p className="text-sm text-zinc-500">ประเภท withdraw เท่านั้น</p>
        </div>
        <Link href="/admin/dashboard" className="text-sm text-emerald-400 underline-offset-2 hover:underline">
          แดชบอร์ด
        </Link>
      </header>

      <div className="grid gap-3 mb-4 sm:grid-cols-[1fr_auto]">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm"
        >
          <option value="">ทุกสถานะ</option>
          <option value="pending">pending</option>
          <option value="approved">approved</option>
          <option value="rejected">rejected</option>
        </select>
        <button
          type="button"
          onClick={load}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
          disabled={isLoading}
        >
          {isLoading ? "โหลด..." : "รีเฟรช"}
        </button>
      </div>

      {txs.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 px-4 py-3 text-sm text-zinc-400">
          ไม่มีรายการ
        </div>
      ) : (
        <div className="grid gap-3">
          {txs.map((t) => (
            <article key={t.id} className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 text-sm">
                  <p className="font-semibold">{t.display_name ?? t.user_id}</p>
                  <p className="text-xs text-zinc-500 break-all">{t.user_id}</p>
                  <p className="text-xs text-zinc-500 mt-1">{formatDate(t.created_at)}</p>
                  <div className="mt-3 text-xs text-zinc-400 space-y-1">
                    <p>ธนาคาร: {t.bank_name ?? "—"}</p>
                    <p>ชื่อบัญชี: {t.account_name ?? "—"}</p>
                    <p>เลขบัญชี: {t.account_number ?? "—"}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold tabular-nums">{formatTHB(t.amount)}</p>
                  <span className="inline-block mt-2 text-xs rounded-full border border-zinc-700 px-2 py-0.5">
                    {t.status}
                  </span>
                </div>
              </div>
              {t.status === "pending" ? (
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => approve(t.id)}
                    className="rounded-xl bg-white py-2 text-sm font-semibold text-black"
                  >
                    อนุมัติ
                  </button>
                  <button
                    type="button"
                    onClick={() => reject(t.id)}
                    className="rounded-xl border border-zinc-700 py-2 text-sm font-semibold"
                  >
                    ปฏิเสธ
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
