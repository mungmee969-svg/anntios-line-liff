"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import liff from "@line/liff";
import { CreditBadge } from "@/components/CreditBadge";
import { ensureLiffReady } from "@/src/lib/liffAuth";
import { useLiffAuth } from "@/src/components/LiffAuthProvider";
import type { BillRow, RecordRow } from "@/src/lib/supabase";

function formatTHB(amount: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function statusLabel(status: BillRow["status"]) {
  switch (status) {
    case "pending":
      return "รอดำเนินการ";
    case "accepted":
      return "รับแล้ว";
    case "rejected":
      return "ปฏิเสธ";
    case "settled":
      return "สรุปแล้ว";
    case "cancelled":
      return "ยกเลิก";
  }
}

/** API may return extended record columns */
type RecordApi = RecordRow & { result_status?: string | null; win_amount?: number | null };

export default function BillDetailPage() {
  const params = useParams();
  const billIdRaw = params?.billId;
  const billId = typeof billIdRaw === "string" ? billIdRaw : Array.isArray(billIdRaw) ? billIdRaw[0] : "";

  const { isSessionReady, authFetch } = useLiffAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const [bill, setBill] = useState<BillRow | null>(null);
  const [records, setRecords] = useState<RecordApi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef({ aborted: false });

  const total = useMemo(() => records.reduce((s, r) => s + r.amount, 0), [records]);

  const load = useCallback(async () => {
    if (!billId?.trim()) {
      setError("ไม่พบรหัสบิล");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/bills/${encodeURIComponent(billId.trim())}`);
      const json = (await res.json().catch(() => ({}))) as unknown as {
        bill?: BillRow;
        records?: RecordApi[];
        error?: string;
      };
      if (!res.ok) throw new Error(json?.error || "โหลดไม่สำเร็จ");
      setBill(json.bill ?? null);
      setRecords(json.records ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, [authFetch, billId]);

  async function resendLineReceipt() {
    if (!bill) return;

    await ensureLiffReady();
    if (!liff.isInClient()) {
      alert("ต้องเปิดผ่าน LINE");
      return;
    }

    const fmtAmount = (n: number) => new Intl.NumberFormat("th-TH").format(n);
    const divider = "━━━━━━━━━━━━━━";
    const maxReceiptLines = 40;
    const receiptRows = records.slice(0, maxReceiptLines);
    const remaining = Math.max(0, records.length - maxReceiptLines);

    const padRight = (s: string, len: number) =>
      s.length >= len ? s : s + " ".repeat(len - s.length);
    const padLeft = (s: string, len: number) =>
      s.length >= len ? s : " ".repeat(len - s.length) + s;

    const byNumber = new Map<string, RecordApi[]>();
    for (const r of receiptRows) {
      const arr = byNumber.get(r.number) ?? [];
      arr.push(r);
      byNumber.set(r.number, arr);
    }

    const lines: string[] = [];
    lines.push("🧾 รวยไม่ไหว");
    lines.push(divider);
    lines.push("ใบสรุปรายการ");
    lines.push("");
    lines.push(`เลขบิล: ${bill.bill_no}`);
    lines.push(`ลูกค้า: ${bill.display_name ?? userId ?? "-"}`);
    lines.push(`หวย: ${bill.lottery_name ?? "-"}`);
    lines.push(`ประเภท: ${bill.bet_type ?? "-"}`);
    lines.push(`เวลา: ${formatDate(bill.created_at)}`);
    lines.push(divider);
    lines.push("");
    lines.push("รายการ");

    for (const [num, rows] of byNumber.entries()) {
      const numberCol = padRight(num, 4);
      const cells = rows
        .map((r) => `${r.type} ${padLeft(fmtAmount(r.amount), 3)}`)
        .join("   ");
      lines.push(`${numberCol} ${cells}`.trimEnd());
    }
    if (remaining > 0) lines.push(`...และอีก ${remaining} รายการ`);

    lines.push("");
    lines.push(divider);
    lines.push(`จำนวน: ${records.length} รายการ`);
    lines.push(`รวมยอด: ${fmtAmount(bill.total_amount ?? total)} บาท`);
    lines.push(`สถานะ: ${statusLabel(bill.status)}`);
    lines.push(divider);
    lines.push("");
    lines.push("หากต้องการยกเลิก กรุณาแจ้งแอดมิน");

    const summary = lines.join("\n");

    try {
      await liff.sendMessages([{ type: "text", text: summary }]);
      alert("ส่งบิลเข้า LINE สำเร็จ");
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "ส่ง LINE ไม่สำเร็จ";
      alert(msg);
    }
  }

  useEffect(() => {
    abortRef.current.aborted = false;
    const abortState = abortRef.current;
    async function initProfile() {
      try {
        await ensureLiffReady();
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        const p = await liff.getProfile();
        if (!abortState.aborted) setUserId(p.userId);
      } catch {
        /* LINE profile optional for display */
      }
    }
    void initProfile();
    return () => {
      abortState.aborted = true;
    };
  }, []);

  useEffect(() => {
    if (!isSessionReady || !billId?.trim()) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดบิลหลัง token พร้อม
    void load();
  }, [isSessionReady, billId, load]);

  return (
    <main className="min-h-screen bg-black text-white px-4 py-6 sm:px-5">
      <section className="max-w-md mx-auto w-full min-w-0">
        <header className="flex items-center justify-between gap-3 mb-5">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight">รายละเอียดบิล</h1>
            <p className="text-sm text-zinc-500 break-all">{billId || "-"}</p>
          </div>
          <Link
            href="/history"
            className="shrink-0 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200 transition-all duration-200 hover:bg-zinc-800/70 active:scale-[0.99]"
          >
            กลับ
          </Link>
        </header>

        <div className="mb-4 min-w-0">
          <CreditBadge className="w-full max-w-full" />
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 px-4 py-3 text-sm text-zinc-300">
            กำลังโหลด...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-900/50 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : !bill ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 px-4 py-3 text-sm text-zinc-300">
            ไม่พบบิล
          </div>
        ) : (
          <div className="grid gap-3">
            <div className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black p-5">
              <p className="text-xs text-zinc-500">{bill.bill_no}</p>
              <p className="text-sm font-semibold text-zinc-100 mt-1">
                {bill.lottery_name ?? "-"} • {bill.bet_type ?? "-"}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {formatDate(bill.created_at)} • สถานะ: {statusLabel(bill.status)}
              </p>
              <div className="mt-4 flex items-end justify-between">
                <p className="text-sm text-zinc-500">ยอดรวม</p>
                <p className="text-base font-semibold tabular-nums">{formatTHB(bill.total_amount)}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={resendLineReceipt}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm font-semibold text-zinc-100 transition-all duration-200 hover:bg-zinc-800/70 active:scale-[0.99]"
            >
              ส่งบิลเข้า LINE อีกครั้ง
            </button>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 px-4 py-3 text-xs text-zinc-400">
              หากต้องการยกเลิก กรุณาแจ้งแอดมิน
            </div>

            <div className="grid gap-2">
              {records.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">เลข {r.number}</p>
                    <p className="text-xs text-zinc-500 tabular-nums">{formatTHB(r.amount)}</p>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">ประเภท: {r.type}</p>
                  {r.result_status && r.result_status !== "pending" ? (
                    <p className="text-xs mt-2 text-emerald-200/90">
                      ผล: {r.result_status}
                      {(r.win_amount ?? 0) > 0 ? ` • รับ ${formatTHB(Number(r.win_amount))}` : ""}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
