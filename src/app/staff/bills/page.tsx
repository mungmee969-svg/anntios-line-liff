"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  record_count: number;
};

function fmt(n: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(n);
}

function fmtDt(iso: string) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

export default function StaffBillsPage() {
  return (
    <Suspense fallback={<div className="text-zinc-500 text-sm py-8">กำลังโหลด...</div>}>
      <StaffBillsInner />
    </Suspense>
  );
}

function StaffBillsInner() {
  const searchParams = useSearchParams();
  const { authFetch } = useLiffAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [status, setStatus] = useState("");
  const [lottery, setLottery] = useState("");
  const [billNo, setBillNo] = useState("");
  const [userId, setUserId] = useState(() => searchParams.get("userId") ?? "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    if (status) sp.set("status", status);
    if (lottery) sp.set("lotteryName", lottery);
    if (billNo) sp.set("billNo", billNo);
    if (userId) sp.set("userId", userId);
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    const s = sp.toString();
    return s ? `?${s}` : "";
  }, [status, lottery, billNo, userId, from, to]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await authFetch(`/api/staff/bills${query}`);
      const j = (await res.json()) as { bills?: Bill[]; error?: string };
      if (!res.ok) throw new Error(j.error || "โหลดไม่สำเร็จ");
      setBills(j.bills ?? []);
    } catch (e) {
      setBills([]);
      setErr(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [authFetch, query]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <div className="space-y-4 min-h-0">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">บิลลูกค้า</h1>
        <p className="text-sm text-zinc-500">Phase 1: list + filters (เปิดรายละเอียดจะทำต่อใน Phase 2)</p>
      </div>

      {err ? (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-950/15 px-4 py-3 text-sm text-amber-100/90">
          ยังโหลดบิลไม่ได้ตอนนี้ — แสดงโหมดว่าง (รายละเอียด: {err})
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl bg-black/50 border border-white/10 px-3 py-2 text-sm"
        >
          <option value="">สถานะทั้งหมด</option>
          <option value="pending">pending</option>
          <option value="accepted">accepted</option>
          <option value="cancelled">cancelled</option>
          <option value="settled">settled</option>
        </select>
        <input
          placeholder="ชื่อหวย"
          value={lottery}
          onChange={(e) => setLottery(e.target.value)}
          className="rounded-xl bg-black/50 border border-white/10 px-3 py-2 text-sm"
        />
        <input
          placeholder="เลขบิล"
          value={billNo}
          onChange={(e) => setBillNo(e.target.value)}
          className="rounded-xl bg-black/50 border border-white/10 px-3 py-2 text-sm"
        />
        <input
          placeholder="userId ลูกค้า"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="rounded-xl bg-black/50 border border-white/10 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-xl bg-black/50 border border-white/10 px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="flex-1 rounded-xl bg-black/50 border border-white/10 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-xl bg-emerald-500/90 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            ค้น
          </button>
        </div>
      </div>

      <div className="hidden lg:block rounded-2xl border border-white/[0.08] overflow-hidden bg-black/30">
        <table className="w-full text-sm text-left">
          <thead className="bg-white/[0.04] text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">บิล</th>
              <th className="px-4 py-3">ลูกค้า</th>
              <th className="px-4 py-3">หวย</th>
              <th className="px-4 py-3">รายการ</th>
              <th className="px-4 py-3">ยอด</th>
              <th className="px-4 py-3">สถานะ</th>
              <th className="px-4 py-3">เวลา</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((b) => (
              <tr key={b.id} className="border-t border-white/[0.06] hover:bg-white/[0.04]">
                <td className="px-4 py-2 font-mono text-xs text-amber-200/90">{b.bill_no}</td>
                <td className="px-4 py-2 max-w-[180px] truncate">{b.display_name ?? b.user_id}</td>
                <td className="px-4 py-2 text-xs">{b.lottery_name ?? "—"}</td>
                <td className="px-4 py-2 tabular-nums">{b.record_count}</td>
                <td className="px-4 py-2 tabular-nums">{fmt(b.total_amount)}</td>
                <td className="px-4 py-2">
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs">{b.status}</span>
                </td>
                <td className="px-4 py-2 text-xs text-zinc-500 whitespace-nowrap">{fmtDt(b.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="lg:hidden grid gap-2">
        {bills.map((b) => (
          <div key={b.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
            <p className="font-mono text-xs text-amber-200/90">{b.bill_no}</p>
            <p className="text-sm font-medium mt-1">{b.display_name ?? b.user_id}</p>
            <p className="text-xs text-zinc-500 mt-1">
              {b.lottery_name ?? "—"} • {b.record_count} รายการ
            </p>
            <div className="flex justify-between mt-2">
              <span className="text-xs">{b.status}</span>
              <span className="font-semibold tabular-nums">{fmt(b.total_amount)}</span>
            </div>
          </div>
        ))}
      </div>

      {bills.length === 0 && !loading ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 text-center">
          <p className="text-sm font-semibold text-zinc-200">ยังไม่มีบิลให้แสดง</p>
          <p className="text-xs text-zinc-500 mt-2">ลองเปลี่ยนตัวกรอง หรือรีเฟรชอีกครั้ง</p>
        </div>
      ) : null}
    </div>
  );
}

