import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/app/api/_lib/supabaseAdmin";
import { requireStaff } from "@/app/api/_lib/staffGuard";

export async function GET(req: NextRequest) {
  try {
    await requireStaff(req, "can_view_dashboard");
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const userId = url.searchParams.get("userId");
    const lotteryName = url.searchParams.get("lotteryName");
    const billNo = url.searchParams.get("billNo");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const supabase = getSupabaseAdmin();
    let q = supabase
      .from("bills")
      .select(
        "id,bill_no,user_id,display_name,lottery_name,bet_type,total_amount,status,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(300);

    if (status) q = q.eq("status", status);
    if (userId) q = q.eq("user_id", userId);
    if (lotteryName) q = q.eq("lottery_name", lotteryName);
    if (billNo) q = q.ilike("bill_no", `%${billNo}%`);
    if (from) q = q.gte("created_at", from);
    if (to) q = q.lte("created_at", to);

    const { data: bills, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const ids = (bills ?? []).map((b) => b.id);
    const counts: Record<string, number> = {};
    if (ids.length > 0) {
      const { data: recs, error: rErr } = await supabase
        .from("records")
        .select("bill_id")
        .in("bill_id", ids);
      if (rErr) return NextResponse.json({ error: rErr.message }, { status: 400 });
      for (const r of recs ?? []) {
        const bid = r.bill_id as string;
        counts[bid] = (counts[bid] ?? 0) + 1;
      }
    }

    const enriched = (bills ?? []).map((b) => ({
      ...b,
      record_count: counts[b.id] ?? 0,
    }));

    return NextResponse.json({ bills: enriched });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
