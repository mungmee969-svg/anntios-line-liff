"use client";

import Link from "next/link";
import { useAdminGuard } from "@/src/components/AdminGuard";

export default function AdminHomePage() {
  const { userId, isReady, isAdmin, error } = useAdminGuard();

  if (!isReady) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading...
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-5">
        {error}
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-5 text-center">
        <div>
          <p className="font-semibold">ไม่มีสิทธิ์เข้าหน้าแอดมิน</p>
          <p className="text-xs text-zinc-500 mt-2 break-all">userId: {userId ?? "-"}</p>
          <Link
            href="/"
            className="inline-block mt-4 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm"
          >
            กลับหน้าแรก
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-5 py-6">
      <section className="max-w-md mx-auto">
        <header className="mb-6">
          <h1 className="text-xl font-bold tracking-tight">Admin</h1>
          <p className="text-xs text-zinc-500 break-all">userId: {userId}</p>
        </header>

        <div className="grid gap-3">
          <Link
            href="/admin/wallet"
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-4 font-semibold hover:bg-zinc-800/60"
          >
            เติม/ถอนเครดิต (อนุมัติรายการ)
          </Link>
          <Link
            href="/admin/bills"
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-4 font-semibold hover:bg-zinc-800/60"
          >
            บิลทั้งหมด
          </Link>
          <Link
            href="/admin/customers"
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-4 font-semibold hover:bg-zinc-800/60"
          >
            ลูกค้า
          </Link>
          <Link
            href="/"
            className="rounded-2xl border border-zinc-800 bg-zinc-950/30 px-5 py-4 font-semibold hover:bg-zinc-900/60"
          >
            กลับหน้าแรก
          </Link>
        </div>
      </section>
    </main>
  );
}

