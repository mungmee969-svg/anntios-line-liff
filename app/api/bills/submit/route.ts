import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/app/api/_lib/supabaseAdmin";
import { verifyLiffIdToken } from "@/app/api/_lib/lineAuth";

type SubmitBillBody = {
  lotteryName: string;
  betType: string;
  note?: string;
  items: Array<{ number: string; type: string; amount: number }>;
};

function billNoNow() {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const HH = String(now.getHours()).padStart(2, "0");
  const MM = String(now.getMinutes()).padStart(2, "0");
  const SS = String(now.getSeconds()).padStart(2, "0");
  return `RW-${yyyy}${mm}${dd}-${HH}${MM}${SS}`;
}

export async function POST(req: NextRequest) {
  try {
    const user = await verifyLiffIdToken(req);
    const body = (await req.json()) as SubmitBillBody;

    if (!body?.lotteryName?.trim()) {
      return NextResponse.json({ error: "กรุณาเลือกชื่อหวย" }, { status: 400 });
    }
    if (!body?.betType?.trim()) {
      return NextResponse.json({ error: "กรุณาเลือกประเภทเดิมพัน" }, { status: 400 });
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "ยังไม่มีรายการ" }, { status: 400 });
    }

    const totalAmount = body.items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return NextResponse.json({ error: "ยอดรวมไม่ถูกต้อง" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const bill_no = billNoNow();

    const { data, error } = await supabase.rpc("submit_bill_with_credit", {
      p_bill_no: bill_no,
      p_user_id: user.userId,
      p_display_name: user.displayName,
      p_lottery_name: body.lotteryName,
      p_bet_type: body.betType,
      p_total_amount: totalAmount,
      p_note: body.note?.trim() ? body.note.trim() : null,
      p_records: body.items,
      p_actor: user.userId,
    });

    if (error) {
      const msg = error.message || "submit failed";
      if (msg.includes("INSUFFICIENT_CREDIT")) {
        return NextResponse.json(
          { error: "เครดิตไม่พอ กรุณาเติมเครดิตก่อนส่งรายการ" },
          { status: 402 },
        );
      }
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({
      bill: data,
      bill_no,
      total_amount: totalAmount,
      record_count: body.items.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

