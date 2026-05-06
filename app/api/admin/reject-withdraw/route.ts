import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/app/api/_lib/supabaseAdmin";
import { requireAdmin } from "@/app/api/_lib/adminGuard";
import { pushLineTextSafe } from "@/app/api/_lib/lineMessaging";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = (await req.json()) as { txId: string; adminNote?: string };
    if (!body?.txId?.trim()) return NextResponse.json({ error: "txId required" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("reject_transaction", {
      p_tx_id: body.txId,
      p_actor: admin.userId,
      p_admin_note: body.adminNote?.trim() ? body.adminNote.trim() : null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    const tx = data as unknown as { user_id?: string | null; admin_note?: string | null };
    if (tx?.user_id) {
      const note = tx.admin_note ? `\nเหตุผล: ${tx.admin_note}` : "";
      await pushLineTextSafe({ to: tx.user_id, text: `คำขอถอนเครดิตถูกปฏิเสธ${note}` });
    }
    return NextResponse.json({ transaction: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

