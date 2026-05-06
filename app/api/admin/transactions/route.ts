import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/app/api/_lib/supabaseAdmin";
import { requireAdmin } from "@/app/api/_lib/adminGuard";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const type = url.searchParams.get("type");

    const supabase = getSupabaseAdmin();
    let q = supabase
      .from("wallet_transactions")
      .select(
        "id,user_id,display_name,type,amount,balance_before,balance_after,status,slip_url,bank_name,account_name,account_number,note,admin_note,approved_by,approved_at,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (status) q = q.eq("status", status);
    if (type) q = q.eq("type", type);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ transactions: data ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

