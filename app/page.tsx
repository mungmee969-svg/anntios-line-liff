"use client";

import { useEffect, useState } from "react";
import liff from "@line/liff";

type Profile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
};

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    async function initLIFF() {
      await liff.init({ liffId: "2009989826-L6OPDoa5" });

      if (!liff.isLoggedIn()) {
        liff.login();
        return;
      }

      const userProfile = await liff.getProfile();
      setProfile(userProfile);
    }

    initLIFF();
  }, []);

  if (!profile) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading LIFF...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-5 py-6">
      <section className="max-w-md mx-auto">
        <div className="flex items-center gap-4 mb-8">
          {profile.pictureUrl && (
            <img
              src={profile.pictureUrl}
              alt="profile"
              className="w-14 h-14 rounded-full"
            />
          )}

          <div>
            <h1 className="text-xl font-bold">สวัสดี {profile.displayName}</h1>
            <p className="text-xs text-zinc-500 break-all">
              {profile.userId}
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <button className="rounded-2xl bg-white text-black p-5 text-left font-semibold">
            📝 บันทึกรายการ
            <p className="text-sm text-zinc-500 mt-1 font-normal">
              บันทึกเลข/รายการของลูกค้า
            </p>
          </button>

          <button className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 text-left font-semibold">
            📜 ประวัติรายการ
            <p className="text-sm text-zinc-500 mt-1 font-normal">
              ดูรายการย้อนหลังทั้งหมด
            </p>
          </button>

          <button className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 text-left font-semibold">
            📊 สรุปผล
            <p className="text-sm text-zinc-500 mt-1 font-normal">
              ตรวจสอบผลและสถานะรายการ
            </p>
          </button>

          <button className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 text-left font-semibold">
            👤 โปรไฟล์สมาชิก
            <p className="text-sm text-zinc-500 mt-1 font-normal">
              ข้อมูลสมาชิกและสถานะการอนุมัติ
            </p>
          </button>
        </div>
      </section>
    </main>
  );
}