import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/app/api/_lib/supabaseAdmin";
import { requireAdmin } from "@/app/api/_lib/adminGuard";
import { pushLineTextSafe } from "@/app/api/_lib/lineMessaging";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = (await req.json()) as { billId: string; reason?: string };
    if (!body?.billId?.trim())
      return NextResponse.json({ error: "billId required" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("cancel_bill_and_refund", {
      p_bill_id: body.billId,
      p_reason: body.reason?.trim() ? body.reason.trim() : null,
      p_actor: admin.userId,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    const bill = data as unknown as { user_id?: string; bill_no?: string };
    if (bill?.user_id) {
      await pushLineTextSafe({
        to: bill.user_id,
        text: `บิล ${bill.bill_no ?? ""} ถูกยกเลิก และคืนเครดิตแล้ว`,
      });
    }
    return NextResponse.json({ bill: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

