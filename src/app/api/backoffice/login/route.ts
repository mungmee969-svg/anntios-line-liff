import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

type Body = { username?: string; password?: string };

function readEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`Missing env ${name}`);
  return v.trim();
}

export async function POST(req: Request) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }

  const username = (body.username ?? "").trim();
  const password = (body.password ?? "").trim();

  if (!username || !password) {
    return NextResponse.json({ error: "กรอก username/password" }, { status: 400 });
  }

  try {
    const ownerU = readEnv("BACKOFFICE_OWNER_USERNAME");
    const ownerP = readEnv("BACKOFFICE_OWNER_PASSWORD");
    const secret = readEnv("BACKOFFICE_JWT_SECRET");

    if (secret.length < 32) {
      return NextResponse.json(
        { error: "BACKOFFICE_JWT_SECRET must be >= 32 chars" },
        { status: 500 },
      );
    }

    if (username !== ownerU || password !== ownerP) {
      return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
    }

    const token = jwt.sign({ sub: "owner", username, role: "owner" }, secret, {
      algorithm: "HS256",
      expiresIn: "7d",
    });

    return NextResponse.json({ token });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

