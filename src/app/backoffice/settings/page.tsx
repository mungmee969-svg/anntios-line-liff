"use client";

export default function BackofficeSettingsPage() {
  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">ตั้งค่า</h1>
        <p className="text-sm text-zinc-500">Phase 1: โครงหน้า (จะต่อ settings.update ในเฟสถัดไป)</p>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-2 text-sm">
        <p className="text-zinc-400">
          ENV ที่ต้องมี: <span className="font-mono">BACKOFFICE_OWNER_USERNAME</span>,{" "}
          <span className="font-mono">BACKOFFICE_OWNER_PASSWORD</span>,{" "}
          <span className="font-mono">BACKOFFICE_JWT_SECRET</span>
        </p>
        <p className="text-xs text-zinc-500">
          (ยังไม่แสดง/แก้ไขค่าจริงใน Phase 1)
        </p>
      </div>
    </div>
  );
}

