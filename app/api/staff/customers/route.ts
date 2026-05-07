import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/app/api/_lib/supabaseAdmin";
import { requireStaff } from "@/app/api/_lib/staffGuard";

type BillAgg = {
  user_id: string;
  total_bills: number;
  total_play: number;
  net_result: number;
  last_active: string | null;
};

export async function GET(req: NextRequest) {
  try {
    await requireStaff(req, "can_view_customers");
    const supabase = getSupabaseAdmin();

    const { data: wallets, error: wErr } = await supabase
      .from("user_wallets")
      .select("user_id,display_name,credit_balance,locked_balance,updated_at")
      .order("updated_at", { ascending: false })
      .limit(250);

    if (wErr) return NextResponse.json({ error: wErr.message }, { status: 400 });

    const userIds = (wallets ?? []).map((w) => w.user_id).filter(Boolean);
    const aggMap = new Map<string, BillAgg>();

    if (userIds.length > 0) {
      const { data: bills, error: bErr } = await supabase
        .from("bills")
        .select("user_id,total_amount,net_amount,status,created_at")
        .in("user_id", userIds)
        .limit(8000);

      if (bErr) return NextResponse.json({ error: bErr.message }, { status: 400 });

      for (const b of bills ?? []) {
        const uid = b.user_id as string;
        const cur = aggMap.get(uid) ?? {
          user_id: uid,
          total_bills: 0,
          total_play: 0,
          net_result: 0,
          last_active: null as string | null,
        };
        cur.total_bills += 1;
        if (b.status !== "cancelled") {
          cur.total_play += Number(b.total_amount ?? 0);
        }
        if (b.status === "settled") {
          cur.net_result += Number(b.net_amount ?? 0);
        }
        const ca = b.created_at as string;
        if (!cur.last_active || ca > cur.last_active) cur.last_active = ca;
        aggMap.set(uid, cur);
      }
    }

    const customers = (wallets ?? []).map((w) => {
      const a = aggMap.get(w.user_id);
      return {
        ...w,
        total_bills: a?.total_bills ?? 0,
        total_play: a?.total_play ?? 0,
        net_result: a?.net_result ?? 0,
        last_active: a?.last_active ?? w.updated_at,
      };
    });

    return NextResponse.json({ customers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
