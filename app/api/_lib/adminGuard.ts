import type { NextRequest } from "next/server";
import { verifyLiffIdToken } from "@/app/api/_lib/lineAuth";

function parseAdminIds(): Set<string> {
  const raw =
    process.env.NEXT_PUBLIC_ADMIN_USER_IDS ||
    process.env.ADMIN_USER_IDS ||
    "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export async function requireAdmin(req: NextRequest) {
  const user = await verifyLiffIdToken(req);
  const admins = parseAdminIds();
  if (admins.size === 0) throw new Error("Missing env NEXT_PUBLIC_ADMIN_USER_IDS");
  if (!admins.has(user.userId)) throw new Error("FORBIDDEN");
  return user;
}

