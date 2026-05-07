import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/app/api/_lib/supabaseAdmin";
import { requireStaff } from "@/app/api/_lib/staffGuard";
import { insertAuditLog } from "@/app/api/_lib/auditLog";
import { settleLotteryBills, type LotteryDrawInput } from "@/app/api/_lib/lotterySettle";

export async function POST(req: NextRequest) {
  try {
    const staff = await requireStaff(req, "can_settle_result");
    const body = (await req.json()) as LotteryDrawInput;

    if (!body?.lotteryName?.trim()) {
      return NextResponse.json({ error: "lotteryName required" }, { status: 400 });
    }
    if (!body?.twoTop?.trim() || !body?.twoBottom?.trim() || !body?.threeStraight?.trim()) {
      return NextResponse.json(
        { error: "กรอก 2บน 2ล่าง และ 3ตัวบน/ตรง ให้ครบ" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();
    const { processed } = await settleLotteryBills(supabase, body, staff.userId);

    await insertAuditLog(supabase, {
      actorUserId: staff.userId,
      actorName: staff.displayName,
      action: "settle_result",
      targetType: "lottery",
      targetId: body.lotteryName.trim(),
      metadata: { processed },
    });

    return NextResponse.json({ ok: true, processed, lotteryName: body.lotteryName.trim() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
