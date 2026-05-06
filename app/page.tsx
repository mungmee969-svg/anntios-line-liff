"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import liff from "@line/liff";
import { CreditBadge } from "@/components/CreditBadge";
import { useLiffAuth } from "@/src/components/LiffAuthProvider";
import { useWalletData } from "@/src/components/WalletDataProvider";
import { ensureLiffReady } from "@/src/lib/liffAuth";

type Profile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
};

const cardBase =
  "block rounded-2xl p-5 text-left font-semibold transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30";

export default function Home() {
  const { isSessionReady } = useLiffAuth();
  const { wallet } = useWalletData();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!isSessionReady) return;

    async function initLIFF() {
      await ensureLiffReady();

      if (!liff.isLoggedIn()) {
        liff.login();
        return;
      }

      const userProfile = await liff.getProfile();
      setProfile(userProfile);
    }

    initLIFF();
  }, [isSessionReady]);

  if (!profile) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-sm text-zinc-400">กำลังโหลดโปรไฟล์…</p>
      </main>
    );
  }

  const creditZero = (wallet?.credit_balance ?? 0) <= 0;

  return (
    <main className="min-h-screen bg-black text-white px-4 py-6 sm:px-5">
      <section className="max-w-md mx-auto w-full min-w-0">
        <div className="flex items-center gap-4 mb-5 min-w-0">
          {profile.pictureUrl && (
            <Image
              src={profile.pictureUrl}
              alt="profile"
              width={56}
              height={56}
              className="w-14 h-14 rounded-full shrink-0"
            />
          )}

          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">สวัสดี {profile.displayName}</h1>
            <p className="text-xs text-zinc-500 break-all">{profile.userId}</p>
          </div>
        </div>

        <div className="mb-5 min-w-0">
          <CreditBadge className="w-full max-w-full" />
        </div>

        {creditZero && (
          <div className="mb-5 rounded-2xl border border-amber-500/35 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
            เครดิตคงเหลือ 0 กรุณาเติมเครดิตก่อนส่งบิล
          </div>
        )}

        <div className="grid gap-3">
          <Link href="/record" className={`${cardBase} bg-white text-black hover:bg-zinc-100`}>
            ซื้อหวย
            <p className="text-sm text-zinc-500 mt-1 font-normal">บันทึกเลขและส่งบิล</p>
          </Link>

          <Link
            href="/wallet/deposit"
            className={`${cardBase} bg-gradient-to-br from-emerald-900/50 to-black border border-amber-500/25 text-amber-50`}
          >
            เติมเครดิต
            <p className="text-sm text-amber-200/70 mt-1 font-normal">โอนเงิน + แนบสลิป</p>
          </Link>

          <Link href="/wallet/withdraw" className={`${cardBase} bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/70`}>
            ถอนเครดิต
            <p className="text-sm text-zinc-500 mt-1 font-normal">ถอนเข้าบัญชีธนาคาร</p>
          </Link>

          <Link href="/wallet" className={`${cardBase} bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/70`}>
            กระเป๋าเงิน
            <p className="text-sm text-zinc-500 mt-1 font-normal">เครดิตและประวัติธุรกรรม</p>
          </Link>

          <Link href="/history" className={`${cardBase} bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/70`}>
            ประวัติบิล
            <p className="text-sm text-zinc-500 mt-1 font-normal">ดูบิลและรายการแทง</p>
          </Link>

          <Link href="/results" className={`${cardBase} bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/70`}>
            สรุปผล
            <p className="text-sm text-zinc-500 mt-1 font-normal">บิลที่ออกผลแล้ว</p>
          </Link>

          <Link href="/profile" className={`${cardBase} bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/70`}>
            โปรไฟล์
            <p className="text-sm text-zinc-500 mt-1 font-normal">โปรไฟล์ LINE และทางลัด</p>
          </Link>
        </div>
      </section>
    </main>
  );
}
