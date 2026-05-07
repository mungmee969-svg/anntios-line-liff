"use client";

import { useCallback, useEffect, useState } from "react";
import { useLiffAuth } from "@/src/components/LiffAuthProvider";

type Settings = {
  bankTransferNote: string | null;
  lotteryNames: string[];
  staffOsVersion: string;
};

type StaffRow = {
  id: string;
  line_user_id: string;
  display_name: string | null;
  role: string;
  is_active: boolean;
};

export default function StaffSettingsPage() {
  const { authFetch } = useLiffAuth();
  const [s, setS] = useState<Settings | null>(null);
  const [staff, setStaff] = useState<StaffRow[] | null>(null);
  const [staffErr, setStaffErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await authFetch("/api/staff/settings");
      const j = (await res.json().catch(() => ({}))) as Settings & { error?: string };
      if (res.ok) setS(j);
    } catch {
      setS(null);
    }
  }, [authFetch]);

  const loadStaff = useCallback(async () => {
    setStaffErr(null);
    try {
      const res = await authFetch("/api/staff/staff-users");
      const j = (await res.json().catch(() => ({}))) as { staff?: StaffRow[]; error?: string };
      if (!res.ok) {
        setStaff(null);
        setStaffErr(j.error || "ไม่มีสิทธิ์จัดการพนักงาน");
        return;
      }
      setStaff(j.staff ?? []);
    } catch (e) {
      setStaff(null);
      setStaffErr(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    }
  }, [authFetch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    void loadStaff();
  }, [load, loadStaff]);

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-zinc-50">ตั้งค่า</h1>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 space-y-3 text-sm">
        <h2 className="font-semibold text-amber-100/90">ระบบ</h2>
        <p className="text-zinc-500">Staff OS v{s?.staffOsVersion ?? "—"}</p>
        <p className="text-zinc-400">ค่าทั่วไป (เช่น ช่องทางโอน / หวยที่รองรับ) — ปรับเพิ่มใน Phase ต่อไปได้</p>
        {s?.bankTransferNote ? (
          <p className="rounded-xl border border-white/10 bg-black/40 p-3 text-zinc-300">{s.bankTransferNote}</p>
        ) : (
          <p className="rounded-xl border border-white/10 bg-black/30 p-3 text-zinc-500">
            ยังไม่มีโน้ตสำหรับการโอนเงิน
          </p>
        )}
        <p className="text-xs text-zinc-500">หวยที่รองรับใน UI: {(s?.lotteryNames ?? []).join(", ") || "—"}</p>
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
        <h2 className="font-semibold text-amber-100/90 mb-3">Staff users</h2>
        {staffErr ? <p className="text-sm text-zinc-500">{staffErr}</p> : null}
        {staff ? (
          <ul className="space-y-2 text-sm">
            {staff.map((r) => (
              <li
                key={r.id}
                className="flex justify-between gap-2 border border-white/[0.06] rounded-xl px-3 py-2"
              >
                <span className="truncate">{r.display_name ?? r.line_user_id}</span>
                <span className="text-xs text-zinc-500 shrink-0">
                  {r.role} {r.is_active ? "" : "(ปิด)"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">ยังไม่พร้อมแสดงรายชื่อพนักงาน</p>
        )}
      </section>
    </div>
  );
}

