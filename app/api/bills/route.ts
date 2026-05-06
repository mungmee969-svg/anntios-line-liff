import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/app/api/_lib/supabaseAdmin";
import { verifyLiffIdToken } from "@/app/api/_lib/lineAuth";

export async function GET(req: NextRequest) {
  try {
    const user = await verifyLiffIdToken(req);
    const supabase = getSupabaseAdmin();

    await supabase.rpc("_get_or_create_wallet", {
      p_user_id: user.userId,
      p_display_name: user.displayName,
    });

    const { data: bills, error: bErr } = await supabase
      .from("bills")
      .select(
        "id,bill_no,user_id,display_name,lottery_name,bet_type,total_amount,win_amount,lose_amount,net_amount,status,note,credit_before,credit_after,cancelled_reason,settled_at,created_at",
      )
      .eq("user_id", user.userId)
      .order("created_at", { ascending: false });

    if (bErr) return NextResponse.json({ error: bErr.message }, { status: 400 });

    const list = bills ?? [];
    const ids = list.map((b) => b.id);
    let counts: Record<string, number> = {};
    if (ids.length > 0) {
      const { data: recRows, error: rErr } = await supabase
        .from("records")
        .select("bill_id")
        .in("bill_id", ids);
      if (!rErr && recRows) {
        counts = recRows.reduce<Record<string, number>>((acc, row) => {
          const id = row.bill_id as string;
          acc[id] = (acc[id] ?? 0) + 1;
          return acc;
        }, {});
      }
    }

    const withCounts = list.map((b) => ({
      ...b,
      record_count: counts[b.id] ?? 0,
    }));

    return NextResponse.json({ bills: withCounts });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
