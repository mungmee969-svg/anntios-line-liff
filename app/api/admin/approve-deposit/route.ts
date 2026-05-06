import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/app/api/_lib/supabaseAdmin";
import { requireAdmin } from "@/app/api/_lib/adminGuard";
import { pushLineTextSafe } from "@/app/api/_lib/lineMessaging";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = (await req.json()) as { txId: string; adminNote?: string };
    if (!body?.txId?.trim()) return NextResponse.json({ error: "txId required" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("approve_deposit", {
      p_tx_id: body.txId,
      p_actor: admin.userId,
      p_admin_note: body.adminNote?.trim() ? body.adminNote.trim() : null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const row = data as unknown as { user_id?: string | null } | null;
    const to = row?.user_id ?? null;
    if (to)
      await pushLineTextSafe({ to, text: "เติมเครดิตสำเร็จ ยอดเข้ากระเป๋าแล้ว" });
    return NextResponse.json({ transaction: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

