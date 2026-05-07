import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/app/api/_lib/supabaseAdmin";
import { requireStaff } from "@/app/api/_lib/staffGuard";
import { insertAuditLog } from "@/app/api/_lib/auditLog";
import { pushLineTextSafe } from "@/app/api/_lib/lineMessaging";

export async function POST(req: NextRequest) {
  try {
    const staff = await requireStaff(req, "can_approve_deposit");
    const body = (await req.json()) as { txId: string; adminNote?: string };
    if (!body?.txId?.trim()) return NextResponse.json({ error: "txId required" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("approve_deposit", {
      p_tx_id: body.txId,
      p_actor: staff.userId,
      p_admin_note: body.adminNote?.trim() ? body.adminNote.trim() : null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const row = data as unknown as { user_id?: string | null } | null;
    if (row?.user_id)
      await pushLineTextSafe({ to: row.user_id, text: "เติมเครดิตสำเร็จ ยอดเข้ากระเป๋าแล้ว" });

    await insertAuditLog(supabase, {
      actorUserId: staff.userId,
      actorName: staff.displayName,
      action: "approve_deposit",
      targetType: "wallet_transaction",
      targetId: body.txId,
    });

    return NextResponse.json({ transaction: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
