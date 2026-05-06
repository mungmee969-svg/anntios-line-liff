import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/app/api/_lib/supabaseAdmin";
import { requireAdmin } from "@/app/api/_lib/adminGuard";
import { pushLineTextSafe } from "@/app/api/_lib/lineMessaging";

function formatDate(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function statusLabel(status: string) {
  switch (status) {
    case "pending":
      return "รอดำเนินการ";
    case "accepted":
      return "รับแล้ว";
    case "rejected":
      return "ปฏิเสธ";
    case "settled":
      return "สรุปแล้ว";
    case "cancelled":
      return "ยกเลิก";
    default:
      return status;
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = (await req.json()) as { billId: string };
    if (!body?.billId?.trim()) {
      return NextResponse.json({ error: "billId required" }, { status: 400 });
    }

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
    const divider = "━━━━━━━━━━━━━━";
    const lines: string[] = [];
    lines.push("🧾 รวยไม่ไหว");
    lines.push(divider);
    lines.push("ใบสรุปรายการ (แอดมินส่ง)");
    lines.push("");
    lines.push(`เลขบิล: ${bill.bill_no}`);
    lines.push(`ลูกค้า: ${bill.display_name ?? bill.user_id}`);
    lines.push(`หวย: ${bill.lottery_name ?? "-"}`);
    lines.push(`ประเภท: ${bill.bet_type ?? "-"}`);
    lines.push(`เวลา: ${formatDate(bill.created_at)}`);
    lines.push(divider);
    lines.push("");
    lines.push("รายการ");

    const max = Math.min(records?.length ?? 0, 40);
    for (let i = 0; i < max; i++) {
      const r = records![i];
      lines.push(`${r.number}  ${r.type} ${fmtAmount(Number(r.amount))}`);
    }
    const remaining = Math.max(0, (records?.length ?? 0) - max);
    if (remaining > 0) lines.push(`...และอีก ${remaining} รายการ`);

    lines.push("");
    lines.push(divider);
    lines.push(`จำนวน: ${records?.length ?? 0} รายการ`);
    lines.push(`รวมยอด: ${fmtAmount(Number(bill.total_amount ?? 0))} บาท`);
    lines.push(`สถานะ: ${statusLabel(String(bill.status))}`);
    lines.push(divider);

    await pushLineTextSafe({ to: bill.user_id, text: lines.join("\n") });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
