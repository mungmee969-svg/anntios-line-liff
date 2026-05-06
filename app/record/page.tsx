"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type RecordType = "2 ตัว" | "3 ตัว" | "วิ่ง";

type RecordDraft = {
  number: string;
  amount: string;
  type: RecordType;
  note: string;
};

type StoredRecord = {
  id: string;
  createdAt: string;
  number: string;
  amount: number;
  type: RecordType;
  note?: string;
};

const STORAGE_KEY = "anntios.records.v1";

function safeParseAmount(raw: string): number | null {
  const normalized = raw.replace(/,/g, "").trim();
  if (!normalized) return null;
  const num = Number(normalized);
  if (!Number.isFinite(num)) return null;
  if (num <= 0) return null;
  return num;
}

function safeLoadRecords(): StoredRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as StoredRecord[];
  } catch {
    return [];
  }
}

function safeSaveRecords(records: StoredRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

const inputBase =
  "w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-white placeholder:text-zinc-600 shadow-sm outline-none transition-all duration-200 focus:border-zinc-600 focus:ring-2 focus:ring-white/10";

export default function RecordPage() {
  const [draft, setDraft] = useState<RecordDraft>({
    number: "",
    amount: "",
    type: "2 ตัว",
    note: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const parsedAmount = useMemo(
    () => safeParseAmount(draft.amount),
    [draft.amount],
  );

  const canSubmit =
    draft.number.trim().length > 0 && parsedAmount !== null && !isSubmitting;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const number = draft.number.trim();
    const amount = safeParseAmount(draft.amount);
    const type = draft.type;
    const note = draft.note.trim();

    if (!number) {
      setError("กรุณากรอกเลข");
      return;
    }
    if (amount === null) {
      setError("กรุณากรอกจำนวนเงินที่ถูกต้อง");
      return;
    }

    setIsSubmitting(true);
    try {
      const records = safeLoadRecords();
      const next: StoredRecord = {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        createdAt: new Date().toISOString(),
        number,
        amount,
        type,
        note: note ? note : undefined,
      };
      safeSaveRecords([next, ...records].slice(0, 500));

      setDraft({ number: "", amount: "", type: "2 ตัว", note: "" });
      setSuccess("บันทึกรายการเรียบร้อย");
    } catch {
      setError("บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
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
              <label htmlFor="type" className="text-sm font-medium">
                ประเภท
              </label>
              <select
                id="type"
                name="type"
                value={draft.type}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    type: e.target.value as RecordType,
                  }))
                }
                className={`${inputBase} appearance-none`}
              >
                <option value="2 ตัว">2 ตัว</option>
                <option value="3 ตัว">3 ตัว</option>
                <option value="วิ่ง">วิ่ง</option>
              </select>
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

            {(error || success) && (
              <div
                role="status"
                className={`rounded-xl border px-4 py-3 text-sm ${
                  error
                    ? "border-rose-900/50 bg-rose-950/30 text-rose-200"
                    : "border-emerald-900/50 bg-emerald-950/25 text-emerald-200"
                }`}
              >
                {error ?? success}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="group rounded-xl bg-white px-5 py-3 text-black font-semibold shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:shadow-white/10 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "กำลังบันทึก..." : "บันทึกรายการ"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

