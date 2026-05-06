import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/app/api/_lib/supabaseAdmin";
import { verifyLiffIdToken } from "@/app/api/_lib/lineAuth";

export async function GET(req: NextRequest) {
  try {
    const user = await verifyLiffIdToken(req);
    const supabase = getSupabaseAdmin();

    // wallet
    const { data: existing, error: existingError } = await supabase
      .from("user_wallets")
      .select(
        "id,user_id,display_name,credit_balance,locked_balance,created_at,updated_at",
      )
      .eq("user_id", user.userId)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);

    const wallet =
      existing ??
      (
        await supabase
          .from("user_wallets")
          .insert({
            user_id: user.userId,
            display_name: user.displayName,
            credit_balance: 0,
            locked_balance: 0,
          })
          .select(
            "id,user_id,display_name,credit_balance,locked_balance,created_at,updated_at",
          )
          .single()
      ).data;

    // txs
    const { data: txs, error: txError } = await supabase
      .from("wallet_transactions")
      .select(
        "id,user_id,display_name,type,amount,balance_before,balance_after,status,slip_url,bank_name,account_name,account_number,note,admin_note,approved_by,approved_at,created_at",
      )
      .eq("user_id", user.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (txError) throw new Error(txError.message);

    return NextResponse.json({ wallet, transactions: txs ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

