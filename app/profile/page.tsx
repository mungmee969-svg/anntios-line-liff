"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import liff from "@line/liff";
import { CreditBadge } from "@/components/CreditBadge";
import { useLiffAuth } from "@/src/components/LiffAuthProvider";
import { ensureLiffReady } from "@/src/lib/liffAuth";

type Profile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
};

const btn =
  "flex w-full items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-4 text-sm font-semibold text-zinc-100 transition-colors hover:bg-zinc-800/60";

export default function ProfilePage() {
  const { isSessionReady } = useLiffAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSessionReady) return;

    async function initLIFF() {
      try {
        await ensureLiffReady();

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const userProfile = await liff.getProfile();
        setProfile(userProfile);
      } catch {
        setError("ไม่สามารถโหลดโปรไฟล์ได้ กรุณาลองใหม่");
      }
    }

    initLIFF();
  }, [isSessionReady]);

  if (!profile && !error) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-sm text-zinc-400">กำลังโหลด…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-4 py-6 pb-24 sm:px-5">
      <section className="max-w-md mx-auto w-full min-w-0">
        <header className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight">โปรไฟล์</h1>
            <p className="text-sm text-zinc-500">ข้อมูลจาก LINE</p>
          </div>

          <Link
            href="/"
            className="shrink-0 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200"
          >
            หลัก
          </Link>
        </header>

        <div className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black p-5 mb-5">
          {error ? (
            <div className="rounded-xl border border-rose-900/50 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 min-w-0">
                {profile?.pictureUrl ? (
                  <Image
                    src={profile.pictureUrl}
                    alt="profile"
                    width={72}
                    height={72}
                    className="w-[72px] h-[72px] rounded-full shrink-0"
                  />
                ) : (
                  <div className="w-[72px] h-[72px] rounded-full bg-zinc-900 border border-zinc-800 shrink-0" />
                )}

                <div className="min-w-0">
                  <p className="text-lg font-semibold truncate">{profile?.displayName}</p>
                  <p className="text-xs text-zinc-500 break-all mt-1">{profile?.userId}</p>
                </div>
              </div>

              <div className="mt-5">
                <CreditBadge className="w-full" />
              </div>
            </>
          )}
        </div>

        <div className="grid gap-2">
          <Link href="/wallet/deposit" className={btn}>
            <span>เติมเครดิต</span>
            <span className="text-zinc-500">›</span>
          </Link>
          <Link href="/wallet/withdraw" className={btn}>
            <span>ถอนเครดิต</span>
            <span className="text-zinc-500">›</span>
          </Link>
          <Link href="/history" className={btn}>
            <span>ประวัติรายการ (บิล)</span>
            <span className="text-zinc-500">›</span>
          </Link>
          <a
            href="https://line.me/R/ti/p/@YOUR_LINE_ID"
            className={btn}
            target="_blank"
            rel="noreferrer"
          >
            <span>ติดต่อแอดมิน</span>
            <span className="text-zinc-500">›</span>
          </a>
          <Link href="/wallet" className={btn}>
            <span>กระเป๋าเงิน</span>
            <span className="text-zinc-500">›</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
