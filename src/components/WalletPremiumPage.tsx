"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CreditBadge } from "@/components/CreditBadge";
import { useWalletData } from "@/src/components/WalletDataProvider";
import { useLiffAuth } from "@/src/components/LiffAuthProvider";
import { ensureLiffReady } from "@/src/lib/liffAuth";
import { PAYMENT_METHODS } from "@/src/lib/payment-config";
import liff from "@line/liff";

type TxRow = {
  id: string;
  type: string;
  amount: number;
  status: string;
  note: string | null;
  admin_note: string | null;
  created_at: string;
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

type Mode = "home" | "deposit" | "withdraw";

export function WalletPremiumPage({ mode = "home" }: { mode?: Mode }) {
  const { isSessionReady, authFetch } = useLiffAuth();
  const { wallet: wCtx, transactions, isLoading: wLoading, error: wErr, refreshWallet } =
    useWalletData();

  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

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

  const credit = wCtx?.credit_balance ?? 0;
  const parsedDepositAmount = useMemo(() => parseAmount(depositAmount), [depositAmount]);
  const parsedWithdrawAmount = useMemo(() => parseAmount(withdrawAmount), [withdrawAmount]);

  useEffect(() => {
    if (!isSessionReady) return;
    let cancelled = false;
    async function profile() {
      try {
        await ensureLiffReady();
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        const p = await liff.getProfile();
        if (!cancelled) {
          setUserId(p.userId);
          setDisplayName(p.displayName ?? null);
        }
      } catch {
        /* ignore */
      }
    }
    profile();
    return () => {
      cancelled = true;
    };
  }, [isSessionReady]);

  async function uploadSlipIfAny(): Promise<string | undefined> {
    if (!depositFile) return undefined;
    const res = await authFetch("/api/wallet/slip-upload-url", {
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
    if (!depositBankName.trim()) {
      alert("กรุณาเลือกธนาคาร");
      return;
    }
    if (!Number.isFinite(parsedDepositAmount) || parsedDepositAmount <= 0) {
      alert("กรุณากรอกจำนวนเงินที่ถูกต้อง");
      return;
    }
    if (!depositFile) {
      alert("กรุณาอัปโหลดสลิป");
      return;
    }
    setIsSubmitting(true);
    try {
      const slipUrl = await uploadSlipIfAny();
      const res = await authFetch("/api/wallet/deposit", {
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
      await refreshWallet();
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
    if (parsedWithdrawAmount > credit) {
      alert("ถอนเกินเครดิตคงเหลือไม่ได้");
      return;
    }
    if (!withdrawBankName.trim() || !withdrawAccountName.trim() || !withdrawAccountNumber.trim()) {
      alert("กรุณากรอกข้อมูลบัญชีรับเงินให้ครบ");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await authFetch("/api/wallet/withdraw", {
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
      await refreshWallet();
      alert("ส่งคำขอถอนเครดิตแล้ว (รออนุมัติ)");
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setIsSubmitting(false);
    }
  }

  const txs = (transactions ?? []) as TxRow[];

  const title =
    mode === "deposit" ? "เติมเครดิต" : mode === "withdraw" ? "ถอนเครดิต" : "กระเป๋าเงิน";

  return (
    <main className="min-h-screen bg-black text-white px-4 py-6 pb-28 sm:px-5">
      <section className="max-w-md mx-auto w-full min-w-0">
        <header className="flex items-start justify-between gap-3 mb-5 min-w-0">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight truncate">{title}</h1>
            <p className="text-xs text-zinc-500 break-all mt-1">
              {userId ? userId : "กำลังโหลดผู้ใช้..."}
            </p>
            {displayName && (
              <p className="text-sm text-zinc-400 mt-0.5 truncate">{displayName}</p>
            )}
          </div>
          <Link
            href="/"
            className="shrink-0 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200"
          >
            หลัก
          </Link>
        </header>

        <div className="mb-4 min-w-0">
          <CreditBadge className="w-full max-w-full" />
        </div>

        {wErr && (
          <div className="mb-4 rounded-2xl border border-rose-900/50 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
            {wErr}
          </div>
        )}

        {mode === "home" && (
          <div className="grid grid-cols-2 gap-2 mb-6">
            <Link
              href="/wallet/deposit"
              className="rounded-2xl bg-gradient-to-br from-amber-500/25 to-emerald-900/40 border border-amber-500/30 px-4 py-3 text-center text-sm font-semibold text-amber-100"
            >
              เติมเครดิต
            </Link>
            <Link
              href="/wallet/withdraw"
              className="rounded-2xl border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-center text-sm font-semibold text-zinc-100"
            >
              ถอนเครดิต
            </Link>
          </div>
        )}

        {mode === "deposit" && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-5 mb-6">
            <p className="text-sm font-semibold text-amber-100/90">ช่องทางโอน</p>
            <ul className="mt-2 space-y-2 text-xs text-zinc-400">
              {PAYMENT_METHODS.map((m) => (
                <li key={m.id} className="rounded-xl border border-zinc-800/80 bg-black/30 px-3 py-2">
                  <span className="text-zinc-200">{m.bankName}</span>
                  <br />
                  {m.accountName} • {m.accountNumber}
                </li>
              ))}
            </ul>
            <div className="grid gap-3 mt-4">
              <select
                value={depositBankName}
                onChange={(e) => setDepositBankName(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-white"
              >
                <option value="">เลือกธนาคารที่โอน</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.id} value={m.bankName}>
                    {m.bankName}
                  </option>
                ))}
              </select>
              <input
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                inputMode="decimal"
                placeholder="จำนวนเงิน"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-white"
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setDepositFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-zinc-400"
              />
              <textarea
                value={depositNote}
                onChange={(e) => setDepositNote(e.target.value)}
                placeholder="หมายเหตุ (ถ้ามี)"
                className="w-full min-h-[80px] rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-white"
              />
              <button
                type="button"
                onClick={submitDeposit}
                disabled={isSubmitting || wLoading}
                className="rounded-xl bg-white px-5 py-3 text-black font-semibold disabled:opacity-50"
              >
                {isSubmitting ? "กำลังส่ง..." : "ส่งคำขอเติมเครดิต"}
              </button>
              <Link href="/wallet" className="text-center text-sm text-zinc-500 underline">
                กลับกระเป๋า
              </Link>
            </div>
          </div>
        )}

        {mode === "withdraw" && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-5 mb-6">
            <p className="text-xs text-zinc-500">
              เครดิตคงเหลือสูงสุดที่ถอนได้:{" "}
              <span className="text-emerald-300 font-semibold">{formatTHB(credit)}</span>
            </p>
            <div className="grid gap-3 mt-4">
              <input
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                inputMode="decimal"
                placeholder="จำนวนถอน"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-white"
              />
              <input
                value={withdrawBankName}
                onChange={(e) => setWithdrawBankName(e.target.value)}
                placeholder="ธนาคาร"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-white"
              />
              <input
                value={withdrawAccountName}
                onChange={(e) => setWithdrawAccountName(e.target.value)}
                placeholder="ชื่อบัญชี"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-white"
              />
              <input
                value={withdrawAccountNumber}
                onChange={(e) => setWithdrawAccountNumber(e.target.value)}
                placeholder="เลขบัญชี"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-white"
              />
              <textarea
                value={withdrawNote}
                onChange={(e) => setWithdrawNote(e.target.value)}
                placeholder="หมายเหตุ"
                className="w-full min-h-[72px] rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-white"
              />
              <button
                type="button"
                onClick={submitWithdraw}
                disabled={isSubmitting || wLoading}
                className="rounded-xl bg-white px-5 py-3 text-black font-semibold disabled:opacity-50"
              >
                {isSubmitting ? "กำลังส่ง..." : "ส่งคำขอถอน"}
              </button>
              <Link href="/wallet" className="text-center text-sm text-zinc-500 underline">
                กลับกระเป๋า
              </Link>
            </div>
          </div>
        )}

        {mode === "home" && (
          <div className="grid gap-2">
            <p className="font-semibold">ประวัติล่าสุด</p>
            {wLoading ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 px-4 py-3 text-sm text-zinc-400">
                กำลังโหลด...
              </div>
            ) : txs.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 px-4 py-3 text-sm text-zinc-400">
                ยังไม่มีรายการ
              </div>
            ) : (
              txs.map((t) => (
                <div
                  key={t.id}
                  className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{t.type}</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {formatDate(t.created_at)} • {t.status}
                      </p>
                      {t.note && <p className="text-xs text-zinc-400 mt-1">{t.note}</p>}
                      {t.admin_note && (
                        <p className="text-xs text-amber-200 mt-1">แอดมิน: {t.admin_note}</p>
                      )}
                    </div>
                    <p className="text-sm font-semibold shrink-0">{formatTHB(t.amount)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </main>
  );
}
