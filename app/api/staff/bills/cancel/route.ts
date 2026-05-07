import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/app/api/_lib/supabaseAdmin";
import { requireStaff } from "@/app/api/_lib/staffGuard";
import { insertAuditLog } from "@/app/api/_lib/auditLog";

export async function POST(req: NextRequest) {
  try {
    const staff = await requireStaff(req, "can_cancel_bill");
    const body = (await req.json()) as { billId: string; reason?: string };
    if (!body?.billId?.trim())
      return NextResponse.json({ error: "billId required" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("cancel_bill_and_refund", {
      p_bill_id: body.billId,
      p_reason: body.reason?.trim() ? body.reason.trim() : null,
      p_actor: staff.userId,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await insertAuditLog(supabase, {
      actorUserId: staff.userId,
      actorName: staff.displayName,
      action: "cancel_bill",
      targetType: "bill",
      targetId: body.billId,
      metadata: { reason: body.reason ?? null },
    });

    return NextResponse.json({ bill: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
