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
  slip_url: string | null;
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

export default function AdminWalletPage() {
  const { authFetch } = useLiffAuth();
  const authedAdminFetch = useCallback(
    (input: RequestInfo, init: RequestInit = {}) => authFetch(input, init),
    [authFetch],
  );
  const { isReady, isAdmin, error } = useAdminGuard();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [filterType, setFilterType] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    if (filterStatus) sp.set("status", filterStatus);
    if (filterType) sp.set("type", filterType);
    const s = sp.toString();
    return s ? `?${s}` : "";
  }, [filterStatus, filterType]);

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

  async function approve(txId: string, kind: "deposit" | "withdraw") {
    const ok = confirm("ยืนยันอนุมัติรายการนี้?");
    if (!ok) return;
    const endpoint =
      kind === "deposit" ? "/api/admin/approve-deposit" : "/api/admin/approve-withdraw";
    const res = await authedAdminFetch(endpoint, {
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
    const tx = txs.find((x) => x.id === txId);
    const endpoint = tx?.type === "withdraw" ? "/api/admin/reject-withdraw" : "/api/admin/reject-deposit";
    const res = await authedAdminFetch(endpoint, {
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [isReady, isAdmin, load]);

  if (!isReady) return <main className="min-h-screen bg-black text-white px-5 py-6">Loading...</main>;
  if (error) return <main className="min-h-screen bg-black text-white px-5 py-6">{error}</main>;
  if (!isAdmin) return <main className="min-h-screen bg-black text-white px-5 py-6">Forbidden</main>;

  return (
    <main className="min-h-screen bg-black text-white px-5 py-6">
      <section className="max-w-2xl mx-auto">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight">รวมธุรกรรมเครดิต</h1>
            <p className="text-sm text-zinc-500">แนะนำให้ไป เติม / ถอน จากเมนูแอดมิน</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Link href="/admin/deposits" className="text-xs underline text-emerald-400">
                คำขอเติม →
              </Link>
              <Link href="/admin/withdraws" className="text-xs underline text-emerald-400">
                คำขอถอน →
              </Link>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/dashboard"
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm"
            >
              แดชบอร์ด
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm"
            >
              หน้าแรก
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
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm"
            >
              <option value="">ทุกประเภท</option>
              <option value="deposit">deposit</option>
              <option value="withdraw">withdraw</option>
            </select>
          </div>
          <button
            type="button"
            onClick={load}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
            disabled={isLoading}
          >
            {isLoading ? "กำลังโหลด..." : "รีเฟรช"}
          </button>
        </div>

        {txs.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 px-4 py-3 text-sm text-zinc-300">
            ไม่มีรายการ
          </div>
        ) : (
          <div className="grid gap-3">
            {txs.map((t) => (
              <article
                key={t.id}
                className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {t.type === "deposit" ? "เติมเครดิต" : t.type === "withdraw" ? "ถอนเครดิต" : t.type}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1 break-all">
                      {t.user_id} • {t.display_name ?? "-"}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">{formatDate(t.created_at)}</p>
                    {t.note && <p className="text-xs text-zinc-400 mt-1">{t.note}</p>}
                    {t.slip_url ? (
                      <div className="mt-3 grid gap-2">
                        <a
                          href={t.slip_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-cyan-200 inline-block"
                        >
                          เปิดรูปสลิป
                        </a>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={t.slip_url}
                          alt="slip"
                          className="w-full max-w-full rounded-xl border border-zinc-800 bg-zinc-950/40"
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatTHB(t.amount)}</p>
                    <p className="text-xs text-zinc-500 mt-1">{t.status}</p>
                  </div>
                </div>

                {t.status === "pending" && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => approve(t.id, t.type === "withdraw" ? "withdraw" : "deposit")}
                      className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"
                    >
                      อนุมัติ
                    </button>
                    <button
                      type="button"
                      onClick={() => reject(t.id)}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm font-semibold"
                    >
                      ปฏิเสธ
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

