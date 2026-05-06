import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/app/api/_lib/supabaseAdmin";
import { verifyLiffIdToken } from "@/app/api/_lib/lineAuth";

type Body = {
  amount: number;
  slipUrl?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  note?: string;
};

export async function POST(req: NextRequest) {
  try {
    const user = await verifyLiffIdToken(req);
    const body = (await req.json()) as Body;
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "กรุณากรอกจำนวนเงินที่ถูกต้อง" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("wallet_transactions")
      .insert({
        user_id: user.userId,
        display_name: user.displayName,
        type: "deposit",
        amount,
        status: "pending",
        slip_url: body.slipUrl ?? null,
        bank_name: body.bankName ?? null,
        account_name: body.accountName ?? null,
        account_number: body.accountNumber ?? null,
        note: body.note?.trim() ? body.note.trim() : null,
      })
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ transaction: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

