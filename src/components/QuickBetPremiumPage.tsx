"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeftRight,
  BadgePlus,
  Check,
  CopyX,
  Dice5,
  Eraser,
  Send,
  Shuffle,
  Sparkles,
  X,
} from "lucide-react";
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

const MODES: readonly BetType[] = ["2ตัว", "3ตัว", "6กลับ", "19ประตู", "วิ่ง", "วิน2", "วิน3"] as const;

type ToastState = { open: false } | { open: true; tone: "success" | "error"; message: string };

function clampDigits(value: string, maxLen: number) {
  return value.replace(/[^\d]/g, "").slice(0, maxLen);
}

function safeParseAmount(raw: string): number | null {
  const normalized = raw.replace(/,/g, "").trim();
  if (!normalized) return null;
  const num = Number(normalized);
  if (!Number.isFinite(num)) return null;
  if (num <= 0) return null;
  return num;
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function permutations3(digits: string) {
  const s = digits;
  if (s.length !== 3) return [];
  const arr = s.split("");
  const out: string[] = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (j === i) continue;
      for (let k = 0; k < 3; k++) {
        if (k === i || k === j) continue;
        out.push(`${arr[i]}${arr[j]}${arr[k]}`);
      }
    }
  }
  return unique(out);
}

function generate19Doors(digit: string) {
  // digit: 0-9
  const d = digit;
  const a: string[] = [];
  for (let i = 0; i <= 9; i++) a.push(`${i}${d}`);
  a.push(`${d}0`);
  for (let j = 2; j <= 9; j++) a.push(`${d}${j}`);
  return unique(a);
}

function generateWin2(digits: string[], includeDouble: boolean) {
  const out: string[] = [];
  if (includeDouble) {
    for (const d of digits) out.push(`${d}${d}`);
  }
  for (let i = 0; i < digits.length; i++) {
    for (let j = i + 1; j < digits.length; j++) {
      out.push(`${digits[i]}${digits[j]}`);
    }
  }
  return unique(out);
}

function generateWin3(digits: string[], includeDouble: boolean) {
  const out: string[] = [];
  if (!includeDouble) {
    for (let i = 0; i < digits.length; i++) {
      for (let j = i + 1; j < digits.length; j++) {
        for (let k = j + 1; k < digits.length; k++) {
          out.push(`${digits[i]}${digits[j]}${digits[k]}`);
        }
      }
    }
    return unique(out);
  }

  // combinations with replacement i<=j<=k
  for (let i = 0; i < digits.length; i++) {
    for (let j = i; j < digits.length; j++) {
      for (let k = j; k < digits.length; k++) {
        out.push(`${digits[i]}${digits[j]}${digits[k]}`);
      }
    }
  }
  return unique(out);
}

function modeLimit(mode: BetType) {
  switch (mode) {
    case "19ประตู":
      return 19;
    case "วิ่ง":
      return 3;
    default:
      return 50;
  }
}

function counterTone(count: number, limit: number) {
  if (count > limit) return "danger";
  if (count >= Math.max(limit - 5, 1)) return "warn";
  return "ok";
}

function primaryTypeForMode(mode: BetType): RecordType {
  if (mode === "3ตัว") return "ตรง";
  if (mode === "วิน3") return "บน";
  return "บน";
}

function tagKey(n: string) {
  return n;
}

