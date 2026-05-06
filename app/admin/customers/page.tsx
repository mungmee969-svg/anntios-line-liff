"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAdminGuard } from "@/src/components/AdminGuard";
import { useLiffAuth } from "@/src/components/LiffAuthProvider";

type Customer = {
  user_id: string;
  display_name: string | null;
  credit_balance: number;
  locked_balance: number;
  updated_at: string;
};

function formatTHB(amount: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function AdminCustomersPage() {
  const { authFetch } = useLiffAuth();
  const authedAdminFetch = useCallback(
    (input: RequestInfo, init: RequestInit = {}) => authFetch(input, init),
    [authFetch],
  );
  const { isReady, isAdmin, error } = useAdminGuard();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await authedAdminFetch("/api/admin/customers");
      const json = (await res.json().catch(() => ({}))) as unknown as {
        customers?: Customer[];
        error?: string;
      };
      if (!res.ok) throw new Error(json?.error || "โหลดไม่สำเร็จ");
      setCustomers(json.customers ?? []);
    } catch (e) {
      alert(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, [authedAdminFetch]);

  async function adjustCredit(userId: string, displayName: string | null) {
    const raw = prompt("ใส่จำนวนเงิน (+เพิ่ม / -ลด)", "0") ?? "0";
    const amt = Number(raw);
    if (!Number.isFinite(amt) || amt === 0) return;
    const note = prompt("หมายเหตุ (optional)") ?? "";
    const ok = confirm("ยืนยันปรับเครดิต?");
    if (!ok) return;
    const res = await authedAdminFetch("/api/admin/adjust-credit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, displayName, amount: amt, note }),
    });
    const json = (await res.json().catch(() => ({}))) as unknown as { error?: string };
    if (!res.ok) {
      alert(json?.error || "ทำรายการไม่สำเร็จ");
      return;
    }
    await load();
  }

  useEffect(() => {
    if (!isReady || !isAdmin) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [isReady, isAdmin, load]);

  if (!isReady) return <main className="min-h-screen bg-black text-white px-5 py-6">Loading...</main>;
  if (error) return <main className="min-h-screen bg-black text-white px-5 py-6">{error}</main>;
  if (!isAdmin) return <main className="min-h-screen bg-black text-white px-5 py-6">Forbidden</main>;

  return (
    <main className="min-h-screen bg-black text-white px-5 py-6">
      <section className="max-w-2xl mx-auto">
        <header className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Admin • ลูกค้า</h1>
            <p className="text-sm text-zinc-500">ดูเครดิตลูกค้าและปรับเครดิต</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/dashboard"
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm"
            >
              แดชบอร์ด
            </Link>
            <button
              type="button"
              onClick={load}
              disabled={isLoading}
              className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-black disabled:opacity-60"
            >
              {isLoading ? "..." : "รีเฟรช"}
            </button>
          </div>
        </header>

        {customers.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 px-4 py-3 text-sm text-zinc-300">
            ไม่มีข้อมูล
          </div>
        ) : (
          <div className="grid gap-3">
            {customers.map((c) => (
              <article
                key={c.user_id}
                className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{c.display_name ?? "-"}</p>
                    <p className="text-xs text-zinc-500 mt-1 break-all">{c.user_id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatTHB(c.credit_balance)}</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      locked: {formatTHB(c.locked_balance)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => adjustCredit(c.user_id, c.display_name)}
                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"
                  >
                    ปรับเครดิต
                  </button>
                  <Link
                    href={`/admin/bills?userId=${encodeURIComponent(c.user_id)}`}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm font-semibold text-center"
                  >
                    ดูบิล
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

