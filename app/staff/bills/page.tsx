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

type RecordRow = {
  id: string;
  number: string;
  type: string;
  amount: number;
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
  const [selected, setSelected] = useState<Bill | null>(null);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [draw, setDraw] = useState({
    lotteryName: "",
    twoTop: "",
    twoBottom: "",
    threeTop: "",
    threeTode: "",
    runTop: "",
    runBottom: "",
  });

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
    try {
      const res = await authFetch(`/api/staff/bills${query}`);
      const j = (await res.json()) as { bills?: Bill[]; error?: string };
      if (!res.ok) throw new Error(j.error || "โหลดไม่สำเร็จ");
      setBills(j.bills ?? []);
    } catch (e) {
      alert(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [authFetch, query]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const openDetail = async (b: Bill) => {
    setSelected(b);
    setDetailLoading(true);
    setDraw((d) => ({
      ...d,
      lotteryName: b.lottery_name ?? "",
    }));
    try {
      const res = await authFetch(`/api/staff/bills/${b.id}`);
      const j = (await res.json()) as { records?: RecordRow[]; error?: string };
      if (!res.ok) throw new Error(j.error || "โหลดไม่สำเร็จ");
      setRecords(j.records ?? []);
    } catch (e) {
      alert(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    } finally {
      setDetailLoading(false);
    }
  };

  async function cancelBill() {
    if (!selected) return;
    const reason = prompt("เหตุผลยกเลิก") ?? "";
    if (!confirm("ยืนยันยกเลิกและคืนเครดิต?")) return;
    const res = await authFetch("/api/staff/bills/cancel", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ billId: selected.id, reason }),
    });
    const j = (await res.json()) as { error?: string };
    if (!res.ok) {
      alert(j.error || "ล้มเหลว");
      return;
    }
    setSelected(null);
    await load();
  }

  async function resendLine() {
    if (!selected) return;
    if (!confirm("ส่งบิลเข้า LINE ลูกค้า?")) return;
    const res = await authFetch("/api/staff/bills/resend-line", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ billId: selected.id }),
    });
    const j = (await res.json()) as { error?: string };
    if (!res.ok) alert(j.error || "ล้มเหลว");
    else alert("ส่งแล้ว");
  }

  async function settleThisBill() {
    if (!selected) return;
    const threeStraight = draw.threeTop || draw.threeTode;
    if (!draw.twoTop || !draw.twoBottom || !threeStraight) {
      alert("กรอกผลหวยให้ครบก่อนสรุปบิลนี้");
      return;
    }
    if (!confirm("สรุปผลเฉพาะบิลนี้?")) return;
    const res = await authFetch("/api/staff/bills/settle-one", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        billId: selected.id,
        lotteryName: draw.lotteryName || selected.lottery_name,
        twoTop: draw.twoTop,
        twoBottom: draw.twoBottom,
        threeStraight,
        threeTop: draw.threeTop || undefined,
        threeTode: draw.threeTode || undefined,
        runTop: draw.runTop,
        runBottom: draw.runBottom,
      }),
    });
    const j = (await res.json()) as { error?: string };
    if (!res.ok) alert(j.error || "ล้มเหลว");
    else {
      alert("สรุปผลแล้ว");
      setSelected(null);
      await load();
    }
  }

  return (
    <div className="space-y-4 min-h-0">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">บิลลูกค้า</h1>
        <p className="text-sm text-zinc-500">ตารางแบบ OS — กรองและเปิดรายละเอียด</p>
      </div>

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
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-xl bg-black/50 border border-white/10 px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="flex-1 rounded-xl bg-black/50 border border-white/10 px-3 py-2 text-sm" />
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
              <tr
                key={b.id}
                className="border-t border-white/[0.06] hover:bg-white/[0.04] cursor-pointer"
                onClick={() => void openDetail(b)}
              >
                <td className="px-4 py-2 font-mono text-xs text-amber-200/90">{b.bill_no}</td>
                <td className="px-4 py-2 max-w-[140px] truncate">{b.display_name ?? b.user_id}</td>
                <td className="px-4 py-2 text-xs">{b.lottery_name}</td>
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
          <button
            key={b.id}
            type="button"
            onClick={() => void openDetail(b)}
            className="text-left rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 active:scale-[0.99]"
          >
            <p className="font-mono text-xs text-amber-200/90">{b.bill_no}</p>
            <p className="text-sm font-medium mt-1">{b.display_name ?? b.user_id}</p>
            <p className="text-xs text-zinc-500 mt-1">
              {b.lottery_name} • {b.record_count} รายการ
            </p>
            <div className="flex justify-between mt-2">
              <span className="text-xs">{b.status}</span>
              <span className="font-semibold tabular-nums">{fmt(b.total_amount)}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Drawer / sheet */}
      {selected ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm lg:bg-black/40"
            aria-label="ปิด"
            onClick={() => setSelected(null)}
          />
          <aside className="fixed z-[70] inset-0 lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[440px] flex flex-col bg-[#0a0c10] border-l border-white/[0.08] shadow-[-12px_0_48px_rgba(0,0,0,0.5)]">
            <div className="shrink-0 flex items-center justify-between gap-2 p-4 border-b border-white/[0.08]">
              <div className="min-w-0">
                <p className="text-xs text-zinc-500">รายละเอียดบิล</p>
                <p className="font-mono text-sm text-amber-200/90 truncate">{selected.bill_no}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs"
              >
                ปิด
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-sm space-y-1">
                <p>
                  <span className="text-zinc-500">ลูกค้า:</span> {selected.display_name ?? selected.user_id}
                </p>
                <p>
                  <span className="text-zinc-500">หวย:</span> {selected.lottery_name} / {selected.bet_type}
                </p>
                <p>
                  <span className="text-zinc-500">ยอด:</span> {fmt(selected.total_amount)}
                </p>
                <p>
                  <span className="text-zinc-500">สถานะ:</span> {selected.status}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={resendLine}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-3 py-2 text-xs font-semibold text-emerald-100"
                >
                  ส่ง LINE
                </button>
                {selected.status !== "cancelled" && selected.status !== "settled" ? (
                  <button
                    type="button"
                    onClick={cancelBill}
                    className="rounded-xl border border-rose-500/35 bg-rose-950/40 px-3 py-2 text-xs font-semibold text-rose-100"
                  >
                    ยกเลิกบิล
                  </button>
                ) : null}
              </div>

              {selected.status !== "settled" ? (
                <div className="rounded-xl border border-amber-500/20 bg-amber-950/15 p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-100/90">ตรวจผลเฉพาะบิลนี้</p>
                  <input
                    className="w-full rounded-lg bg-black/50 border border-white/10 px-2 py-1.5 text-xs"
                    placeholder="3 ตัวบน (ตรง)"
                    value={draw.threeTop}
                    onChange={(e) => setDraw((d) => ({ ...d, threeTop: e.target.value }))}
                  />
                  <input
                    className="w-full rounded-lg bg-black/50 border border-white/10 px-2 py-1.5 text-xs"
                    placeholder="3 ตัวโต๊ด"
                    value={draw.threeTode}
                    onChange={(e) => setDraw((d) => ({ ...d, threeTode: e.target.value }))}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="rounded-lg bg-black/50 border border-white/10 px-2 py-1.5 text-xs"
                      placeholder="2 บน"
                      value={draw.twoTop}
                      onChange={(e) => setDraw((d) => ({ ...d, twoTop: e.target.value }))}
                    />
                    <input
                      className="rounded-lg bg-black/50 border border-white/10 px-2 py-1.5 text-xs"
                      placeholder="2 ล่าง"
                      value={draw.twoBottom}
                      onChange={(e) => setDraw((d) => ({ ...d, twoBottom: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="rounded-lg bg-black/50 border border-white/10 px-2 py-1.5 text-xs"
                      placeholder="วิ่งบน"
                      value={draw.runTop}
                      onChange={(e) => setDraw((d) => ({ ...d, runTop: e.target.value }))}
                    />
                    <input
                      className="rounded-lg bg-black/50 border border-white/10 px-2 py-1.5 text-xs"
                      placeholder="วิ่งล่าง"
                      value={draw.runBottom}
                      onChange={(e) => setDraw((d) => ({ ...d, runBottom: e.target.value }))}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={settleThisBill}
                    className="w-full rounded-xl bg-amber-500/90 py-2 text-xs font-bold text-black"
                  >
                    สรุปผลบิลนี้
                  </button>
                </div>
              ) : null}

              <p className="text-xs text-zinc-500">รายการเลข</p>
              {detailLoading ? (
                <p className="text-sm text-zinc-500">โหลด...</p>
              ) : (
                <div className="space-y-1">
                  {records.map((r) => (
                    <div
                      key={r.id}
                      className="flex justify-between rounded-lg border border-white/[0.06] bg-black/40 px-3 py-2 text-xs"
                    >
                      <span>
                        {r.number} <span className="text-zinc-500">{r.type}</span>
                      </span>
                      <span className="tabular-nums">{fmt(r.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
