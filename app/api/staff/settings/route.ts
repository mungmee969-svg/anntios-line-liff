import { NextResponse, type NextRequest } from "next/server";
import { requireStaff } from "@/app/api/_lib/staffGuard";

export async function GET(req: NextRequest) {
  try {
    await requireStaff(req, "can_view_dashboard");
    return NextResponse.json({
      bankTransferNote: process.env.NEXT_PUBLIC_BANK_TRANSFER_NOTE ?? null,
      lotteryNames: ["รัฐบาลไทย", "ลาวพัฒนา", "ฮานอย", "ฮานอย VIP", "ฮานอยพัฒนา"],
      staffOsVersion: "1.0.0",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
