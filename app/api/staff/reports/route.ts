import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/app/api/_lib/supabaseAdmin";
import { requireStaff } from "@/app/api/_lib/staffGuard";

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 7);
  from.setHours(0, 0, 0, 0);
  return { from: from.toISOString(), to: to.toISOString() };
}

export async function GET(req: NextRequest) {
  try {
    await requireStaff(req, "can_export_report");
    const url = new URL(req.url);
    const { from, to } = url.searchParams.get("from") && url.searchParams.get("to")
      ? { from: url.searchParams.get("from")!, to: url.searchParams.get("to")! }
      : defaultRange();
    const format = url.searchParams.get("format");

    const supabase = getSupabaseAdmin();

    const [deps, wdrs, bets, wins, bills] = await Promise.all([
      supabase
        .from("wallet_transactions")
        .select("amount,status,type")
        .eq("type", "deposit")
        .eq("status", "approved")
        .gte("created_at", from)
        .lte("created_at", to),
      supabase
        .from("wallet_transactions")
        .select("amount,status,type")
        .eq("type", "withdraw")
        .eq("status", "approved")
        .gte("created_at", from)
        .lte("created_at", to),
      supabase
        .from("wallet_transactions")
        .select("amount")
        .eq("type", "bet_debit")
        .eq("status", "approved")
        .gte("created_at", from)
        .lte("created_at", to),
      supabase
        .from("wallet_transactions")
        .select("amount")
        .eq("type", "win_credit")
        .eq("status", "approved")
        .gte("created_at", from)
        .lte("created_at", to),
      supabase
        .from("bills")
        .select("id,user_id,total_amount,net_amount,status,lottery_name,created_at")
        .gte("created_at", from)
        .lte("created_at", to)
        .limit(5000),
    ]);

    for (const r of [deps, wdrs, bets, wins, bills]) {
      if (r.error) throw new Error(r.error.message);
    }

    const sumAmt = (rows: { amount: unknown }[] | null) =>
      (rows ?? []).reduce((s, r) => s + Math.abs(Number(r.amount ?? 0)), 0);

    const depositTotal = sumAmt(deps.data as { amount: unknown }[] | null);
    const withdrawTotal = sumAmt(wdrs.data as { amount: unknown }[] | null);
    const playTotal = sumAmt(bets.data as { amount: unknown }[] | null);
    const payoutTotal = sumAmt(wins.data as { amount: unknown }[] | null);
    const billRows = bills.data ?? [];
    const billCount = billRows.length;
    const customerIds = new Set(billRows.map((b) => b.user_id).filter(Boolean));
    const grossFromBills = billRows
      .filter((b) => b.status === "settled")
      .reduce((s, b) => s + Number(b.net_amount ?? 0), 0);

    const metrics = {
      depositApproved: depositTotal,
      withdrawApproved: withdrawTotal,
      playVolume: playTotal,
      prizePaid: payoutTotal,
      netFromSettledBills: grossFromBills,
      billCount,
      uniqueCustomers: customerIds.size,
    };

    if (format === "csv") {
      const header = "metric,value\n";
      const lines = Object.entries(metrics)
        .map(([k, v]) => `${k},${v}`)
        .join("\n");
      return new NextResponse(header + lines, {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="anntios-report.csv"`,
        },
      });
    }

    return NextResponse.json({ from, to, metrics });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
