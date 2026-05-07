import { NextResponse } from "next/server";
import { requireBackofficeUser } from "@/app/api/backoffice/_lib/requireUser";

export async function GET() {
  try {
    const user = await requireBackofficeUser();
    return NextResponse.json({ user });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "INACTIVE") return NextResponse.json({ error: "INACTIVE" }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

