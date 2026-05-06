"use client";

import { useWalletData } from "@/src/components/WalletDataProvider";

function formatTHB(n: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

type Props = {
  compact?: boolean;
  className?: string;
  /** ข้อความรอง เช่น บริบทของหน้า */
  subtitle?: string;
};

/**
 * เครดิตคงเหลือ — ใช้ร่วมกับ WalletDataProvider
 */
export function CreditBadge({ compact, className = "", subtitle }: Props) {
  const { wallet, isLoading, error } = useWalletData();
  const credit = wallet?.credit_balance ?? 0;

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-full border border-amber-500/35 bg-gradient-to-r from-emerald-950/90 to-black px-3 py-1 text-xs font-semibold text-amber-200 shadow-[inset_0_1px_0_rgba(255,215,128,0.12)] ${className}`}
      >
        <span className="text-emerald-300/80">เครดิต</span>
        <span className="text-amber-100 tabular-nums">
          {isLoading ? "…" : error ? "—" : formatTHB(credit)}
        </span>
      </div>
    );
  }

  return (
    <section
      className={`rounded-2xl border border-amber-500/35 bg-gradient-to-br from-emerald-900/55 via-black to-zinc-950 px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,215,128,0.14)] ${className}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-amber-200/70">
          เครดิตคงเหลือ
        </p>
        {subtitle ? (
          <p className="text-[10px] font-normal capitalize text-emerald-200/55">{subtitle}</p>
        ) : null}
      </div>
      <p className="mt-1 text-xl font-bold tabular-nums text-amber-100 sm:text-2xl">
        {isLoading ? "กำลังโหลด…" : error ? "ไม่พร้อมแสดง" : `${formatTHB(credit)}`}
      </p>
      {wallet && wallet.locked_balance > 0 && (
        <p className="mt-1 text-xs text-emerald-200/65">
          ล็อก: {formatTHB(wallet.locked_balance)}
        </p>
      )}
    </section>
  );
}
