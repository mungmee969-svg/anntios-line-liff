import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const username = body.username;
    const password = body.password;

    const envUser = process.env.BACKOFFICE_OWNER_USERNAME;
    const envPass = process.env.BACKOFFICE_OWNER_PASSWORD;
    const jwtSecret = process.env.BACKOFFICE_JWT_SECRET;

    if (!envUser || !envPass || !jwtSecret) {
      return NextResponse.json(
        { error: "Missing env" },
        { status: 500 }
      );
    }

    if (username !== envUser || password !== envPass) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      { username },
      jwtSecret,
      { expiresIn: "7d" }
    );

    return NextResponse.json({
      success: true,
      token,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}