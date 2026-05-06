"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import liff from "@line/liff";

type WalletDTO = {
  wallet: {
    id: string;
    user_id: string;
    display_name: string | null;
    credit_balance: number;
    locked_balance: number;
  };
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    status: string;
    bank_name: string | null;
    account_name: string | null;
    account_number: string | null;
    slip_url: string | null;
    note: string | null;
    admin_note: string | null;
    created_at: string;
  }>;
};

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

function parseAmount(raw: string) {
  const n = Number(raw.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : NaN;
}

async function authedFetch(input: RequestInfo, init: RequestInit = {}) {
  const idToken = liff.getIDToken();
  if (!idToken) throw new Error("ไม่พบ LINE id token");
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${idToken}`);
  return fetch(input, { ...init, headers });
}

export function WalletPremiumPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [data, setData] = useState<WalletDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const [depositBankName, setDepositBankName] = useState("");
  const [depositFile, setDepositFile] = useState<File | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawBankName, setWithdrawBankName] = useState("");
  const [withdrawAccountName, setWithdrawAccountName] = useState("");
  const [withdrawAccountNumber, setWithdrawAccountNumber] = useState("");
  const [withdrawNote, setWithdrawNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const abortRef = useRef({ aborted: false });

  const credit = data?.wallet.credit_balance ?? 0;
  const locked = data?.wallet.locked_balance ?? 0;

  const parsedDepositAmount = useMemo(() => parseAmount(depositAmount), [depositAmount]);
  const parsedWithdrawAmount = useMemo(() => parseAmount(withdrawAmount), [withdrawAmount]);

  async function loadWallet() {
    const res = await authedFetch("/api/wallet");
    const json = (await res.json().catch(() => ({}))) as unknown as WalletDTO & { error?: string };
    if (!res.ok) throw new Error(json?.error || "โหลด wallet ไม่สำเร็จ");
    setData(json as WalletDTO);
  }

  async function uploadSlipIfAny(): Promise<string | undefined> {
    if (!depositFile) return undefined;
    const res = await authedFetch("/api/wallet/slip-upload-url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        filename: depositFile.name,
        contentType: depositFile.type,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as unknown as {
      uploadUrl?: string;
      publicUrl?: string;
      error?: string;
      detail?: string;
    };
    if (!res.ok) throw new Error(json?.error || json?.detail || "สร้างลิงก์อัปโหลดไม่สำเร็จ");

    const uploadUrl = String(json.uploadUrl || "");
    if (!uploadUrl) throw new Error("uploadUrl missing");

    const put = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "content-type": depositFile.type || "application/octet-stream",
      },
      body: depositFile,
    });
    if (!put.ok) throw new Error("อัปโหลดสลิปไม่สำเร็จ");

    return String(json.publicUrl || "");
  }

  async function submitDeposit() {
    if (!Number.isFinite(parsedDepositAmount) || parsedDepositAmount <= 0) {
      alert("กรุณากรอกจำนวนเงินที่ถูกต้อง");
      return;
    }
    setIsSubmitting(true);
    try {
      const slipUrl = await uploadSlipIfAny();
      const res = await authedFetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          amount: parsedDepositAmount,
          slipUrl: slipUrl || undefined,
          bankName: depositBankName.trim() || undefined,
          note: depositNote.trim() || undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as unknown as { error?: string };
      if (!res.ok) throw new Error(json?.error || "ส่งคำขอเติมเครดิตไม่สำเร็จ");

      setDepositAmount("");
      setDepositNote("");
      setDepositBankName("");
      setDepositFile(null);
      await loadWallet();
      alert("ส่งคำขอเติมเครดิตแล้ว (รออนุมัติ)");
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitWithdraw() {
    if (!Number.isFinite(parsedWithdrawAmount) || parsedWithdrawAmount <= 0) {
      alert("กรุณากรอกจำนวนเงินที่ถูกต้อง");
      return;
    }
    if (!withdrawBankName.trim() || !withdrawAccountName.trim() || !withdrawAccountNumber.trim()) {
      alert("กรุณากรอกข้อมูลบัญชีรับเงินให้ครบ");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await authedFetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          amount: parsedWithdrawAmount,
          bankName: withdrawBankName.trim(),
          accountName: withdrawAccountName.trim(),
          accountNumber: withdrawAccountNumber.trim(),
          note: withdrawNote.trim() || undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as unknown as { error?: string };
      if (!res.ok) throw new Error(json?.error || "ส่งคำขอถอนเครดิตไม่สำเร็จ");

      setWithdrawAmount("");
      setWithdrawBankName("");
      setWithdrawAccountName("");
      setWithdrawAccountNumber("");
      setWithdrawNote("");
      await loadWallet();
      alert("ส่งคำขอถอนเครดิตแล้ว (รออนุมัติ)");
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    abortRef.current.aborted = false;
    const abortState = abortRef.current;

    async function init() {
      setIsLoading(true);
      setError(null);
      try {
        await liff.init({ liffId: "2009989826-L6OPDoa5" });
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        const p = await liff.getProfile();
        if (abortState.aborted) return;
        setUserId(p.userId);
        setDisplayName(p.displayName ?? null);
        await loadWallet();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ";
        setError(msg);
      } finally {
        if (!abortState.aborted) setIsLoading(false);
      }
    }

    init();
    return () => {
      abortState.aborted = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-black text-white px-5 py-6">
      <section className="max-w-md mx-auto">
        <header className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight">เครดิต</h1>
            <p className="text-sm text-zinc-500 break-all">
              {userId ? `userId: ${userId}` : "กำลังโหลดผู้ใช้..."}
            </p>
          </div>
          <Link
            href="/"
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200 transition-all duration-200 hover:bg-zinc-800/70 hover:-translate-y-0.5 active:scale-[0.99]"
          >
            กลับหน้าแรก
          </Link>
        </header>

        {isLoading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 px-4 py-3 text-sm text-zinc-300">
            กำลังโหลด...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-900/50 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : !data ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 px-4 py-3 text-sm text-zinc-300">
            ไม่พบข้อมูลเครดิต
          </div>
        ) : (
          <div className="grid gap-3">
            <div className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black p-5">
              <p className="text-xs text-zinc-500">{displayName ?? "-"}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2">
                  <p className="text-xs text-zinc-500">เครดิตคงเหลือ</p>
                  <p className="text-lg font-bold">{formatTHB(credit)}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2">
                  <p className="text-xs text-zinc-500">เครดิตที่ล็อก</p>
                  <p className="text-lg font-bold">{formatTHB(locked)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-5">
              <p className="font-semibold">เติมเครดิต</p>
              <div className="grid gap-3 mt-3">
                <input
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="จำนวนเงิน เช่น 500"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:border-zinc-600 focus:ring-2 focus:ring-white/10"
                />
                <input
                  value={depositBankName}
                  onChange={(e) => setDepositBankName(e.target.value)}
                  placeholder="ธนาคารที่โอน (ถ้ามี)"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:border-zinc-600 focus:ring-2 focus:ring-white/10"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setDepositFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-zinc-300"
                />
                <textarea
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                  placeholder="หมายเหตุ (ถ้ามี)"
                  className="w-full min-h-[92px] resize-none rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:border-zinc-600 focus:ring-2 focus:ring-white/10"
                />
                <button
                  type="button"
                  onClick={submitDeposit}
                  disabled={isSubmitting}
                  className="rounded-xl bg-white px-5 py-3 text-black font-semibold transition-all duration-200 active:scale-[0.99] disabled:opacity-60"
                >
                  {isSubmitting ? "กำลังส่ง..." : "ส่งคำขอเติมเครดิต"}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-5">
              <p className="font-semibold">ถอนเครดิต</p>
              <div className="grid gap-3 mt-3">
                <input
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="จำนวนเงิน เช่น 500"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:border-zinc-600 focus:ring-2 focus:ring-white/10"
                />
                <input
                  value={withdrawBankName}
                  onChange={(e) => setWithdrawBankName(e.target.value)}
                  placeholder="ธนาคาร"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:border-zinc-600 focus:ring-2 focus:ring-white/10"
                />
                <input
                  value={withdrawAccountName}
                  onChange={(e) => setWithdrawAccountName(e.target.value)}
                  placeholder="ชื่อบัญชี"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:border-zinc-600 focus:ring-2 focus:ring-white/10"
                />
                <input
                  value={withdrawAccountNumber}
                  onChange={(e) => setWithdrawAccountNumber(e.target.value)}
                  placeholder="เลขบัญชี"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:border-zinc-600 focus:ring-2 focus:ring-white/10"
                />
                <textarea
                  value={withdrawNote}
                  onChange={(e) => setWithdrawNote(e.target.value)}
                  placeholder="หมายเหตุ (ถ้ามี)"
                  className="w-full min-h-[72px] resize-none rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-white placeholder:text-zinc-600 outline-none focus:border-zinc-600 focus:ring-2 focus:ring-white/10"
                />
                <button
                  type="button"
                  onClick={submitWithdraw}
                  disabled={isSubmitting}
                  className="rounded-xl bg-white px-5 py-3 text-black font-semibold transition-all duration-200 active:scale-[0.99] disabled:opacity-60"
                >
                  {isSubmitting ? "กำลังส่ง..." : "ส่งคำขอถอนเครดิต"}
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              <p className="font-semibold">ประวัติรายการเครดิต</p>
              {data.transactions.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 px-4 py-3 text-sm text-zinc-300">
                  ยังไม่มีรายการ
                </div>
              ) : (
                data.transactions.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{t.type}</p>
                        <p className="text-xs text-zinc-500 mt-1">
                          {formatDate(t.created_at)} • {t.status}
                        </p>
                        {t.note && (
                          <p className="text-xs text-zinc-400 mt-1">{t.note}</p>
                        )}
                        {t.admin_note && (
                          <p className="text-xs text-amber-200 mt-1">
                            admin: {t.admin_note}
                          </p>
                        )}
                      </div>
                      <p className="text-sm font-semibold">{formatTHB(t.amount)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

