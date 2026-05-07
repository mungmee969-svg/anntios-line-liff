"use client";

import { useCallback, useEffect, useState } from "react";
import { useLiffAuth } from "@/src/components/LiffAuthProvider";

function dayISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function StaffReportsPage() {
  const { authFetch } = useLiffAuth();
  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const [from, setFrom] = useState(dayISO(weekAgo));
  const [to, setTo] = useState(dayISO(today));
  const [metrics, setMetrics] = useState<Record<string, number> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const sp = new URLSearchParams({ from: `${from}T00:00:00.000Z`, to: `${to}T23:59:59.999Z` });
      const res = await authFetch(`/api/staff/reports?${sp.toString()}`);
      const j = (await res.json()) as { metrics?: Record<string, number>; error?: string };
      if (!res.ok) throw new Error(j.error || "โหลดไม่สำเร็จ");
      setMetrics(j.metrics ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    }
  }, [authFetch, from, to]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function exportCsv() {
    const sp = new URLSearchParams({
      from: `${from}T00:00:00.000Z`,
      to: `${to}T23:59:59.999Z`,
      format: "csv",
    });
    const res = await authFetch(`/api/staff/reports?${sp.toString()}`);
    if (!res.ok) {
      alert("ส่งออกไม่สำเร็จ");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `anntios-report-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-50">รายงาน</h1>
      <p className="text-sm text-zinc-500">ช่วงวันที่ + ส่งออก CSV (ต้องมีสิทธิ์ export)</p>

      <div className="flex flex-wrap gap-2 items-end rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
        <label className="text-sm">
          <span className="text-zinc-500">จาก</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="block mt-1 rounded-xl bg-black/50 border border-white/10 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-zinc-500">ถึง</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="block mt-1 rounded-xl bg-black/50 border border-white/10 px-3 py-2"
          />
        </label>
        <button
          type="button"
          onClick={load}
          className="rounded-xl bg-emerald-500/90 px-4 py-2 text-sm font-semibold text-black"
        >
          โหลด
        </button>
        <button
          type="button"
          onClick={exportCsv}
          className="rounded-xl border border-amber-500/40 px-4 py-2 text-sm text-amber-100"
        >
          Export CSV
        </button>
      </div>

      {err ? <p className="text-sm text-rose-300">{err}</p> : null}

      {metrics ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(metrics).map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-white/[0.08] bg-black/40 p-4">
              <p className="text-xs text-zinc-500 uppercase">{k}</p>
              <p className="mt-2 text-lg font-semibold tabular-nums">{v.toLocaleString("th-TH")}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
