"use client";

import Link from "next/link";

type RecordStatus = "รอดำเนินการ" | "สำเร็จ" | "ยกเลิก";

type HistoryItem = {
  id: string;
  number: string;
  type: "2 ตัว" | "3 ตัว" | "วิ่ง";
  amount: number;
  status: RecordStatus;
  createdAt: string; // ISO
};

const mock: HistoryItem[] = [
  {
    id: "h1",
    number: "12",
    type: "2 ตัว",
    amount: 200,
    status: "รอดำเนินการ",
    createdAt: "2026-05-06T10:21:00.000Z",
  },
  {
    id: "h2",
    number: "123",
    type: "3 ตัว",
    amount: 100,
    status: "สำเร็จ",
    createdAt: "2026-05-06T08:04:00.000Z",
  },
  {
    id: "h3",
    number: "8",
    type: "วิ่ง",
    amount: 50,
    status: "ยกเลิก",
    createdAt: "2026-05-05T15:44:00.000Z",
  },
  {
    id: "h4",
    number: "45",
    type: "2 ตัว",
    amount: 500,
    status: "สำเร็จ",
    createdAt: "2026-05-05T12:18:00.000Z",
  },
  {
    id: "h5",
    number: "999",
    type: "3 ตัว",
    amount: 120,
    status: "รอดำเนินการ",
    createdAt: "2026-05-04T19:09:00.000Z",
  },
];

function formatTHB(amount: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function statusStyle(status: RecordStatus) {
  switch (status) {
    case "รอดำเนินการ":
      return "border-amber-900/50 bg-amber-950/25 text-amber-200";
    case "สำเร็จ":
      return "border-emerald-900/50 bg-emerald-950/25 text-emerald-200";
    case "ยกเลิก":
      return "border-rose-900/50 bg-rose-950/25 text-rose-200";
  }
}

export default function HistoryPage() {
  return (
    <main className="min-h-screen bg-black text-white px-5 py-6">
      <section className="max-w-md mx-auto">
        <header className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight">ประวัติรายการ</h1>
            <p className="text-sm text-zinc-500">ตัวอย่างรายการย้อนหลัง 5 รายการ</p>
          </div>

          <Link
            href="/"
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200 transition-all duration-200 hover:bg-zinc-800/70 hover:-translate-y-0.5 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          >
            กลับหน้าแรก
          </Link>
        </header>

        <div className="grid gap-3">
          {mock.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_14px_36px_rgba(0,0,0,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-950/70"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold tracking-tight">
                      เลข {item.number}
                    </p>
                    <span className="rounded-full border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-xs text-zinc-200">
                      {item.type}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    {formatDate(item.createdAt)}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-xs ${statusStyle(
                    item.status,
                  )}`}
                >
                  {item.status}
                </span>
              </div>

              <div className="mt-4 flex items-end justify-between">
                <p className="text-sm text-zinc-500">จำนวนเงิน</p>
                <p className="text-base font-semibold">{formatTHB(item.amount)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

