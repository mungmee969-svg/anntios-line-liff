import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/app/api/_lib/supabaseAdmin";
import { requireAdmin } from "@/app/api/_lib/adminGuard";
import { pushLineTextSafe } from "@/app/api/_lib/lineMessaging";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = (await req.json()) as {
      userId: string;
      displayName?: string;
      amount: number;
      note?: string;
    };
    if (!body?.userId?.trim())
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    const amt = Number(body.amount);
    if (!Number.isFinite(amt) || amt === 0)
      return NextResponse.json({ error: "amount invalid" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("admin_adjust_credit", {
      p_user_id: body.userId,
      p_display_name: body.displayName ?? null,
      p_amount: amt,
      p_actor: admin.userId,
      p_note: body.note?.trim() ? body.note.trim() : null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    const fmt = (n: number) =>
      new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(n);
    await pushLineTextSafe({
      to: body.userId,
      text: `แอดมินปรับเครดิต ${amt >= 0 ? "+" : ""}${fmt(amt)} บ.\nเครดิตล่าสุดดูได้ที่แอป`,
    });
    return NextResponse.json({ transaction: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

