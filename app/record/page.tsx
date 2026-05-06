"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import liff from "@line/liff";
import {
  saveRecords,
  type BetType,
  type LotteryName,
  type RecordType,
} from "@/src/lib/supabase";

const LOTTERY_OPTIONS: readonly LotteryName[] = [
  "รัฐบาลไทย",
  "ลาวพัฒนา",
  "ฮานอย",
  "ฮานอย VIP",
  "ฮานอยพัฒนา",
] as const;

const QUICK_BET_MODES: readonly BetType[] = [
  "2ตัว",
  "3ตัว",
  "6กลับ",
  "19ประตู",
  "วิ่ง",
  "วิน2",
  "วิน3",
] as const;

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

type CartItem = {
  number: string;
  type: RecordType;
  amount: number;
};

type QuickBetDraft = {
  lotteryName: LotteryName | "";
  mode: BetType;
  number: string;
  amountTop: string; // บน/ตรง
  amountBottom: string; // ล่าง
  amountTod: string; // โต๊ด
  memo: string;
};

const inputBase =
  "w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-white placeholder:text-zinc-600 shadow-sm outline-none transition-all duration-200 focus:border-zinc-600 focus:ring-2 focus:ring-white/10";

const neonButtonBase =
  "rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-200 ease-out active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/30";

const glassCard =
  "rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-zinc-950/70 to-black/60 backdrop-blur shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_50px_rgba(0,0,0,0.65)]";

function clampDigits(value: string, maxLen: number) {
  return value.replace(/[^\d]/g, "").slice(0, maxLen);
}

function reverseDigits(value: string) {
  return value.split("").reverse().join("");
}

function doubleNumber(value: string, len: 2 | 3) {
  const digits = value.replace(/[^\d]/g, "");
  const d = digits.length > 0 ? digits[digits.length - 1] : "";
  if (!d) return "";
  return len === 2 ? `${d}${d}` : `${d}${d}${d}`;
}

