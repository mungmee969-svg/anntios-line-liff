import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/app/api/_lib/supabaseAdmin";
import { requireStaff } from "@/app/api/_lib/staffGuard";

export async function GET(req: NextRequest) {
  try {
    await requireStaff(req, "can_manage_staff");
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("staff_users")
      .select("id,line_user_id,display_name,role,is_active,permissions,created_at")
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ staff: data ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
