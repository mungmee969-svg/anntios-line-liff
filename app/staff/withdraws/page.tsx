"use client";

import { useCallback, useEffect, useState } from "react";
import { useLiffAuth } from "@/src/components/LiffAuthProvider";

type Tx = {
  id: string;
  user_id: string;
  display_name: string | null;
  amount: number;
  status: string;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  note: string | null;
  created_at: string;
};

function fmt(n: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(n);
}

export default function StaffWithdrawsPage() {
  const { authFetch } = useLiffAuth();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/staff/transactions?type=withdraw&status=pending");
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
    if (!confirm("อนุมัติถอนและหักเครดิต?")) return;
    const res = await authFetch("/api/staff/withdraws/approve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ txId: id }),
    });
    const j = (await res.json()) as { error?: string };
    if (!res.ok) alert(j.error || "ล้มเหลว");
    await load();
  }

  async function reject(id: string) {
    const note = prompt("เหตุผลปฏิเสธ / หมายเหตุ") ?? "";
    const res = await authFetch("/api/staff/withdraws/reject", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ txId: id, adminNote: note }),
    });
    const j = (await res.json()) as { error?: string };
    if (!res.ok) alert(j.error || "ล้มเหลว");
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">ถอนเครดิต</h1>
          <p className="text-sm text-zinc-500">ตรวจยอดเครดิตก่อนอนุมัติทุกครั้ง</p>
        </div>
        <button type="button" onClick={load} className="rounded-xl border border-white/10 px-4 py-2 text-sm">
          รีเฟรช
        </button>
      </div>

      <div className="grid gap-3">
        {txs.map((t) => (
          <article key={t.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
            <p className="font-semibold">{t.display_name ?? t.user_id}</p>
            <p className="text-xs text-zinc-500 break-all">{t.user_id}</p>
            <p className="text-lg font-bold text-rose-100/90 mt-2 tabular-nums">{fmt(t.amount)}</p>
            <div className="mt-3 text-xs text-zinc-400 space-y-1">
              <p>ธนาคาร: {t.bank_name ?? "—"}</p>
              <p>ชื่อบัญชี: {t.account_name ?? "—"}</p>
              <p>เลขบัญชี: {t.account_number ?? "—"}</p>
              {t.note ? <p>หมายเหตุ: {t.note}</p> : null}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                type="button"
                onClick={() => approve(t.id)}
                className="rounded-xl bg-white py-2 text-sm font-semibold text-black"
              >
                อนุมัติถอน
              </button>
              <button
                type="button"
                onClick={() => reject(t.id)}
                className="rounded-xl border border-white/15 py-2 text-sm"
              >
                ปฏิเสธ
              </button>
            </div>
          </article>
        ))}
        {txs.length === 0 && !loading ? (
          <p className="text-sm text-zinc-500 text-center py-8">ไม่มีรายการ</p>
        ) : null}
      </div>
    </div>
  );
}
