"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ToastState =
  | { open: false }
  | { open: true; tone: "success" | "error"; message: string };

export default function BackofficeLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState>({ open: false });

  async function submit() {
    setBusy(true);
    setToast({ open: false });
    try {
      const res = await fetch("/api/backoffice/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password, remember }),
      });
      const j = (await res.json().catch(() => ({}))) as { token?: string; error?: string };
      if (!res.ok) throw new Error(j.error || "Login ไม่สำเร็จ");
      if (!j.token) throw new Error("Token ไม่ถูกต้อง");
      localStorage.setItem("backoffice_token", j.token);
      setToast({ open: true, tone: "success", message: "เข้าสู่ระบบสำเร็จ" });
      router.replace("/backoffice/dashboard");
    } catch (e) {
      setToast({
        open: true,
        tone: "error",
        message: e instanceof Error ? e.message : "Login ไม่สำเร็จ",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100 flex items-center justify-center px-4 py-10 overflow-x-hidden">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-2xl shadow-[0_20px_80px_rgba(0,0,0,0.55)] p-6 sm:p-7">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.28em] text-emerald-400/90 font-semibold">
              AnntiOS
            </p>
            <h1 className="text-2xl font-bold mt-2 bg-gradient-to-r from-amber-200 to-emerald-300 bg-clip-text text-transparent">
              Backoffice
            </h1>
            <p className="text-xs text-zinc-500 mt-2">Login ด้วย username/password (ไม่ใช้ LIFF)</p>
          </div>

          {toast.open ? (
            <div
              className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
                toast.tone === "success"
                  ? "border-emerald-500/25 bg-emerald-950/25 text-emerald-100"
                  : "border-rose-500/25 bg-rose-950/25 text-rose-100"
              }`}
            >
              {toast.message}
            </div>
          ) : null}

          <div className="mt-6 space-y-3">
            <label className="block text-sm">
              <span className="text-zinc-500">Username</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="mt-1 w-full rounded-2xl bg-black/50 border border-white/10 px-4 py-3 outline-none focus:border-amber-500/30"
                placeholder="owner / staff01"
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-500">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="mt-1 w-full rounded-2xl bg-black/50 border border-white/10 px-4 py-3 outline-none focus:border-amber-500/30"
                placeholder="••••••••"
              />
            </label>

            <div className="flex items-center justify-between gap-3 pt-1">
              <label className="flex items-center gap-2 text-sm text-zinc-400 select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="size-4 rounded border-white/20 bg-black/40"
                />
                Remember me
              </label>
              <span className="text-xs text-zinc-600">Session 7 วัน</span>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              className="mt-2 w-full rounded-2xl bg-amber-500 py-3 text-sm font-bold text-black disabled:opacity-50"
            >
              {busy ? "กำลังเข้าสู่ระบบ…" : "Login"}
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-zinc-500">
            ต้องตั้งค่า ENV: <span className="font-mono">BACKOFFICE_OWNER_USERNAME</span>,{" "}
            <span className="font-mono">BACKOFFICE_OWNER_PASSWORD</span>,{" "}
            <span className="font-mono">BACKOFFICE_JWT_SECRET</span>
          </div>
        </div>
      </div>
    </div>
  );
}

