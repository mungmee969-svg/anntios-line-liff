import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/app/api/_lib/supabaseAdmin";
import { verifyLiffIdToken } from "@/app/api/_lib/lineAuth";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ billId: string }> },
) {
  try {
    const { billId } = await context.params;
    if (!billId?.trim()) {
      return NextResponse.json({ error: "billId required" }, { status: 400 });
    }

    const user = await verifyLiffIdToken(req);
    const supabase = getSupabaseAdmin();

    const { data: bill, error: bErr } = await supabase
      .from("bills")
      .select("*")
      .eq("id", billId.trim())
      .eq("user_id", user.userId)
      .maybeSingle();

    if (bErr) return NextResponse.json({ error: bErr.message }, { status: 400 });
    if (!bill) return NextResponse.json({ error: "ไม่พบบิล" }, { status: 404 });

    const { data: records, error: rErr } = await supabase
      .from("records")
      .select("*")
      .eq("bill_id", billId.trim())
      .order("created_at", { ascending: true });

    if (rErr) return NextResponse.json({ error: rErr.message }, { status: 400 });

    return NextResponse.json({ bill, records: records ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
