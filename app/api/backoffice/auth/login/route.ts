import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/app/api/_lib/supabaseAdmin";
import {
  BACKOFFICE_COOKIE_NAME,
  BACKOFFICE_SESSION_MAX_AGE_SEC,
  signBackofficeJwt,
} from "@/src/lib/backoffice-auth";
import {
  mergeBackofficePermissions,
  type BackofficeRole,
} from "@/src/lib/backoffice-permissions";
import { insertAuditLog } from "@/app/api/_lib/auditLog";

type Body = { username?: string; password?: string; remember?: boolean };

async function ensureOwnerSeed(): Promise<void> {
  const ownerUsername = process.env.BACKOFFICE_OWNER_USERNAME;
  const ownerPassword = process.env.BACKOFFICE_OWNER_PASSWORD;
  if (!ownerUsername || !ownerPassword) return;

  const supabase = getSupabaseAdmin();
  const { data: existing, error } = await supabase
    .from("backoffice_users")
    .select("id,role")
    .eq("role", "owner")
    .limit(1);

  if (error) throw new Error(error.message);
  if (existing && existing.length > 0) return;

  const hash = await bcrypt.hash(ownerPassword, 10);
  const { error: insErr } = await supabase.from("backoffice_users").insert({
    username: ownerUsername,
    password_hash: hash,
    display_name: "Owner",
    role: "owner",
    is_active: true,
    permissions: {},
  });
  if (insErr) throw new Error(insErr.message);
}

export async function POST(req: NextRequest) {
  try {
    await ensureOwnerSeed();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Seed owner failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }

  const username = (body.username ?? "").trim();
  const password = (body.password ?? "").trim();
  const remember = Boolean(body.remember);

  if (!username || !password) {
    return NextResponse.json({ error: "กรอก username และ password" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: row, error } = await supabase
      .from("backoffice_users")
      .select("id,username,password_hash,display_name,role,is_active,permissions")
      .eq("username", username)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!row || !row.is_active) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าหลังบ้าน" }, { status: 403 });
    }

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      return NextResponse.json({ error: "username/password ไม่ถูกต้อง" }, { status: 401 });
    }

    const role = row.role as BackofficeRole;
    const permissions = mergeBackofficePermissions(role, row.permissions as Record<string, unknown> | null);
    const token = signBackofficeJwt({
      sub: row.id,
      username: row.username,
      role,
      permissions,
      displayName: row.display_name ?? null,
    });

    const store = await cookies();
    store.set(BACKOFFICE_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: remember ? BACKOFFICE_SESSION_MAX_AGE_SEC : undefined,
    });

    await insertAuditLog(supabase, {
      actorUserId: row.id,
      actorName: row.display_name ?? row.username,
      action: "backoffice.login",
      targetType: "backoffice_user",
      targetId: row.id,
      metadata: { username: row.username },
    });

    return NextResponse.json({
      user: {
        id: row.id,
        username: row.username,
        displayName: row.display_name ?? null,
        role,
        isActive: row.is_active,
        permissions,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

