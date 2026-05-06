"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import liff from "@line/liff";
import { ensureLiffReady } from "@/src/lib/liffAuth";

type Profile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

  if (!profile && !error) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading LIFF...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-5 py-6">
      <section className="max-w-md mx-auto">
        <header className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight">โปรไฟล์สมาชิก</h1>
            <p className="text-sm text-zinc-500">ข้อมูลสมาชิกจาก LINE LIFF</p>
          </div>

          <Link
            href="/"
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200 transition-all duration-200 hover:bg-zinc-800/70 hover:-translate-y-0.5 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          >
            กลับหน้าแรก
          </Link>
        </header>

        <div className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_16px_40px_rgba(0,0,0,0.6)]">
          {error ? (
            <div className="rounded-2xl border border-rose-900/50 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                {profile?.pictureUrl ? (
                  <Image
                    src={profile.pictureUrl}
                    alt="profile"
                    width={72}
                    height={72}
                    className="w-18 h-18 rounded-full"
                  />
                ) : (
                  <div className="w-18 h-18 rounded-full bg-zinc-900 border border-zinc-800" />
                )}

                <div className="min-w-0">
                  <p className="text-lg font-semibold truncate">
                    {profile?.displayName}
                  </p>
                  <p className="text-xs text-zinc-500 break-all mt-1">
                    {profile?.userId}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 px-4 py-3">
                  <p className="text-xs text-zinc-500">สถานะสมาชิก</p>
                  <p className="mt-1 font-semibold">รออนุมัติ</p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 px-4 py-3">
                  <p className="text-xs text-zinc-500">เบอร์โทร</p>
                  <p className="mt-1 font-semibold">ยังไม่ได้ยืนยัน</p>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

