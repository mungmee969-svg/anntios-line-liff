import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/app/api/_lib/supabaseAdmin";
import { requireAdmin } from "@/app/api/_lib/adminGuard";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const userId = url.searchParams.get("userId");
    const lotteryName = url.searchParams.get("lotteryName");

    const supabase = getSupabaseAdmin();
    let q = supabase
      .from("bills")
      .select(
        "id,bill_no,user_id,display_name,lottery_name,bet_type,total_amount,win_amount,lose_amount,net_amount,status,credit_before,credit_after,cancelled_reason,settled_at,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (status) q = q.eq("status", status);
    if (userId) q = q.eq("user_id", userId);
    if (lotteryName) q = q.eq("lottery_name", lotteryName);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ bills: data ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

