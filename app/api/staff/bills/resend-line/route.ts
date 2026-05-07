import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/app/api/_lib/supabaseAdmin";
import { requireStaff } from "@/app/api/_lib/staffGuard";
import { pushLineTextSafe } from "@/app/api/_lib/lineMessaging";
import { insertAuditLog } from "@/app/api/_lib/auditLog";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export async function POST(req: NextRequest) {
  try {
    const staff = await requireStaff(req, "can_view_dashboard");
    const body = (await req.json()) as { billId: string };
    if (!body?.billId?.trim()) return NextResponse.json({ error: "billId required" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data: bill, error: bErr } = await supabase
      .from("bills")
      .select("*")
      .eq("id", body.billId.trim())
      .maybeSingle();

    if (bErr) return NextResponse.json({ error: bErr.message }, { status: 400 });
    if (!bill) return NextResponse.json({ error: "ไม่พบบิล" }, { status: 404 });

    const { data: records, error: rErr } = await supabase
      .from("records")
      .select("number,type,amount")
      .eq("bill_id", body.billId.trim())
      .order("created_at", { ascending: true });

    if (rErr) return NextResponse.json({ error: rErr.message }, { status: 400 });

    const fmtAmount = (n: number) => new Intl.NumberFormat("th-TH").format(n);
    const lines: string[] = [];
    lines.push("🧾 AnntiOS Staff");
    lines.push(`เลขบิล: ${bill.bill_no}`);
    lines.push(`ลูกค้า: ${bill.display_name ?? bill.user_id}`);
    lines.push(`หวย: ${bill.lottery_name ?? "-"}`);
    lines.push(`เวลา: ${formatDate(bill.created_at)}`);
    lines.push("—");
    for (const r of records ?? []) {
      lines.push(`${r.number} ${r.type} ${fmtAmount(Number(r.amount))}`);
    }
    lines.push("—");
    lines.push(`รวม ${fmtAmount(Number(bill.total_amount ?? 0))} บาท`);

    await pushLineTextSafe({ to: bill.user_id, text: lines.join("\n") });

    await insertAuditLog(supabase, {
      actorUserId: staff.userId,
      actorName: staff.displayName,
      action: "resend_bill_line",
      targetType: "bill",
      targetId: body.billId,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