export default function RecordPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLiffReady, setIsLiffReady] = useState(false);
  const [draft, setDraft] = useState<QuickBetDraft>({
    lotteryName: "",
    mode: "2ตัว",
    number: "",
    amountTop: "",
    amountBottom: "",
    amountTod: "",
    memo: "",
  });
  const [cart, setCart] = useState<CartItem[]>([]);
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

  const maxNumberLen = useMemo(() => {
    switch (draft.mode) {
      case "2ตัว":
      case "วิน2":
        return 2;
      case "3ตัว":
      case "6กลับ":
      case "19ประตู":
      case "วิน3":
        return 3;
      case "วิ่ง":
        return 1;
    }
  }, [draft.mode]);

  const parsedTop = useMemo(() => safeParseAmount(draft.amountTop), [draft.amountTop]);
  const parsedBottom = useMemo(
    () => safeParseAmount(draft.amountBottom),
    [draft.amountBottom],
  );
  const parsedTod = useMemo(() => safeParseAmount(draft.amountTod), [draft.amountTod]);

  const hasAtLeastOneAmount = parsedTop !== null || parsedBottom !== null || parsedTod !== null;
  const canAddToCart =
    !!userId &&
    draft.lotteryName.trim().length > 0 &&
    draft.number.trim().length > 0 &&
    hasAtLeastOneAmount &&
    !isSubmitting;

  function clearInputsOnly() {
    setDraft((d) => ({
      ...d,
      number: "",
      amountTop: "",
      amountBottom: "",
      amountTod: "",
    }));
  }

  function clearAll() {
    setCart([]);
    setDraft((d) => ({
      ...d,
      number: "",
      amountTop: "",
      amountBottom: "",
      amountTod: "",
      memo: "",
    }));
  }

  function addCurrentToCart() {
    if (!draft.lotteryName) {
      showToast("error", "กรุณาเลือกชื่อหวย");
      return;
    }
    const number = clampDigits(draft.number, maxNumberLen).trim();
    if (!number) {
      showToast("error", "กรุณากรอกเลข");
      return;
    }
    const items: CartItem[] = [];

    const pushIf = (type: RecordType, amount: number | null) => {
      if (amount === null) return;
      items.push({ number, type, amount });
    };

    switch (draft.mode) {
      case "2ตัว":
      case "19ประตู":
      case "วิ่ง":
      case "วิน2": {
        pushIf("บน", parsedTop);
        pushIf("ล่าง", parsedBottom);
        break;
      }
      case "3ตัว":
      case "วิน3": {
        pushIf("ตรง", parsedTop);
        pushIf("โต๊ด", parsedTod);
        break;
      }
      case "6กลับ": {
        pushIf("บน", parsedTop);
        break;
      }
    }

    if (items.length === 0) {
      showToast("error", "กรุณากรอกยอดอย่างน้อย 1 ช่อง");
      return;
    }

    setCart((c) => [...c, ...items]);
    clearInputsOnly();
    showToast("success", `เพิ่ม ${items.length} รายการ`);
  }

  async function submitCart() {
    if (!userId) {
      showToast("error", "ยังไม่ได้เข้าสู่ระบบ LINE");
      return;
    }
    if (!draft.lotteryName) {
      showToast("error", "กรุณาเลือกชื่อหวย");
      return;
    }
    if (cart.length === 0) {
      showToast("error", "ยังไม่มีรายการ");
      return;
    }

    setIsSubmitting(true);
    try {
      await saveRecords({
        userId,
        lotteryName: draft.lotteryName,
        betType: draft.mode,
        note: draft.memo.trim() ? draft.memo.trim() : undefined,
        items: cart,
      });
      setCart([]);
      showToast("success", "ส่งรายการซื้อเรียบร้อย");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "ส่งรายการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
      showToast("error", msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-5 py-6">
      <section className="max-w-md mx-auto">
        <header className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight">แทงเร็วหวย</h1>
            <p className="text-sm text-zinc-500">Premium quick bet • mobile</p>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200 transition-all duration-200 hover:bg-zinc-800/70 hover:-translate-y-0.5 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          >
            กลับ
          </Link>
        </header>

        <div className={`${glassCard} p-4`}>
          <div className="grid gap-4">
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
              <div className="relative">
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
                  className={`${inputBase} appearance-none pr-10`}
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
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
                  ▾
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <p className="text-sm font-medium">โหมดแทงเร็ว</p>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-1.5 backdrop-blur">
                <div className="flex gap-1 overflow-x-auto no-scrollbar">
                  {QUICK_BET_MODES.map((m) => {
                    const active = draft.mode === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            mode: m,
                            number: "",
                            amountTop: "",
                            amountBottom: "",
                            amountTod: "",
                          }))
                        }
                        className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200 ${
                          active
                            ? "bg-gradient-to-b from-cyan-200 to-white text-black shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_12px_35px_rgba(34,211,238,0.14)]"
                            : "bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800/60"
                        }`}
                        aria-pressed={active}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-200">ตะกร้า</p>
                <p className="text-sm text-zinc-400">
                  <span className="font-semibold text-zinc-100">{cart.length}</span>{" "}
                  รายการ
                </p>
              </div>
            </div>

            <div className={`${glassCard} p-4`}>
              <div className="grid gap-4">
                {(draft.mode === "วิน2" || draft.mode === "วิน3") && (
                  <div className="grid gap-2">
                    <p className="text-sm font-medium text-zinc-200">แป้นตัวเลข</p>
                    <div className="grid grid-cols-5 gap-2">
                      {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map(
                        (d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() =>
                              setDraft((s) => ({
                                ...s,
                                number: clampDigits(`${s.number}${d}`, maxNumberLen),
                              }))
                            }
                            className="rounded-xl border border-zinc-800 bg-zinc-900/60 py-3 text-sm font-semibold text-zinc-100 transition-all duration-200 hover:bg-zinc-800/60 active:scale-[0.99]"
                          >
                            {d}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                )}

                <div className="grid gap-2">
                  <label htmlFor="number" className="text-sm font-medium">
                    เลข
                  </label>
                  <input
                    id="number"
                    name="number"
                    value={draft.number}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        number: clampDigits(e.target.value, maxNumberLen),
                      }))
                    }
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder={draft.mode === "วิ่ง" ? "เช่น 8" : "เช่น 12 / 123"}
                    className={inputBase}
                  />
                </div>

                <div className="grid gap-2">
                  <p className="text-sm font-medium text-zinc-200">ยอดแทง</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(draft.mode === "3ตัว" || draft.mode === "วิน3") ? (
                      <>
                        <div className="grid gap-2">
                          <label className="text-xs text-zinc-500">ตรง</label>
                          <input
                            value={draft.amountTop}
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, amountTop: e.target.value }))
                            }
                            inputMode="decimal"
                            placeholder="0"
                            className={inputBase}
                          />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-xs text-zinc-500">โต๊ด</label>
                          <input
                            value={draft.amountTod}
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, amountTod: e.target.value }))
                            }
                            inputMode="decimal"
                            placeholder="0"
                            className={inputBase}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid gap-2">
                          <label className="text-xs text-zinc-500">
                            {draft.mode === "2ตัว" || draft.mode === "6กลับ"
                              ? "บน"
                              : draft.mode === "19ประตู" || draft.mode === "วิ่ง"
                                ? "บน"
                                : "บน"}
                          </label>
                          <input
                            value={draft.amountTop}
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, amountTop: e.target.value }))
                            }
                            inputMode="decimal"
                            placeholder="0"
                            className={inputBase}
                          />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-xs text-zinc-500">ล่าง</label>
                          <input
                            value={draft.amountBottom}
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, amountBottom: e.target.value }))
                            }
                            inputMode="decimal"
                            placeholder="0"
                            className={inputBase}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {draft.mode === "6กลับ" && (
                    <p className="text-xs text-zinc-600">
                      โหมด 6กลับ ใช้ยอด “บน” เท่านั้น
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        number: reverseDigits(clampDigits(d.number, maxNumberLen)),
                      }))
                    }
                    className={`${neonButtonBase} border border-cyan-400/15 bg-cyan-500/10 text-cyan-100 shadow-[0_12px_35px_rgba(34,211,238,0.10)] hover:bg-cyan-500/15`}
                  >
                    กลับเลข
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        number: doubleNumber(d.number, maxNumberLen === 3 ? 3 : 2),
                      }))
                    }
                    className={`${neonButtonBase} border border-sky-400/15 bg-sky-500/10 text-sky-100 hover:bg-sky-500/15`}
                  >
                    เลขเบิ้ล
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={clearAll}
                    className={`${neonButtonBase} border border-zinc-700 bg-zinc-900/60 text-zinc-100 hover:bg-zinc-800/70`}
                  >
                    เคลียร์
                  </button>
                  <button
                    type="button"
                    disabled={!canAddToCart}
                    onClick={addCurrentToCart}
                    className={`${neonButtonBase} border border-white/10 bg-white text-black shadow-[0_12px_35px_rgba(255,255,255,0.08)] hover:bg-zinc-100 disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    เพิ่มเข้าตะกร้า
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor="memo" className="text-sm font-medium">
                บันทึกช่วยจำ
              </label>
              <textarea
                id="memo"
                name="memo"
                value={draft.memo}
                onChange={(e) => setDraft((d) => ({ ...d, memo: e.target.value }))}
                placeholder="เช่น ชื่อลูกค้า / เงื่อนไข / โน้ต"
                className={`${inputBase} min-h-[96px] resize-none`}
              />
            </div>

            <button
              type="button"
              onClick={submitCart}
              disabled={
                !userId ||
                !draft.lotteryName ||
                cart.length === 0 ||
                isSubmitting
              }
              className="group rounded-xl border border-cyan-400/15 bg-gradient-to-b from-cyan-500/20 to-sky-500/10 px-5 py-3 text-cyan-50 font-semibold shadow-[0_18px_60px_rgba(34,211,238,0.12)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-cyan-500/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "กำลังส่ง..." : "ส่งรายการซื้อ"}
            </button>
          </div>
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