export function QuickBetPremiumPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isLiffReady, setIsLiffReady] = useState(false);
  const [lotteryName, setLotteryName] = useState<LotteryName | "">("");
  const [mode, setMode] = useState<BetType>("2ตัว");

  const [inputNumber, setInputNumber] = useState("");
  const [amountTop, setAmountTop] = useState("");
  const [amountBottom, setAmountBottom] = useState("");
  const [amountTod, setAmountTod] = useState("");
  const [memo, setMemo] = useState("");

  const [selectedDigits, setSelectedDigits] = useState<string[]>([]);
  const [generated, setGenerated] = useState<string[]>([]);

  const [isLocked, setIsLocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState>({ open: false });
  const toastTimerRef = useRef<number | null>(null);
  const lastAutoRef = useRef<string>("");

  const limit = useMemo(() => modeLimit(mode), [mode]);
  const countTone = useMemo(() => counterTone(generated.length, limit), [generated.length, limit]);

  const maxNumberLen = useMemo(() => {
    switch (mode) {
      case "2ตัว":
        return 2;
      case "3ตัว":
      case "6กลับ":
        return 3;
      case "19ประตู":
      case "วิ่ง":
        return 1;
      case "วิน2":
        return 2;
      case "วิน3":
        return 3;
    }
  }, [mode]);

  const parsedTop = useMemo(() => safeParseAmount(amountTop), [amountTop]);
  const parsedBottom = useMemo(() => safeParseAmount(amountBottom), [amountBottom]);
  const parsedTod = useMemo(() => safeParseAmount(amountTod), [amountTod]);
  const hasAtLeastOneAmount = parsedTop !== null || parsedBottom !== null || parsedTod !== null;

  const primaryType = useMemo(() => primaryTypeForMode(mode), [mode]);

  const showTod = mode === "3ตัว" || mode === "วิน3";
  const showBottom = mode === "2ตัว" || mode === "19ประตู" || mode === "วิ่ง" || mode === "วิน2";
  const showDigitPad = mode === "วิน2" || mode === "วิน3";

  const canSubmit =
    !!userId &&
    !!lotteryName &&
    generated.length > 0 &&
    hasAtLeastOneAmount &&
    generated.length <= limit &&
    !isLocked &&
    !isSubmitting;

  function showToast(tone: "success" | "error", message: string) {
    setToast({ open: true, tone, message });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast({ open: false }), 2400);
  }

  function setGeneratedFromSet(set: Set<string>) {
    const list = Array.from(set);
    list.sort((a, b) => a.localeCompare(b));
    setGenerated(list);
  }

  function addNumbers(nums: string[]) {
    if (isLocked) {
      showToast("error", "รายการถูกส่งแล้ว หากต้องการยกเลิก กรุณาแจ้งแอดมิน");
      return;
    }
    const set = new Set(generated);
    for (const n of nums) set.add(n);
    // enforce mode limits while generating (avoid setState-in-effect)
    const hardLimit = modeLimit(mode);
    if (set.size > hardLimit) {
      // keep lexicographically-first items for stability
      const trimmed = Array.from(set).sort((a, b) => a.localeCompare(b)).slice(0, hardLimit);
      setGenerated(trimmed);
      showToast("error", `เกินลิมิต ${hardLimit} รายการ`);
      return;
    }
    setGeneratedFromSet(set);
  }

  function removeNumber(n: string) {
    if (isLocked) {
      showToast("error", "รายการถูกส่งแล้ว หากต้องการยกเลิก กรุณาแจ้งแอดมิน");
      return;
    }
    const set = new Set(generated);
    set.delete(n);
    setGeneratedFromSet(set);
  }

  function clearGenerated() {
    if (isLocked) {
      showToast("error", "รายการถูกส่งแล้ว หากต้องการยกเลิก กรุณาแจ้งแอดมิน");
      return;
    }
    setGenerated([]);
  }

  function onChangeMode(next: BetType) {
    setMode(next);
    setInputNumber("");
    setSelectedDigits([]);
    clearGenerated();
    // keep amounts + memo (faster flow)
    setIsLocked(false);
  }

  function addCurrentNumberToGenerated() {
    if (!lotteryName) {
      showToast("error", "กรุณาเลือกชื่อหวย");
      return;
    }

    const raw = clampDigits(inputNumber, maxNumberLen);
    if (!raw) {
      showToast("error", "กรุณากรอกเลข");
      return;
    }

    if (mode === "19ประตู" || mode === "วิ่ง") {
      // only single digit
      addNumbers([raw]);
      setInputNumber("");
      return;
    }

    addNumbers([raw]);
    setInputNumber("");
  }

  function onNumberInputChange(nextRaw: string) {
    const raw = clampDigits(nextRaw, maxNumberLen);
    setInputNumber(raw);
    if (!raw) return;

    const key = `${mode}:${raw}`;
    if (lastAutoRef.current === key) return;

    if (mode === "19ประตู") {
      if (raw.length !== 1) return;
      lastAutoRef.current = key;
      addNumbers(generate19Doors(raw));
      setInputNumber("");
      return;
    }

    if (mode === "6กลับ") {
      if (raw.length !== 3) return;
      lastAutoRef.current = key;
      addNumbers(permutations3(raw));
      setInputNumber("");
      return;
    }

    if (mode === "2ตัว") {
      if (raw.length !== 2) return;
      lastAutoRef.current = key;
      addNumbers([raw]);
      setInputNumber("");
      return;
    }

    if (mode === "3ตัว") {
      if (raw.length !== 3) return;
      lastAutoRef.current = key;
      addNumbers([raw]);
      setInputNumber("");
      return;
    }
  }

  function reverse2(n: string) {
    if (n.length !== 2) return null;
    return n.split("").reverse().join("");
  }

  function reverseAnyFromGenerated() {
    if (generated.length === 0) return showToast("error", "ยังไม่มีรายการ");
    if (mode === "2ตัว" || mode === "วิน2") {
      const out = generated.map((n) => reverse2(n)).filter(Boolean) as string[];
      addNumbers(out);
      return;
    }
    if (mode === "3ตัว" || mode === "6กลับ" || mode === "วิน3") {
      const out = generated.flatMap((n) => (n.length === 3 ? permutations3(n) : []));
      addNumbers(out);
      return;
    }
    showToast("error", "โหมดนี้ไม่รองรับกลับเลข");
  }

  function actionReverse() {
    const raw = clampDigits(inputNumber, maxNumberLen);
    if (!raw) {
      reverseAnyFromGenerated();
      return;
    }

    if (mode === "2ตัว") {
      if (raw.length !== 2) return showToast("error", "โหมด 2ตัว ต้องกรอก 2 หลัก");
      addNumbers([raw.split("").reverse().join("")]);
      return;
    }

    if (mode === "3ตัว") {
      if (raw.length !== 3) return showToast("error", "โหมด 3ตัว ต้องกรอก 3 หลัก");
      addNumbers(permutations3(raw));
      return;
    }

    if (mode === "6กลับ") {
      if (raw.length !== 3) return showToast("error", "โหมด 6กลับ ต้องกรอก 3 หลัก");
      addNumbers(permutations3(raw));
      return;
    }

    if (mode === "วิน2") {
      if (raw.length !== 2) return showToast("error", "โหมด วิน2 ต้องเป็น 2 หลัก");
      addNumbers([raw.split("").reverse().join("")]);
      return;
    }

    if (mode === "วิน3") {
      if (raw.length !== 3) return showToast("error", "โหมด วิน3 ต้องเป็น 3 หลัก");
      addNumbers(permutations3(raw));
      return;
    }

    showToast("error", "โหมดนี้ไม่รองรับกลับเลข");
  }

  function actionDouble() {
    if (mode === "2ตัว") {
      addNumbers(Array.from({ length: 10 }, (_, i) => `${i}${i}`));
      return;
    }
    if (mode === "3ตัว") {
      // 35 รายการตามสเปก (combinations with replacement 0-9)
      addNumbers(
        generateWin3(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"], true),
      );
      return;
    }
    showToast("error", "โหมดนี้ไม่รองรับเลขเบิ้ล");
  }

  function action19Doors() {
    const raw = clampDigits(inputNumber, 1);
    if (!raw || raw.length !== 1) return showToast("error", "19ประตูรับได้เฉพาะเลขเดียว 0-9");
    addNumbers(generate19Doors(raw));
    setInputNumber("");
  }

  function toggleDigit(d: string) {
    setSelectedDigits((prev) => {
      const set = new Set(prev);
      if (set.has(d)) set.delete(d);
      else set.add(d);
      const arr = Array.from(set);
      arr.sort((a, b) => a.localeCompare(b));
      return arr;
    });
  }

  function actionWin(includeDouble: boolean) {
    if (mode !== "วิน2" && mode !== "วิน3") return;
    const max = 5;
    if (selectedDigits.length === 0) return showToast("error", "กรุณาเลือกตัวเลขก่อน");
    if (selectedDigits.length > max) return showToast("error", `เลือกได้ไม่เกิน ${max} ตัว`);

    if (mode === "วิน2") {
      addNumbers(generateWin2(selectedDigits, includeDouble));
      return;
    }
    addNumbers(generateWin3(selectedDigits, includeDouble));
  }

  function applyModeRules() {
    // enforce per-mode max generated
    if (generated.length <= limit) return true;
    showToast("error", `เกินลิมิต ${limit} รายการ`);
    return false;
  }

  async function submit() {
    if (!userId) return showToast("error", "ยังไม่ได้เข้าสู่ระบบ LINE");
    if (!lotteryName) return showToast("error", "กรุณาเลือกชื่อหวย");
    if (generated.length === 0) return showToast("error", "ยังไม่มีรายการ");
    if (!hasAtLeastOneAmount) return showToast("error", "กรุณากรอกยอดอย่างน้อย 1 ช่อง");
    if (!applyModeRules()) return;
    if (isLocked) return showToast("error", "รายการถูกส่งแล้ว หากต้องการยกเลิก กรุณาแจ้งแอดมิน");

    const items: Array<{ number: string; type: RecordType; amount: number }> = [];

    const addItem = (n: string, type: RecordType, amount: number | null) => {
      if (amount === null) return;
      items.push({ number: n, type, amount });
    };

    for (const n of generated) {
      if (mode === "6กลับ") {
        addItem(n, "บน", parsedTop);
        continue;
      }

      addItem(n, primaryType, parsedTop);
      if (showBottom) addItem(n, "ล่าง", parsedBottom);
      if (showTod) addItem(n, "โต๊ด", parsedTod);
    }

    if (items.length === 0) return showToast("error", "กรุณากรอกยอดอย่างน้อย 1 ช่อง");

    const createdAt = new Date().toISOString();
    const total = items.reduce((sum, it) => sum + it.amount, 0);

    setIsSubmitting(true);
    try {
      await saveRecords({
        userId,
        lotteryName,
        betType: mode,
        note: memo.trim() ? memo.trim() : undefined,
        items,
      });

      setIsLocked(true);
      showToast("success", "ส่งรายการซื้อเรียบร้อย (กำลังส่งบิลเข้า LINE)");

      const maxLines = 50;
      const listNumbers = generated.slice(0, maxLines);
      const extraCount = Math.max(0, generated.length - maxLines);

      const fmtAmount = (n: number) => new Intl.NumberFormat("th-TH").format(n);

      const linePerNumber = (n: string) => {
        const parts: string[] = [];
        if (mode === "6กลับ") {
          if (parsedTop !== null) parts.push(`บน ${fmtAmount(parsedTop)}`);
        } else {
          if (parsedTop !== null) parts.push(`${primaryType} ${fmtAmount(parsedTop)}`);
          if (showBottom && parsedBottom !== null) parts.push(`ล่าง ${fmtAmount(parsedBottom)}`);
          if (showTod && parsedTod !== null) parts.push(`โต๊ด ${fmtAmount(parsedTod)}`);
        }
        return `${n} / ${parts.join(" / ")}`;
      };

      const summaryLines = listNumbers.map(linePerNumber);
      if (extraCount > 0) summaryLines.push(`…และอีก ${extraCount} รายการ`);

      const customerText = [
        "🧾 สรุปรายการ",
        "",
        `หวย: ${lotteryName}`,
        `ประเภท: ${mode}`,
        "",
        `จำนวนรายการ: ${generated.length} รายการ`,
        "",
        "รายการ:",
        ...summaryLines,
        "",
        `รวมยอด: ฿${fmtAmount(total)}`,
        "",
        "สถานะ: รอดำเนินการ",
      ].join("\n");

      const adminText = [
        "🚨 มีรายการใหม่",
        "",
        `ลูกค้า: ${displayName ?? "-"}`,
        "",
        `userId: ${userId}`,
        "",
        `หวย: ${lotteryName}`,
        `ประเภท: ${mode}`,
        `จำนวน: ${generated.length}`,
        `ยอดรวม: ฿${fmtAmount(total)}`,
        `เวลา: ${createdAt}`,
      ].join("\n");

      try {
        await liff.sendMessages([{ type: "text", text: customerText }, { type: "text", text: adminText }]);
      } catch {
        // IMPORTANT: do not rollback database
        showToast("error", "บันทึกสำเร็จ แต่ส่งบิลเข้า LINE ไม่สำเร็จ");
      }
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "ส่งรายการไม่สำเร็จ");
    } finally {
      setIsSubmitting(false);
    }
  }

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
        setDisplayName(p.displayName ?? null);
      } catch {
        showToast("error", "ไม่สามารถเริ่มต้น LIFF ได้");
      } finally {
        setIsLiffReady(true);
      }
    }
    init();
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    // Mode-specific quick generation helpers
    if (mode === "19ประตู" && inputNumber.length === 1) {
      // keep manual: user must press button to generate
      return;
    }
  }, [mode, inputNumber]);

  const counterClass = useMemo(() => {
    if (countTone === "danger") return "bg-rose-500/20 text-rose-800 border-rose-400/30";
    if (countTone === "warn") return "bg-orange-500/20 text-orange-900 border-orange-400/30";
    return "bg-amber-400/25 text-amber-950 border-amber-300/40";
  }, [countTone]);

  const pageBg =
    "min-h-screen bg-gradient-to-b from-emerald-50 via-emerald-50 to-emerald-100 text-zinc-950";

  const card =
    "rounded-[18px] border border-emerald-900/10 bg-white/70 backdrop-blur shadow-[0_10px_30px_rgba(16,185,129,0.12)]";

  const insetCard =
    "rounded-[18px] border border-zinc-900/10 bg-zinc-100/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_10px_24px_rgba(0,0,0,0.05)]";

  const input =
    "w-full rounded-[16px] border border-zinc-900/10 bg-white/90 px-4 py-3 text-[16px] outline-none transition-all duration-200 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-300/40";

  const darkBtn =
    "inline-flex items-center justify-center gap-2 rounded-[18px] bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.25)] transition-all duration-200 active:scale-[0.99] disabled:opacity-55 disabled:shadow-none";

  const darkBtnSecondary =
    "inline-flex items-center justify-center gap-2 rounded-[18px] border border-slate-900/15 bg-slate-900/90 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition-all duration-200 active:scale-[0.99] disabled:opacity-55";

  const tabWrap =
    "rounded-[18px] border border-emerald-900/10 bg-white/65 p-1.5 shadow-[0_10px_26px_rgba(16,185,129,0.10)]";

  const submitBar =
    "fixed bottom-0 left-0 right-0 border-t border-emerald-900/10 bg-white/70 backdrop-blur px-5 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))]";

  const submitBtn =
    "w-full rounded-[20px] bg-gradient-to-b from-slate-950 to-slate-900 px-5 py-4 text-base font-bold text-white shadow-[0_14px_40px_rgba(15,23,42,0.30)] transition-all duration-200 active:scale-[0.99] disabled:opacity-55";

  return (
    <main className={pageBg}>
      <section className="max-w-md mx-auto w-full px-4 max-[390px]:px-3 pb-[calc(120px+env(safe-area-inset-bottom))] pt-6">
        <header className="mb-3 flex items-center justify-between gap-3 w-full max-w-full">
          <div>
            <h1 className="text-xl max-[390px]:text-lg font-extrabold tracking-tight">
              บันทึกรายการ
            </h1>
            <p className="text-sm max-[390px]:text-xs text-emerald-900/60">
              แทงเร็ว • มือเดียว • Premium
            </p>
          </div>
          <Link
            href="/"
            className="rounded-[18px] border border-emerald-900/10 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition-all duration-200 active:scale-[0.99]"
          >
            กลับ
          </Link>
        </header>

        <div className={`w-full overflow-hidden rounded-3xl ${card} p-4 max-[390px]:p-3`}>
          {!isLiffReady ? (
            <div className="rounded-[16px] border border-emerald-900/10 bg-white/70 px-4 py-3 text-sm text-slate-700">
              กำลังเชื่อมต่อ LINE...
            </div>
          ) : !userId ? (
            <div className="rounded-[16px] border border-rose-500/20 bg-rose-50/70 px-4 py-3 text-sm text-rose-900">
              ยังไม่ได้เข้าสู่ระบบ LINE (กำลังพยายามล็อกอิน)
            </div>
          ) : (
            <div className="rounded-[16px] border border-emerald-900/10 bg-white/60 px-4 py-3 text-xs text-slate-600 break-all">
              userId: {userId}
            </div>
          )}

          <div className="mt-4 grid gap-3 w-full max-w-full">
            <div className="grid gap-2 w-full max-w-full">
              <label className="text-sm font-semibold text-slate-900">
                เลือกชื่อหวย
              </label>
              <div className="relative w-full max-w-full box-border">
                <select
                  value={lotteryName}
                  onChange={(e) => setLotteryName(e.target.value as LotteryName)}
                  className={`${input} w-full max-w-full box-border appearance-none pr-10`}
                >
                  <option value="" disabled>
                    เลือกชื่อหวย...
                  </option>
                  {LOTTERY_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                  ▾
                </div>
              </div>
            </div>

            <div className="grid gap-2 w-full max-w-full">
              <label className="text-sm font-semibold text-slate-900">
                เลือกประเภทแทง
              </label>
              <div className={`${tabWrap} w-full max-w-full overflow-hidden`}>
                <div className="grid grid-cols-4 max-[390px]:grid-cols-3 gap-2 w-full max-w-full">
                  {MODES.map((m) => {
                    const active = mode === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => onChangeMode(m)}
                        className={`h-11 w-full max-w-full rounded-xl px-2 text-[15px] max-[390px]:text-sm font-extrabold transition-all duration-200 ${
                          active
                            ? "bg-gradient-to-b from-cyan-400 to-sky-500 text-white shadow-[0_10px_30px_rgba(56,189,248,0.35)]"
                            : "bg-white/75 text-slate-700 border border-emerald-900/10 shadow-sm hover:bg-white/90"
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

            <div className="flex items-center justify-between w-full max-w-full">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">
                  รายการเลข
                </span>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-extrabold ${counterClass}`}
                >
                  {generated.length} รายการ
                </span>
              </div>
              <button
                type="button"
                onClick={clearGenerated}
                className="text-sm font-semibold text-slate-700 hover:text-slate-900"
              >
                ล้างทั้งหมด
              </button>
            </div>

            <div className="rounded-[18px] border border-emerald-900/10 bg-emerald-50/70 p-3 w-full max-w-full overflow-hidden">
              <AnimatePresence initial={false}>
                {generated.length === 0 ? (
                  <motion.p
                    key="empty"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-sm text-emerald-900/60"
                  >
                    ยังไม่มีรายการ (ใช้ปุ่มด้านล่างเพื่อ generate)
                  </motion.p>
                ) : (
                  <motion.div
                    key="list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-wrap gap-2 w-full max-w-full overflow-hidden"
                  >
                    {generated.map((n) => (
                      <motion.span
                        layout
                        key={tagKey(n)}
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.85, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(16,185,129,0.25)]"
                      >
                        {n}
                        <button
                          type="button"
                          onClick={() => removeNumber(n)}
                          className="rounded-full bg-emerald-700/70 p-1.5 transition-all active:scale-[0.98]"
                          aria-label={`ลบ ${n}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </motion.span>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className={`${insetCard} grid gap-3 p-4 w-full max-w-full overflow-hidden`}>
              <div className="grid gap-2 w-full max-w-full">
                <label className="text-sm font-semibold text-slate-900">เลข</label>
                <input
                  value={inputNumber}
                    onChange={(e) => onNumberInputChange(e.target.value)}
                  inputMode="numeric"
                  placeholder={
                    mode === "19ประตู" || mode === "วิ่ง" ? "0-9" : mode === "2ตัว" ? "00-99" : "000-999"
                  }
                  className={`${input} w-full max-w-full`}
                />
                <button
                  type="button"
                  onClick={addCurrentNumberToGenerated}
                  className={`${darkBtnSecondary} h-12 w-full max-w-full`}
                >
                  <BadgePlus className="h-4 w-4" />
                  เพิ่มเลข
                </button>
              </div>

              {showDigitPad && (
                <div className="grid gap-2 w-full max-w-full">
                  <p className="text-sm font-semibold text-slate-900">
                    เลือกเลข (สูงสุด 5 ตัว)
                  </p>
                  <div className="grid grid-cols-5 gap-2 w-full max-w-full">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((d) => {
                      const active = selectedDigits.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleDigit(d)}
                          className={`rounded-[16px] border px-0 py-3 text-sm font-extrabold transition-all duration-200 active:scale-[0.99] ${
                            active
                              ? "border-sky-300/60 bg-sky-500 text-white shadow-[0_10px_24px_rgba(56,189,248,0.30)]"
                              : "border-zinc-900/10 bg-white/80 text-slate-800"
                          }`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2 w-full max-w-full overflow-hidden">
                    {selectedDigits.length === 0 ? (
                      <span className="text-xs text-slate-600">ยังไม่ได้เลือก</span>
                    ) : (
                      selectedDigits.map((d) => (
                        <span
                          key={d}
                          className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-extrabold text-sky-900"
                        >
                          {d}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="grid gap-2 w-full max-w-full">
                <p className="text-sm font-semibold text-slate-900">ยอดแทง</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="grid gap-1">
                    <label className="text-xs font-bold text-slate-600">
                      {mode === "3ตัว" ? "ตรง" : mode === "วิน3" ? "บน" : "บน"}
                    </label>
                    <input
                      value={amountTop}
                      onChange={(e) => setAmountTop(e.target.value)}
                      inputMode="decimal"
                      placeholder="0"
                      className={`${input} w-full max-w-full`}
                    />
                  </div>

                  {showBottom ? (
                    <div className="grid gap-1">
                      <label className="text-xs font-bold text-slate-600">ล่าง</label>
                      <input
                        value={amountBottom}
                        onChange={(e) => setAmountBottom(e.target.value)}
                        inputMode="decimal"
                        placeholder="0"
                        className={`${input} w-full max-w-full`}
                      />
                    </div>
                  ) : showTod ? (
                    <div className="grid gap-1">
                      <label className="text-xs font-bold text-slate-600">โต๊ด</label>
                      <input
                        value={amountTod}
                        onChange={(e) => setAmountTod(e.target.value)}
                        inputMode="decimal"
                        placeholder="0"
                        className={`${input} w-full max-w-full`}
                      />
                    </div>
                  ) : (
                    <div className="grid gap-1">
                      <label className="text-xs font-bold text-slate-600">—</label>
                      <div className="h-[46px] rounded-[16px] border border-zinc-900/10 bg-zinc-50/70" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-600">
                  กรอกยอดอย่างน้อย 1 ช่อง (รองรับ comma)
                </p>
              </div>

              <div className="grid gap-2 w-full max-w-full">
                <p className="text-sm font-semibold text-slate-900">Action</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={actionReverse} className={`${darkBtn} h-12`}>
                    <ArrowLeftRight className="h-4 w-4" />
                    กลับเลข
                  </button>
                  <button type="button" onClick={actionDouble} className={`${darkBtn} h-12`}>
                    <Sparkles className="h-4 w-4" />
                    เลขเบิ้ล
                  </button>
                </div>

                {(mode === "วิน2" || mode === "วิน3") && (
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => actionWin(false)} className={`${darkBtn} h-12`}>
                      <Shuffle className="h-4 w-4" />
                      วินเลข
                    </button>
                    <button type="button" onClick={() => actionWin(true)} className={`${darkBtn} h-12`}>
                      <Dice5 className="h-4 w-4" />
                      วินเลขเบิ้ล
                    </button>
                  </div>
                )}

                {mode === "19ประตู" && (
                  <button type="button" onClick={action19Doors} className={`${darkBtn} h-12`}>
                    <CopyX className="h-4 w-4" />
                    สร้าง 19 ประตู
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setInputNumber("");
                      setSelectedDigits([]);
                    }}
                    className={`${darkBtnSecondary} h-12`}
                  >
                    <Eraser className="h-4 w-4" />
                    เคลียร์ฟอร์ม
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputNumber("");
                      setSelectedDigits([]);
                      clearGenerated();
                      setAmountTop("");
                      setAmountBottom("");
                      setAmountTod("");
                      setMemo("");
                    }}
                    className={`${darkBtnSecondary} h-12`}
                  >
                    <Eraser className="h-4 w-4" />
                    เคลียร์ทั้งหมด
                  </button>
                </div>
              </div>

              <div className="grid gap-2 w-full max-w-full">
                <label className="text-sm font-semibold text-slate-900">
                  บันทึกช่วยจำ
                </label>
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="เช่น ชื่อลูกค้า / เงื่อนไข / โน้ต"
                  className={`${input} min-h-[92px] resize-none w-full max-w-full`}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className={submitBar}>
        <div className="mx-auto w-full max-w-[480px]">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800">
              {generated.length} รายการ
            </span>
            <span className="text-sm font-extrabold text-amber-800">
              ฿
              {new Intl.NumberFormat("th-TH").format(
                (() => {
                  const itemsPerNumber =
                    mode === "6กลับ"
                      ? (parsedTop !== null ? 1 : 0)
                      : (parsedTop !== null ? 1 : 0) +
                        (showBottom && parsedBottom !== null ? 1 : 0) +
                        (showTod && parsedTod !== null ? 1 : 0);
                  const perNumberTotal =
                    (parsedTop ?? 0) +
                    (showBottom ? parsedBottom ?? 0 : 0) +
                    (showTod ? parsedTod ?? 0 : 0);
                  if (itemsPerNumber === 0) return 0;
                  if (mode === "6กลับ") return generated.length * (parsedTop ?? 0);
                  return generated.length * perNumberTotal;
                })(),
              )}
            </span>
          </div>
          <button type="button" onClick={submit} disabled={!canSubmit} className={submitBtn}>
            <span className="inline-flex items-center justify-center gap-2">
              {isSubmitting ? (
                <>
                  <Check className="h-5 w-5" />
                  กำลังส่ง...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  ส่งรายการซื้อ
                </>
              )}
            </span>
          </button>
          <p className="mt-2 text-center text-xs text-emerald-900/60">
            ต้องเลือกชื่อหวย • ต้องมีรายการ • ต้องกรอกยอดอย่างน้อย 1 ช่อง • ส่งแล้วจะล็อกบิล
          </p>
        </div>
      </div>

      {toast.open && (
        <div className="fixed left-0 right-0 bottom-[92px] px-5">
          <div
            role="status"
            className={`mx-auto max-w-md rounded-[18px] border px-4 py-3 text-sm font-semibold shadow-lg backdrop-blur ${
              toast.tone === "success"
                ? "border-emerald-500/25 bg-emerald-50/80 text-emerald-950"
                : "border-rose-500/25 bg-rose-50/80 text-rose-950"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </main>
  );
}

