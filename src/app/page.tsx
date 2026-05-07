"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import liff from "@line/liff";
import { useLiffAuth } from "@/src/components/LiffAuthProvider";
import { ensureLiffReady, loginKeepingPath } from "@/src/lib/liffAuth";

type Profile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
};

const cardBase =
  "rounded-2xl p-5 text-left font-semibold transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30";

export default function Home() {
  const { isSessionReady } = useLiffAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!isSessionReady) return;

    async function initLIFF() {
      await ensureLiffReady();

      if (!liff.isLoggedIn()) {
        loginKeepingPath();
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

  return (
    <main className="min-h-screen bg-black text-white px-5 py-6">
      <section className="max-w-md mx-auto">
        <div className="flex items-center gap-4 mb-8">
          {profile.pictureUrl && (
            <Image
              src={profile.pictureUrl}
              alt="profile"
              width={56}
              height={56}
              className="w-14 h-14 rounded-full"
            />
          )}

          <div>
            <h1 className="text-xl font-bold">สวัสดี {profile.displayName}</h1>
            <p className="text-xs text-zinc-500 break-all">{profile.userId}</p>
          </div>
        </div>

        <div className="grid gap-4">
          <Link
            href="/record"
            className={`${cardBase} bg-white text-black hover:bg-zinc-100`}
          >
            📝 บันทึกรายการ
            <p className="text-sm text-zinc-500 mt-1 font-normal">
              บันทึกเลข/รายการของลูกค้า
            </p>
          </Link>

          <Link
            href="/history"
            className={`${cardBase} bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/70`}
          >
            📜 ประวัติรายการ
            <p className="text-sm text-zinc-500 mt-1 font-normal">
              ดูรายการย้อนหลังทั้งหมด
            </p>
          </Link>

          <button
            type="button"
            className={`${cardBase} bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/70`}
          >
            📊 สรุปผล
            <p className="text-sm text-zinc-500 mt-1 font-normal">
              ตรวจสอบผลและสถานะรายการ
            </p>
          </button>

          <Link
            href="/profile"
            className={`${cardBase} bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/70`}
          >
            👤 โปรไฟล์สมาชิก
            <p className="text-sm text-zinc-500 mt-1 font-normal">
              ข้อมูลสมาชิกและสถานะการอนุมัติ
            </p>
          </Link>
        </div>

        <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Staff OS</p>
          <p className="text-sm text-zinc-300 mt-1">
            ลิงก์สำหรับพนักงาน (ส่งแยกให้ Staff)
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/staff"
              className="rounded-xl border border-emerald-500/25 bg-emerald-950/40 px-4 py-2 text-sm font-semibold text-emerald-100"
            >
              เข้า Staff OS
            </Link>
            <Link
              href="/staff/dashboard"
              className="rounded-xl border border-amber-500/25 bg-amber-950/25 px-4 py-2 text-sm font-semibold text-amber-100"
            >
              Staff Dashboard
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

