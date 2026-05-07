import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/app/api/_lib/supabaseAdmin";
import { requireStaff } from "@/app/api/_lib/staffGuard";
import { insertAuditLog } from "@/app/api/_lib/auditLog";
import { pushLineTextSafe } from "@/app/api/_lib/lineMessaging";

export async function POST(req: NextRequest) {
  try {
    const staff = await requireStaff(req, "can_approve_withdraw");
    const body = (await req.json()) as { txId: string; adminNote?: string };
    if (!body?.txId?.trim()) return NextResponse.json({ error: "txId required" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("approve_withdraw", {
      p_tx_id: body.txId,
      p_actor: staff.userId,
      p_admin_note: body.adminNote?.trim() ? body.adminNote.trim() : null,
    });
    if (error) {
      if ((error.message || "").includes("INSUFFICIENT_CREDIT")) {
        return NextResponse.json({ error: "เครดิตไม่พอสำหรับถอน" }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const tx = data as unknown as { user_id?: string | null };
    if (tx?.user_id)
      await pushLineTextSafe({
        to: tx.user_id,
        text: "ถอนเครดิตอนุมัติแล้ว กรุณาตรวจสอบยอดเข้าบัญชี",
      });

    await insertAuditLog(supabase, {
      actorUserId: staff.userId,
      actorName: staff.displayName,
      action: "approve_withdraw",
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
