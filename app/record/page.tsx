"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import liff from "@line/liff";
import {
  saveRecord,
  type BetType,
  type LotteryName,
  type RecordType,
} from "@/src/lib/supabase";

type RecordDraft = {
  lotteryName: LotteryName | "";
  number: string;
  betType: BetType | "";
  amount: string;
  note: string;
};

const LOTTERY_OPTIONS: readonly LotteryName[] = [
  "รัฐบาลไทย",
  "ลาวพัฒนา",
  "ฮานอย",
  "ฮานอย VIP",
  "ฮานอยพัฒนา",
] as const;

const BET_TYPES: readonly BetType[] = [
  "2 ตัว บน",
  "2 ตัว ล่าง",
  "3 ตัว บน",
  "3 ตัว โต๊ด",
  "วิ่งบน",
  "วิ่งล่าง",
] as const;

function recordTypeFromBetType(betType: BetType): RecordType {
  if (betType.startsWith("2 ตัว")) return "2 ตัว";
  if (betType.startsWith("3 ตัว")) return "3 ตัว";
  return "วิ่ง";
}

function safeParseAmount(raw: string): number | null {
  const normalized = raw.replace(/,/g, "").trim();
  if (!normalized) return null;
  const num = Number(normalized);
  if (!Number.isFinite(num)) return null;
  if (num <= 0) return null;
  return num;
}

type ToastState =
  | { open: false }
  | { open: true; tone: "success" | "error"; message: string };

const inputBase =
  "w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-white placeholder:text-zinc-600 shadow-sm outline-none transition-all duration-200 focus:border-zinc-600 focus:ring-2 focus:ring-white/10";

