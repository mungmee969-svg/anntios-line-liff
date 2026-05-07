import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/app/api/_lib/supabaseAdmin";
import { requireStaff } from "@/app/api/_lib/staffGuard";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    await requireStaff(req, "can_view_customers");
    const { userId } = await context.params;
    const uid = decodeURIComponent(userId || "").trim();
    if (!uid) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const supabase = getSupabaseAdmin();

    const { data: wallet, error: wErr } = await supabase
      .from("user_wallets")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();

    if (wErr) return NextResponse.json({ error: wErr.message }, { status: 400 });

    const { data: bills, error: bErr } = await supabase
      .from("bills")
      .select(
        "id,bill_no,lottery_name,bet_type,total_amount,status,net_amount,win_amount,lose_amount,created_at",
      )
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(50);

    if (bErr) return NextResponse.json({ error: bErr.message }, { status: 400 });

    const { data: txs, error: tErr } = await supabase
      .from("wallet_transactions")
      .select(
        "id,type,amount,status,balance_before,balance_after,note,created_at",
      )
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(80);

    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 400 });

    const settled = (bills ?? []).filter((b) => b.status === "settled");
    const winLoss = settled.reduce(
      (s, b) => {
        s.win += Number(b.win_amount ?? 0);
        s.lose += Number(b.lose_amount ?? 0);
        return s;
      },
      { win: 0, lose: 0 },
    );

    return NextResponse.json({
      wallet: wallet ?? null,
      bills: bills ?? [],
      transactions: txs ?? [],
      summary: {
        winTotal: winLoss.win,
        loseTotal: winLoss.lose,
        netFromBills: settled.reduce((s, b) => s + Number(b.net_amount ?? 0), 0),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
