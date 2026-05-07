"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useLiffAuth } from "@/src/components/LiffAuthProvider";

type Row = {
  user_id: string;
  display_name: string | null;
  credit_balance: number;
  locked_balance: number;
  total_bills: number;
  total_play: number;
  net_result: number;
  last_active: string | null;
};

function fmt(n: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(n);
}

export default function StaffCustomersPage() {
  const { authFetch } = useLiffAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await authFetch("/api/staff/customers");
      const j = (await res.json()) as { customers?: Row[]; error?: string };
      if (!res.ok) throw new Error(j.error || "โหลดไม่สำเร็จ");
      setRows(j.customers ?? []);
    } catch (e) {
      setRows([]);
      setErr(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    }
  }, [authFetch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">ลูกค้า</h1>
          <p className="text-sm text-zinc-500">สรุปยอดเครดิต + การใช้งาน</p>
        </div>
        <button type="button" onClick={load} className="rounded-xl border border-white/10 px-4 py-2 text-sm">
          รีเฟรช
        </button>
      </div>

      {err ? (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-950/15 px-4 py-3 text-sm text-amber-100/90">
          ยังโหลดรายชื่อลูกค้าไม่ได้ตอนนี้ — แสดงโหมดว่าง (รายละเอียด: {err})
        </div>
      ) : null}

      <div className="hidden md:block rounded-2xl border border-white/[0.08] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.04] text-xs text-zinc-500 uppercase">
            <tr>
              <th className="text-left px-3 py-2">ชื่อ</th>
              <th className="text-left px-3 py-2">userId</th>
              <th className="text-right px-3 py-2">เครดิต</th>
              <th className="text-right px-3 py-2">ล็อก</th>
              <th className="text-right px-3 py-2">บิล</th>
              <th className="text-right px-3 py-2">เล่นรวม</th>
              <th className="text-right px-3 py-2">สุทธิ</th>
              <th className="text-left px-3 py-2">ล่าสุด</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.user_id} className="border-t border-white/[0.06]">
                <td className="px-3 py-2">{r.display_name ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-xs break-all max-w-[160px]">{r.user_id}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(r.credit_balance)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-500">{fmt(r.locked_balance)}</td>
                <td className="px-3 py-2 text-right">{r.total_bills}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(r.total_play)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(r.net_result)}</td>
                <td className="px-3 py-2 text-xs text-zinc-500">
                  {r.last_active ? new Date(r.last_active).toLocaleString("th-TH") : "—"}
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/staff/customers/${encodeURIComponent(r.user_id)}`}
                    className="text-emerald-400 text-xs font-medium"
                  >
                    ดู
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden grid gap-2">
        {rows.map((r) => (
          <Link
            key={r.user_id}
            href={`/staff/customers/${encodeURIComponent(r.user_id)}`}
            className="block rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4"
          >
            <p className="font-semibold">{r.display_name ?? r.user_id}</p>
            <p className="text-xs text-zinc-500 break-all">{r.user_id}</p>
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-zinc-500">เครดิต</span>
              <span className="font-semibold text-amber-100/90 tabular-nums">{fmt(r.credit_balance)}</span>
            </div>
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 text-center">
          <p className="text-sm font-semibold text-zinc-200">ยังไม่มีลูกค้า</p>
          <p className="text-xs text-zinc-500 mt-2">เมื่อมีผู้ใช้งานครั้งแรก ระบบจะสร้าง wallet และแสดงที่นี่</p>
        </div>
      ) : null}
    </div>
  );
}

