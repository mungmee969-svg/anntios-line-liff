import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/app/api/_lib/supabaseAdmin";
import { requireStaff } from "@/app/api/_lib/staffGuard";
import { insertAuditLog } from "@/app/api/_lib/auditLog";
import { pushLineTextSafe } from "@/app/api/_lib/lineMessaging";

export async function POST(req: NextRequest) {
  try {
    const staff = await requireStaff(req, "can_view_customers");
    const body = (await req.json()) as { userId: string; text: string };
    if (!body?.userId?.trim()) return NextResponse.json({ error: "userId required" }, { status: 400 });
    const text = body.text?.trim();
    if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    await pushLineTextSafe({ to: body.userId, text: `[AnntiOS] ${text}` });

    await insertAuditLog(supabase, {
      actorUserId: staff.userId,
      actorName: staff.displayName,
      action: "customer_message",
      targetType: "user",
      targetId: body.userId,
      metadata: { preview: text.slice(0, 200) },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
