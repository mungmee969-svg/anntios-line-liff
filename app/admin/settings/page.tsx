"use client";

import Link from "next/link";
import { useAdminGuard } from "@/src/components/AdminGuard";

export default function AdminSettingsPage() {
  const { isReady, isAdmin, error, userId } = useAdminGuard();

  if (!isReady) return <main className="px-4 py-6 text-zinc-400">กำลังโหลด...</main>;
  if (error) return <main className="px-4 py-6 text-rose-200">{error}</main>;
  if (!isAdmin) return <main className="px-4 py-6">ไม่มีสิทธิ์</main>;

  return (
    <main className="px-4 py-6 max-w-xl mx-auto text-sm leading-relaxed text-zinc-300">
      <header className="flex items-center justify-between gap-3 mb-8">
        <h1 className="text-xl font-bold text-white">ตั้งค่า</h1>
        <Link href="/admin/dashboard" className="text-emerald-400 hover:underline">
          แดชบอร์ด
        </Link>
      </header>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5 space-y-4">
        <div>
          <p className="font-semibold text-white">ผู้ใช้แอดมิน</p>
          <p className="text-xs text-zinc-500 mt-1 break-all">LINE user id ที่เข้ามาเมื่อกี้: {userId ?? "-"}</p>
        </div>
        <div>
          <p className="font-semibold text-white">NEXT_PUBLIC_ADMIN_USER_IDS</p>
          <p className="text-xs text-zinc-500 mt-2">
            ใส่รายการ LINE user id ที่เป็นผู้ดูแล คั่นด้วยจุลภาค โค้ดจะเช็กผ่าน AdminGuard ก่อนเรียก API ฝั่งลูกค้า
          </p>
        </div>
        <div>
          <p className="font-semibold text-white">แยกโดเมนในอนาคต</p>
          <p className="text-xs text-zinc-500 mt-2">
            ตอนนี้ใช้ path `/admin` ในโปรเจกต์เดียวกับ LIFF ได้เลย โค้ด layout แอดมินแยกเป็น `app/admin/layout.tsx` ไว้แล้ว
            จะย้ายไป `admin.domain.com` แค่ชี้ deployment / reverse proxy มาที่ route เดิม
          </p>
        </div>
        <div>
          <p className="font-semibold text-white">LINE_CHANNEL_ACCESS_TOKEN</p>
          <p className="text-xs text-zinc-500 mt-2">ใช้สำหรับ push แจ้งลูกค้าเมื่อแอดมินดำเนินการ (ไม่ rollback DB ถ้า push ล้มเหลว)</p>
        </div>
      </section>
    </main>
  );
}
