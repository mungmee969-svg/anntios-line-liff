"use client";

export default function BackofficeBillsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">บิลลูกค้า</h1>
        <p className="text-sm text-zinc-500">Phase 1: โครงหน้า (filter/table จะทำในเฟสถัดไป)</p>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 text-center">
        <p className="text-sm font-semibold text-zinc-200">ยังไม่มีข้อมูล</p>
        <p className="text-xs text-zinc-500 mt-2">ต้องต่อ API `/api/backoffice/bills/*`</p>
      </div>
    </div>
  );
}

