import { NextResponse, type NextRequest } from "next/server";
import jwt from "jsonwebtoken";

type Body = { username?: string; password?: string };

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`Missing env ${name}`);
  return v.trim();
}

export async function POST(req: NextRequest) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }

  const username = (body.username ?? "").trim();
  const password = (body.password ?? "").trim();
  if (!username || !password) {
    return NextResponse.json({ success: false, error: "กรอก username/password" }, { status: 400 });
  }

  try {
    const ownerU = requireEnv("BACKOFFICE_OWNER_USERNAME");
    const ownerP = requireEnv("BACKOFFICE_OWNER_PASSWORD");
    const secret = requireEnv("BACKOFFICE_JWT_SECRET");
    if (secret.length < 32) throw new Error("BACKOFFICE_JWT_SECRET must be >= 32 chars");

    if (username !== ownerU || password !== ownerP) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const token = jwt.sign(
      { sub: "owner", username, role: "owner" },
      secret,
      { algorithm: "HS256", expiresIn: "7d" },
    );

    return NextResponse.json({ success: true, token });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

