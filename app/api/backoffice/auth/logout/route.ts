import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BACKOFFICE_COOKIE_NAME } from "@/src/lib/backoffice-auth";

export async function POST() {
  const store = await cookies();
  store.set(BACKOFFICE_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return NextResponse.json({ ok: true });
}