export default function RecordPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLiffReady, setIsLiffReady] = useState(false);
  const [draft, setDraft] = useState<RecordDraft>({
    lotteryName: "",
    number: "",
    betType: "",
    amount: "",
    note: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState>({ open: false });
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    async function init() {
      try {
        await liff.init({ liffId: "2009989826-L6OPDoa5" });
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        const p = await liff.getProfile();
        setUserId(p.userId);
      } catch {
        setToast({
          open: true,
          tone: "error",
          message: "ไม่สามารถเริ่มต้น LIFF ได้",
        });
      } finally {
        setIsLiffReady(true);
      }
    }

    init();
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  function showToast(tone: "success" | "error", message: string) {
    setToast({ open: true, tone, message });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast({ open: false });
    }, 2600);
  }

  const parsedAmount = useMemo(
    () => safeParseAmount(draft.amount),
    [draft.amount],
  );

  const canSubmit =
    !!userId &&
    draft.lotteryName.trim().length > 0 &&
    draft.betType.trim().length > 0 &&
    draft.number.trim().length > 0 &&
    parsedAmount !== null &&
    !isSubmitting;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const lotteryName = draft.lotteryName;
    const number = draft.number.trim();
    const betType = draft.betType;
    const amount = safeParseAmount(draft.amount);
    const note = draft.note.trim();

    if (!lotteryName) {
      showToast("error", "กรุณาเลือกชื่อหวย");
      return;
    }
    if (!betType) {
      showToast("error", "กรุณาเลือกประเภทเดิมพัน");
      return;
    }
    if (!number) {
      showToast("error", "กรุณากรอกเลข");
      return;
    }
    if (amount === null) {
      showToast("error", "กรุณากรอกจำนวนเงินที่ถูกต้อง");
      return;
    }
    if (!userId) {
      showToast("error", "ยังไม่ได้เข้าสู่ระบบ LINE");
      return;
    }

    setIsSubmitting(true);
    try {
      await saveRecord({
        userId,
        lotteryName,
        number,
        betType,
        type: recordTypeFromBetType(betType),
        amount,
        note: note ? note : undefined,
      });

      setDraft({
        lotteryName: "",
        number: "",
        betType: "",
        amount: "",
        note: "",
      });
      showToast("success", "บันทึกรายการเรียบร้อย");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
      showToast("error", msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-5 py-6">
      <section className="max-w-md mx-auto">
        <header className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight">บันทึกรายการ</h1>
            <p className="text-sm text-zinc-500">
              กรอกข้อมูลให้ครบ แล้วกดบันทึก
            </p>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200 transition-all duration-200 hover:bg-zinc-800/70 hover:-translate-y-0.5 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          >
            กลับ
          </Link>
        </header>

        <div className="rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_16px_40px_rgba(0,0,0,0.6)]">
          <form onSubmit={onSubmit} className="grid gap-4">
            {!isLiffReady ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 px-4 py-3 text-sm text-zinc-300">
                กำลังเชื่อมต่อ LINE...
              </div>
            ) : !userId ? (
              <div className="rounded-xl border border-rose-900/50 bg-rose-950/25 px-4 py-3 text-sm text-rose-200">
                ยังไม่ได้เข้าสู่ระบบ LINE (กำลังพยายามนำไปล็อกอิน)
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 px-4 py-3 text-xs text-zinc-400 break-all">
                userId: {userId}
              </div>
            )}

            <div className="grid gap-2">
              <label htmlFor="lotteryName" className="text-sm font-medium">
                ชื่อหวย
              </label>
              <select
                id="lotteryName"
                name="lotteryName"
                value={draft.lotteryName}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    lotteryName: e.target.value as LotteryName,
                  }))
                }
                className={`${inputBase} appearance-none`}
              >
                <option value="" disabled>
                  เลือกชื่อหวย...
                </option>
                {LOTTERY_OPTIONS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label htmlFor="number" className="text-sm font-medium">
                เลข
              </label>
              <input
                id="number"
                name="number"
                value={draft.number}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, number: e.target.value }))
                }
                inputMode="numeric"
                autoComplete="off"
                placeholder="เช่น 12 / 123 / 8"
                className={inputBase}
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="amount" className="text-sm font-medium">
                จำนวนเงิน
              </label>
              <input
                id="amount"
                name="amount"
                value={draft.amount}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, amount: e.target.value }))
                }
                inputMode="decimal"
                autoComplete="off"
                placeholder="เช่น 100"
                className={inputBase}
              />
              <p className="text-xs text-zinc-600">
                รองรับตัวเลขทศนิยม และใส่ comma ได้
              </p>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">ประเภทเดิมพัน</p>
                {draft.betType ? (
                  <span className="text-xs text-zinc-500">{draft.betType}</span>
                ) : (
                  <span className="text-xs text-zinc-600">ยังไม่ได้เลือก</span>
                )}
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-2 backdrop-blur">
                <div className="grid grid-cols-2 gap-2">
                  {BET_TYPES.map((bt) => {
                    const active = draft.betType === bt;
                    return (
                      <button
                        key={bt}
                        type="button"
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            betType: bt,
                          }))
                        }
                        className={`rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200 ease-out active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 ${
                          active
                            ? "border border-white/15 bg-white text-black shadow-[0_10px_30px_rgba(255,255,255,0.08)]"
                            : "border border-zinc-800 bg-zinc-900/60 text-zinc-100 hover:bg-zinc-800/60"
                        }`}
                        aria-pressed={active}
                      >
                        {bt}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor="note" className="text-sm font-medium">
                หมายเหตุ
              </label>
              <textarea
                id="note"
                name="note"
                value={draft.note}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, note: e.target.value }))
                }
                placeholder="เช่น ชื่อลูกค้า / เงื่อนไขพิเศษ"
                className={`${inputBase} min-h-[96px] resize-none`}
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="group rounded-xl bg-white px-5 py-3 text-black font-semibold shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:shadow-white/10 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "กำลังบันทึก..." : "บันทึกรายการ"}
            </button>
          </form>
        </div>

        {toast.open && (
          <div className="fixed left-0 right-0 bottom-5 px-5">
            <div
              role="status"
              className={`mx-auto max-w-md rounded-2xl border px-4 py-3 text-sm backdrop-blur ${
                toast.tone === "success"
                  ? "border-emerald-900/50 bg-emerald-950/35 text-emerald-100"
                  : "border-rose-900/50 bg-rose-950/35 text-rose-100"
              }`}
            >
              {toast.message}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

