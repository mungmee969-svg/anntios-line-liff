import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/app/api/_lib/supabaseAdmin";
import { requireStaff } from "@/app/api/_lib/staffGuard";

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function GET(req: NextRequest) {
  try {
    await requireStaff(req, "can_view_dashboard");
    const supabase = getSupabaseAdmin();
    const start = startOfTodayISO();

    const [
      walletsRes,
      depsRes,
      wdrRes,
      billsPendingRes,
      betTodayRes,
      settledTodayRes,
      billsTodayRes,
      billsOpenRes,
      billsTodayRows,
    ] = await Promise.all([
      supabase.from("user_wallets").select("credit_balance"),
      supabase
        .from("wallet_transactions")
        .select("id", { count: "exact", head: true })
        .eq("type", "deposit")
        .eq("status", "pending"),
      supabase
        .from("wallet_transactions")
        .select("id", { count: "exact", head: true })
        .eq("type", "withdraw")
        .eq("status", "pending"),
      supabase
        .from("bills")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("wallet_transactions")
        .select("amount")
        .eq("type", "bet_debit")
        .eq("status", "approved")
        .gte("created_at", start),
      supabase
        .from("bills")
        .select("net_amount")
        .eq("status", "settled")
        .gte("settled_at", start),
      supabase
        .from("bills")
        .select("id", { count: "exact", head: true })
        .gte("created_at", start),
      supabase
        .from("bills")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "accepted"]),
      supabase.from("bills").select("user_id").gte("created_at", start).limit(5000),
    ]);

    for (const r of [
      walletsRes,
      depsRes,
      wdrRes,
      billsPendingRes,
      betTodayRes,
      settledTodayRes,
      billsTodayRes,
      billsOpenRes,
      billsTodayRows,
    ]) {
      if (r.error) throw new Error(r.error.message);
    }

    const totalCredit = (walletsRes.data ?? []).reduce(
      (s, w) => s + Number(w.credit_balance ?? 0),
      0,
    );
    const playToday = (betTodayRes.data ?? []).reduce(
      (s, r) => s + Math.abs(Number(r.amount ?? 0)),
      0,
    );
    const plToday = (settledTodayRes.data ?? []).reduce(
      (s, b) => s + Number(b.net_amount ?? 0),
      0,
    );
    const activeUserIds = new Set((billsTodayRows.data ?? []).map((b) => b.user_id).filter(Boolean));

    return NextResponse.json({
      totalCustomerCredit: totalCredit,
      pendingDeposits: depsRes.count ?? 0,
      pendingWithdraws: wdrRes.count ?? 0,
      pendingBills: billsPendingRes.count ?? 0,
      playVolumeToday: playToday,
      netResultToday: plToday,
      billsToday: billsTodayRes.count ?? 0,
      billsPendingSettle: billsOpenRes.count ?? 0,
      activeCustomersToday: activeUserIds.size,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
