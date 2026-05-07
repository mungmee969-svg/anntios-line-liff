"use client";

import { useState } from "react";
import { useLiffAuth } from "@/src/components/LiffAuthProvider";

const LOTTERIES = ["รัฐบาลไทย", "ลาวพัฒนา", "ฮานอย", "ฮานอย VIP", "ฮานอยพัฒนา"];

export default function StaffResultsPage() {
  const { authFetch } = useLiffAuth();
  const [lotteryName, setLotteryName] = useState("รัฐบาลไทย");
  const [drawPeriod, setDrawPeriod] = useState("");
  const [threeTop, setThreeTop] = useState("");
  const [threeTode, setThreeTode] = useState("");
  const [twoTop, setTwoTop] = useState("");
  const [twoBottom, setTwoBottom] = useState("");
  const [runTop, setRunTop] = useState("");
  const [runBottom, setRunBottom] = useState("");
  const [preview, setPreview] = useState<{
    billCount: number;
    totalStake: number;
    totalPrize: number;
    net: number;
    winners: {
      userId: string;
      displayName: string | null;
      billNo: string;
      billId: string;
      prize: number;
    }[];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function buildBody() {
    const threeStraight = threeTop || threeTode;
    return {
      lotteryName,
      drawPeriod: drawPeriod.trim() || null,
      twoTop,
      twoBottom,
      threeStraight,
      threeTop: threeTop || undefined,
      threeTode: threeTode || undefined,
      runTop,
      runBottom,
    };
  }

  async function doPreview() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await authFetch("/api/staff/results/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildBody()),
      });
      const j = (await res.json()) as {
        preview?: typeof preview;
        error?: string;
      };
      if (!res.ok) throw new Error(j.error || "Preview ล้มเหลว");
      setPreview(j.preview ?? null);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "ผิดพลาด");
    } finally {
      setBusy(false);
    }
  }

  async function doConfirm() {
    if (!preview) {
      setMsg("กด Preview ก่อน");
      return;
    }
    if (!confirm("ยืนยันสรุปผลและตัดเครดิต/โอนรางวัลทุกบิลที่รอของหวยนี้?")) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await authFetch("/api/staff/results/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildBody()),
      });
      const j = (await res.json()) as { error?: string; processed?: number };
      if (!res.ok) throw new Error(j.error || "Confirm ล้มเหลว");
      setMsg(`สำเร็จ — สรุป ${j.processed ?? 0} บิล`);
      setPreview(null);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "ผิดพลาด");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">ตรวจผลหวย</h1>
        <p className="text-sm text-zinc-500">Preview ก่อน — แล้วค่อย Confirm Settle</p>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-5 space-y-3">
        <label className="block text-sm">
          <span className="text-zinc-500">หวย</span>
          <select
            value={lotteryName}
            onChange={(e) => setLotteryName(e.target.value)}
            className="mt-1 w-full rounded-xl bg-black/50 border border-white/10 px-3 py-2"
          >
            {LOTTERIES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-zinc-500">งวด / หมายเหตุ (optional)</span>
          <input
            value={drawPeriod}
            onChange={(e) => setDrawPeriod(e.target.value)}
            className="mt-1 w-full rounded-xl bg-black/50 border border-white/10 px-3 py-2"
            placeholder="เช่น 7 พ.ค. 2569"
          />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-500">3 ตัวบน (ตรง)</span>
          <input
            value={threeTop}
            onChange={(e) => setThreeTop(e.target.value)}
            className="mt-1 w-full rounded-xl bg-black/50 border border-white/10 px-3 py-2 font-mono"
          />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-500">3 ตัวโต๊ด</span>
          <input
            value={threeTode}
            onChange={(e) => setThreeTode(e.target.value)}
            className="mt-1 w-full rounded-xl bg-black/50 border border-white/10 px-3 py-2 font-mono"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm">
            <span className="text-zinc-500">2 บน</span>
            <input
              value={twoTop}
              onChange={(e) => setTwoTop(e.target.value)}
              className="mt-1 w-full rounded-xl bg-black/50 border border-white/10 px-3 py-2 font-mono"
            />
          </label>
          <label className="text-sm">
            <span className="text-zinc-500">2 ล่าง</span>
            <input
              value={twoBottom}
              onChange={(e) => setTwoBottom(e.target.value)}
              className="mt-1 w-full rounded-xl bg-black/50 border border-white/10 px-3 py-2 font-mono"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm">
            <span className="text-zinc-500">วิ่งบน</span>
            <input
              value={runTop}
              onChange={(e) => setRunTop(e.target.value)}
              className="mt-1 w-full rounded-xl bg-black/50 border border-white/10 px-3 py-2 font-mono"
            />
          </label>
          <label className="text-sm">
            <span className="text-zinc-500">วิ่งล่าง</span>
            <input
              value={runBottom}
              onChange={(e) => setRunBottom(e.target.value)}
              className="mt-1 w-full rounded-xl bg-black/50 border border-white/10 px-3 py-2 font-mono"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            disabled={busy}
            onClick={doPreview}
            className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-5 py-2.5 text-sm font-semibold text-emerald-100"
          >
            Preview ผล
          </button>
          <button
            type="button"
            disabled={busy || !preview}
            onClick={doConfirm}
            className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-black disabled:opacity-40"
          >
            Confirm Settle
          </button>
        </div>
      </div>

      {preview ? (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-950/15 p-5 text-sm space-y-2">
          <p className="font-semibold text-amber-100">สรุป Preview</p>
          <p>บิลที่จะถูกสรุป: {preview.billCount}</p>
          <p>ยอดแทงรวม: {preview.totalStake.toLocaleString("th-TH")} บ.</p>
          <p>ยอดจ่ายรวม: {preview.totalPrize.toLocaleString("th-TH")} บ.</p>
          <p>สุทธิ (จ่าย - แทง): {preview.net.toLocaleString("th-TH")} บ.</p>
          <p className="text-zinc-400 pt-2">ลูกค้าที่ถูกรางวัล</p>
          <ul className="max-h-40 overflow-y-auto space-y-1 text-xs">
            {preview.winners.length === 0 ? <li>—</li> : null}
            {preview.winners.map((w, i) => (
              <li key={`${w.billId}-${i}`}>
                {w.displayName ?? w.userId} — {w.billNo} — {w.prize.toLocaleString("th-TH")} บ.
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {msg ? <p className="text-sm text-center text-emerald-300/90">{msg}</p> : null}
    </div>
  );
}
