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
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await authFetch("/api/staff/transactions?type=withdraw&status=pending");
      const j = (await res.json()) as { transactions?: Tx[]; error?: string };
      if (!res.ok) throw new Error(j.error || "โหลดไม่สำเร็จ");
      setTxs(j.transactions ?? []);
    } catch (e) {
      setTxs([]);
      setErr(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function approve(id: string) {
    setMsg(null);
    const res = await authFetch("/api/staff/withdraws/approve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ txId: id }),
    });
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setMsg(j.error || "อนุมัติไม่สำเร็จ");
      return;
    }
    setMsg("อนุมัติแล้ว");
    await load();
  }

  async function reject(id: string) {
    setMsg(null);
    const note = prompt("เหตุผลปฏิเสธ / หมายเหตุ") ?? "";
    const res = await authFetch("/api/staff/withdraws/reject", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ txId: id, adminNote: note }),
    });
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setMsg(j.error || "ปฏิเสธไม่สำเร็จ");
      return;
    }
    setMsg("ปฏิเสธแล้ว");
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

      {err ? (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-950/15 px-4 py-3 text-sm text-amber-100/90">
          ยังโหลดรายการไม่ได้ตอนนี้ — แสดงโหมดว่าง (รายละเอียด: {err})
        </div>
      ) : null}

      {msg ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-200">
          {msg}
        </div>
      ) : null}

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
                onClick={() => void approve(t.id)}
                className="rounded-xl bg-white py-2 text-sm font-semibold text-black"
              >
                อนุมัติถอน
              </button>
              <button
                type="button"
                onClick={() => void reject(t.id)}
                className="rounded-xl border border-white/15 py-2 text-sm"
              >
                ปฏิเสธ
              </button>
            </div>
          </article>
        ))}
        {txs.length === 0 && !loading ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 text-center">
            <p className="text-sm font-semibold text-zinc-200">ไม่มีรายการ</p>
            <p className="text-xs text-zinc-500 mt-2">เมื่อมีคำขอถอน ระบบจะแสดงที่นี่</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

