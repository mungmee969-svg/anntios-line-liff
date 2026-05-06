import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/app/api/_lib/supabaseAdmin";
import { requireAdmin } from "@/app/api/_lib/adminGuard";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const supabase = getSupabaseAdmin();

    const { data: wallets, error } = await supabase
      .from("user_wallets")
      .select("user_id,display_name,credit_balance,locked_balance,updated_at")
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ customers: wallets ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

