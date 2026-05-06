"use client";

import Link from "next/link";
import { useState } from "react";
import { useAdminGuard } from "@/src/components/AdminGuard";
import { useLiffAuth } from "@/src/components/LiffAuthProvider";

const LOTTERIES = ["รัฐบาลไทย", "ลาวพัฒนา", "ฮานอย", "ฮานอย VIP", "ฮานอยพัฒนา"];

export default function AdminResultsPage() {
  const { authFetch } = useLiffAuth();
  const { isReady, isAdmin, error } = useAdminGuard();

  const [lotteryName, setLotteryName] = useState("รัฐบาลไทย");
  const [twoTop, setTwoTop] = useState("");
  const [twoBottom, setTwoBottom] = useState("");
  const [threeStraight, setThreeStraight] = useState("");
  const [runTop, setRunTop] = useState("");
  const [runBottom, setRunBottom] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function runCompute(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm("ยืนยันคำนวณผลและตัดสินบิลที่รออยู่ทั้งหมดของหวยนี้ (pending/accepted)?")) return;
    setIsSubmitting(true);
    setMsg(null);
    try {
      const res = await authFetch("/api/admin/compute-results", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lotteryName,
          twoTop,
          twoBottom,
          threeStraight,
          runTop,
          runBottom,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; processed?: number };
      if (!res.ok) throw new Error(json?.error || "คำนวณไม่สำเร็จ");
      setMsg(`สำเร็จ • ประมวลผล ${json.processed ?? 0} บิล`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isReady) return <main className="px-4 py-6 text-zinc-400">กำลังโหลด...</main>;
  if (error) return <main className="px-4 py-6 text-rose-200">{error}</main>;
  if (!isAdmin) return <main className="px-4 py-6">ไม่มีสิทธิ์</main>;

  return (
    <main className="px-4 py-6 max-w-xl mx-auto">
      <header className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold">ตรวจผล / ปิดงวด</h1>
          <p className="text-sm text-zinc-500 mt-1">ระบบคำนวณตามเลขในรายการ และโอนรางวัลเข้าเครดิตลูกค้าอัตโนมัติ</p>
        </div>
        <Link href="/admin/dashboard" className="text-sm text-emerald-400 hover:underline">
          แดชบอร์ด
        </Link>
      </header>

      <form onSubmit={runCompute} className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5">
        <label className="grid gap-1 text-sm">
          <span className="text-zinc-400">ชื่อหวย</span>
          <select
            value={lotteryName}
            onChange={(e) => setLotteryName(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-black px-3 py-2"
          >
            {LOTTERIES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-zinc-400">2 ตัวบน</span>
          <input
            value={twoTop}
            onChange={(e) => setTwoTop(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-black px-3 py-2 font-mono"
            placeholder="เช่น 12"
            required
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-zinc-400">2 ตัวล่าง</span>
          <input
            value={twoBottom}
            onChange={(e) => setTwoBottom(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-black px-3 py-2 font-mono"
            placeholder="เช่น 34"
            required
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-zinc-400">3 ตัวตรง</span>
          <input
            value={threeStraight}
            onChange={(e) => setThreeStraight(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-black px-3 py-2 font-mono"
            placeholder="เช่น 123"
            required
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-zinc-400">วิ่งบน (ตัวเดียว)</span>
          <input
            value={runTop}
            onChange={(e) => setRunTop(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-black px-3 py-2 font-mono"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-zinc-400">วิ่งล่าง (ตัวเดียว)</span>
          <input
            value={runBottom}
            onChange={(e) => setRunBottom(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-black px-3 py-2 font-mono"
          />
        </label>

        <p className="text-[11px] text-zinc-500 leading-relaxed">
          เรทจ่ายชั่วคราวในโค้ด: 2 ตัว ×70, 3 ตัวตรง ×500, 3 โต๊ด ×120, วิ่ง ×4 — ปรับได้ในไฟล์ API `compute-results`
        </p>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-white py-3 text-sm font-bold text-black disabled:opacity-50"
        >
          {isSubmitting ? "กำลังประมวลผล..." : "คำนวณผล"}
        </button>

        {msg ? <p className="text-sm text-center text-emerald-200/95">{msg}</p> : null}
      </form>
    </main>
  );
}
