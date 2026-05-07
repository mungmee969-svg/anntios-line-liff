import { NextResponse, type NextRequest } from "next/server";
import { resolveStaff } from "@/app/api/_lib/staffGuard";

export async function GET(req: NextRequest) {
  try {
    const ctx = await resolveStaff(req);
    if (!ctx) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({
      userId: ctx.userId,
      displayName: ctx.displayName,
      role: ctx.role,
      staffRowId: ctx.staffRowId,
      permissions: ctx.permissions,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
