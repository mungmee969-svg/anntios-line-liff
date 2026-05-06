"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import liff from "@line/liff";
import { useAdminGuard } from "@/src/components/AdminGuard";

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

async function authedAdminFetch(input: RequestInfo, init: RequestInit = {}) {
  const idToken = liff.getIDToken();
  if (!idToken) throw new Error("Missing LINE id token");
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${idToken}`);
  return fetch(input, { ...init, headers });
}

export default function AdminBillsPage() {
  const { isReady, isAdmin, error } = useAdminGuard();
  const [bills, setBills] = useState<Bill[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("pending");
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
  }, [query]);

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

  if (!isReady) return <main className="min-h-screen bg-black text-white px-5 py-6">Loading...</main>;
  if (error) return <main className="min-h-screen bg-black text-white px-5 py-6">{error}</main>;
  if (!isAdmin) return <main className="min-h-screen bg-black text-white px-5 py-6">Forbidden</main>;

  return (
    <main className="min-h-screen bg-black text-white px-5 py-6">
      <section className="max-w-2xl mx-auto">
        <header className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Admin • บิล</h1>
            <p className="text-sm text-zinc-500">จัดการบิล/ยกเลิกบิล</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin" className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm">
              เมนู
            </Link>
          </div>
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
          <div className="grid gap-3">
            {bills.map((b) => (
              <article key={b.id} className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black p-5">
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
                    <p className="text-sm font-semibold">{formatTHB(b.total_amount)}</p>
                    <p className="text-xs text-zinc-500 mt-1">{b.status}</p>
                  </div>
                </div>

                {b.status !== "cancelled" && b.status !== "settled" && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Link
                      href={`/history/${b.id}`}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm font-semibold text-center"
                    >
                      ดูรายละเอียด
                    </Link>
                    <button
                      type="button"
                      onClick={() => cancelBill(b.id)}
                      className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"
                    >
                      ยกเลิกบิล
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

