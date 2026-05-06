"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAdminGuard } from "@/src/components/AdminGuard";
import { useLiffAuth } from "@/src/components/LiffAuthProvider";

function formatTHB(amount: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function AdminBillDetailPage() {
  const params = useParams();
  const billIdRaw = params?.billId;
  const billId = typeof billIdRaw === "string" ? billIdRaw : Array.isArray(billIdRaw) ? billIdRaw[0] : "";

  const { authFetch } = useLiffAuth();
  const fetchAdmin = useCallback(
    (input: RequestInfo, init?: RequestInit) => authFetch(input, init ?? {}),
    [authFetch],
  );
  const { isReady, isAdmin, error } = useAdminGuard();
  const [bill, setBill] = useState<Record<string, unknown> | null>(null);
  const [records, setRecords] = useState<Array<Record<string, unknown>>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!billId.trim()) return;
    setIsLoading(true);
    setLoadErr(null);
    try {
      const res = await fetchAdmin(`/api/admin/bills/${encodeURIComponent(billId.trim())}`);
      const json = (await res.json().catch(() => ({}))) as {
        bill?: Record<string, unknown>;
        records?: Array<Record<string, unknown>>;
        error?: string;
      };
      if (!res.ok) throw new Error(json?.error || "โหลดไม่สำเร็จ");
      setBill(json.bill ?? null);
      setRecords(json.records ?? []);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, [fetchAdmin, billId]);

  useEffect(() => {
    if (!isReady || !isAdmin || !billId.trim()) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- โหลดรายละเอียดบิลหลังยืนยันแอดมิน
    void load();
  }, [isReady, isAdmin, billId, load]);

  async function cancelBill() {
    const reason = prompt("เหตุผลยกเลิก (optional)") ?? "";
    if (!confirm("ยืนยันยกเลิกบิลและคืนเครดิต?")) return;
    const res = await fetchAdmin("/api/admin/cancel-bill", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ billId, reason }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      alert(json?.error || "ยกเลิกไม่สำเร็จ");
      return;
    }
    await load();
  }

  async function resendBill() {
    if (!confirm("ส่งสรุปบิลเข้า LINE ลูกค้าอีกครั้ง?")) return;
    const res = await fetchAdmin("/api/admin/resend-bill", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ billId }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      alert(json?.error || "ส่งไม่สำเร็จ");
      return;
    }
    alert("ส่งเข้า LINE แล้ว (ถ้า token ถูกต้อง)");
  }

  if (!isReady) return <main className="px-4 py-6 text-zinc-400">กำลังโหลด...</main>;
  if (error) return <main className="px-4 py-6 text-rose-200">{error}</main>;
  if (!isAdmin) return <main className="px-4 py-6">ไม่มีสิทธิ์</main>;

  const status = String(bill?.status ?? "");

  return (
    <main className="px-4 py-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold">บิล {String(bill?.bill_no ?? billId)}</h1>
          <p className="text-xs text-zinc-500 mt-1 break-all">{billId}</p>
        </div>
        <Link href="/admin/bills" className="text-sm text-emerald-400 hover:underline">
          กลับ
        </Link>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-zinc-800 px-4 py-3 text-sm text-zinc-400">โหลด...</div>
      ) : loadErr ? (
        <div className="rounded-2xl border border-rose-900/50 px-4 py-3 text-sm text-rose-200">{loadErr}</div>
      ) : !bill ? (
        <div className="text-zinc-400">ไม่พบข้อมูล</div>
      ) : (
        <div className="grid gap-4">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 text-sm space-y-2">
            <p className="text-zinc-500">สถานะ</p>
            <p className="font-semibold capitalize">{status}</p>
            <p className="text-zinc-500 pt-2">ลูกค้า</p>
            <p className="break-all">{String(bill.display_name ?? bill.user_id)}</p>
            <p className="text-xs text-zinc-500 break-all">{String(bill.user_id)}</p>
            <p className="text-zinc-500 pt-2">หวย / ประเภท</p>
            <p>
              {String(bill.lottery_name ?? "-")} • {String(bill.bet_type ?? "-")}
            </p>
            <p className="text-zinc-500 pt-2">ยอดรวม</p>
            <p className="text-lg font-semibold tabular-nums">{formatTHB(Number(bill.total_amount ?? 0))}</p>
          </section>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={resendBill} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black">
              ส่งบิล LINE ให้ลูกค้า
            </button>
            {status !== "cancelled" && status !== "settled" ? (
              <button
                type="button"
                onClick={cancelBill}
                className="rounded-xl border border-rose-800/60 bg-rose-950/30 px-4 py-2 text-sm font-semibold text-rose-100"
              >
                ยกเลิกและคืนเครดิต
              </button>
            ) : null}
          </div>

          <section>
            <h2 className="text-sm font-semibold text-zinc-400 mb-2">เลขในรายการ</h2>
            <div className="grid gap-2">
              {records.map((r) => (
                <div
                  key={String(r.id)}
                  className="rounded-xl border border-zinc-800 bg-black/40 px-3 py-2 flex justify-between text-sm"
                >
                  <span>เลข {String(r.number)}</span>
                  <span className="text-zinc-400">{String(r.type)}</span>
                  <span className="tabular-nums font-medium">{formatTHB(Number(r.amount ?? 0))}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
