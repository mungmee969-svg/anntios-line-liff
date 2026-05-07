"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useLiffAuth } from "@/src/components/LiffAuthProvider";

function fmt(n: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(n);
}

export default function StaffCustomerDetailPage() {
  const params = useParams();
  const raw = params?.userId;
  const userId = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "";
  const { authFetch } = useLiffAuth();
  const [data, setData] = useState<{
    wallet: Record<string, unknown> | null;
    bills: unknown[];
    transactions: unknown[];
    summary: { winTotal: number; loseTotal: number; netFromBills: number };
  } | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    const res = await authFetch(`/api/staff/customers/${encodeURIComponent(userId)}`);
    const j = (await res.json()) as typeof data & { error?: string };
    if (!res.ok) {
      alert(j.error || "โหลดไม่สำเร็จ");
      return;
    }
    setData(j as typeof data);
  }, [authFetch, userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function adjust() {
    const rawAmt = prompt("จำนวน (+เพิ่ม / -ลด)", "0") ?? "0";
    const amt = Number(rawAmt);
    if (!Number.isFinite(amt) || amt === 0) return;
    const note = prompt("หมายเหตุ") ?? "";
    if (!confirm("ยืนยันปรับเครดิต?")) return;
    const res = await authFetch("/api/staff/customers/adjust-credit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userId,
        displayName: data?.wallet?.display_name,
        amount: amt,
        note,
      }),
    });
    const j = (await res.json()) as { error?: string };
    if (!res.ok) alert(j.error || "ล้มเหลว");
    await load();
  }

  async function sendMsg() {
    const text = prompt("ข้อความ LINE") ?? "";
    if (!text.trim()) return;
    const res = await authFetch("/api/staff/customers/message", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, text }),
    });
    const j = (await res.json()) as { error?: string };
    if (!res.ok) alert(j.error || "ล้มเหลว");
    else alert("ส่งแล้ว");
  }

  if (!data) return <p className="text-zinc-500">โหลด...</p>;

  const w = data.wallet;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/staff/customers" className="text-sm text-emerald-400">
          ← กลับ
        </Link>
      </div>
      <h1 className="text-xl font-bold text-zinc-50 break-all">{userId}</h1>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 grid sm:grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-zinc-500 text-xs">เครดิต</p>
          <p className="text-lg font-bold text-amber-100 tabular-nums">
            {w ? fmt(Number(w.credit_balance ?? 0)) : "—"}
          </p>
        </div>
        <div>
          <p className="text-zinc-500 text-xs">ล็อก</p>
          <p className="text-lg font-semibold tabular-nums">{w ? fmt(Number(w.locked_balance ?? 0)) : "—"}</p>
        </div>
        <div>
          <p className="text-zinc-500 text-xs">ได้รางวัลรวม (บิลสรุป)</p>
          <p className="tabular-nums">{fmt(data.summary.winTotal)}</p>
        </div>
        <div>
          <p className="text-zinc-500 text-xs">ขาดทุนเดิมพันรวม</p>
          <p className="tabular-nums">{fmt(data.summary.loseTotal)}</p>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/staff/bills?userId=${encodeURIComponent(userId)}`}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm"
        >
          ดูบิล
        </Link>
        <button type="button" onClick={sendMsg} className="rounded-xl border border-emerald-500/30 px-4 py-2 text-sm text-emerald-100">
          ส่งข้อความ
        </button>
        <button type="button" onClick={adjust} className="rounded-xl bg-amber-500/90 px-4 py-2 text-sm font-semibold text-black">
          ปรับเครดิต (Owner/Manager)
        </button>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-zinc-400 mb-2">บิลล่าสุด</h2>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {(data.bills as { id: string; bill_no: string; total_amount: number; status: string }[]).map((b) => (
            <div key={b.id} className="flex justify-between text-xs border border-white/[0.06] rounded-lg px-3 py-2">
              <span className="font-mono text-amber-200/80">{b.bill_no}</span>
              <span>{b.status}</span>
              <span className="tabular-nums">{fmt(b.total_amount)}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-zinc-400 mb-2">ธุรกรรมกระเป๋า</h2>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {(data.transactions as { id: string; type: string; amount: number; status: string; created_at: string }[]).map(
            (t) => (
              <div key={t.id} className="flex justify-between text-xs border border-white/[0.06] rounded-lg px-3 py-2">
                <span>{t.type}</span>
                <span>{t.status}</span>
                <span className="tabular-nums">{fmt(t.amount)}</span>
              </div>
            ),
          )}
        </div>
      </section>
    </div>
  );
}
