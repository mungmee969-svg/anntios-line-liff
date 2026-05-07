"use client";

import { useCallback, useEffect, useState } from "react";
import { useLiffAuth } from "@/src/components/LiffAuthProvider";

type Tx = {
  id: string;
  user_id: string;
  display_name: string | null;
  amount: number;
  status: string;
  slip_url: string | null;
  bank_name: string | null;
  note: string | null;
  created_at: string;
};

function fmt(n: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(n);
}

export default function StaffDepositsPage() {
  const { authFetch } = useLiffAuth();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/staff/transactions?type=deposit&status=pending");
      const j = (await res.json()) as { transactions?: Tx[]; error?: string };
      if (!res.ok) throw new Error(j.error || "โหลดไม่สำเร็จ");
      setTxs(j.transactions ?? []);
    } catch (e) {
      alert(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function approve(id: string) {
    if (!confirm("อนุมัติการเติมเครดิต?")) return;
    const res = await authFetch("/api/staff/deposits/approve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ txId: id }),
    });
    const j = (await res.json()) as { error?: string };
    if (!res.ok) alert(j.error || "ล้มเหลว");
    await load();
  }

  async function reject(id: string) {
    const note = prompt("เหตุผลปฏิเสธ") ?? "";
    const res = await authFetch("/api/staff/deposits/reject", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ txId: id, adminNote: note }),
    });
    const j = (await res.json()) as { error?: string };
    if (!res.ok) alert(j.error || "ล้มเหลว");
    await load();
  }

  async function messageCustomer(userId: string) {
    const text = prompt("ข้อความถึงลูกค้า (LINE)") ?? "";
    if (!text.trim()) return;
    const res = await authFetch("/api/staff/customers/message", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, text }),
    });
    const j = (await res.json()) as { error?: string };
    if (!res.ok) alert(j.error || "ส่งไม่สำเร็จ");
    else alert("ส่งแล้ว");
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">เติมเครดิต</h1>
          <p className="text-sm text-zinc-500">รายการรออนุมัติ</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm"
        >
          รีเฟรช
        </button>
      </div>

      {preview ? (
        <div className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="max-h-[90vh] max-w-full rounded-xl" onClick={(e) => e.stopPropagation()} />
        </div>
      ) : null}

      <div className="grid gap-3">
        {txs.map((t) => (
          <article
            key={t.id}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-4"
          >
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-semibold">{t.display_name ?? t.user_id}</p>
                <p className="text-xs text-zinc-500 break-all">{t.user_id}</p>
                <p className="text-lg font-bold text-amber-100 mt-2 tabular-nums">{fmt(t.amount)}</p>
                {t.bank_name ? <p className="text-xs text-zinc-400 mt-1">ธนาคาร: {t.bank_name}</p> : null}
                {t.note ? <p className="text-xs text-zinc-500 mt-1">{t.note}</p> : null}
              </div>
              {t.slip_url ? (
                <button
                  type="button"
                  onClick={() => setPreview(t.slip_url)}
                  className="shrink-0 rounded-xl border border-emerald-500/30 overflow-hidden h-24 w-24"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.slip_url} alt="" className="h-full w-full object-cover" />
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
              <button
                type="button"
                onClick={() => approve(t.id)}
                className="rounded-xl bg-emerald-500 py-2 text-sm font-semibold text-black"
              >
                อนุมัติ
              </button>
              <button
                type="button"
                onClick={() => reject(t.id)}
                className="rounded-xl border border-rose-500/40 py-2 text-sm text-rose-100"
              >
                ปฏิเสธ
              </button>
              <button
                type="button"
                onClick={() => messageCustomer(t.user_id)}
                className="rounded-xl border border-white/10 py-2 text-sm col-span-2 sm:col-span-2"
              >
                ส่งข้อความหาลูกค้า
              </button>
            </div>
          </article>
        ))}
        {txs.length === 0 && !loading ? (
          <p className="text-sm text-zinc-500 text-center py-8">ไม่มีรายการ pending</p>
        ) : null}
      </div>
    </div>
  );
}
