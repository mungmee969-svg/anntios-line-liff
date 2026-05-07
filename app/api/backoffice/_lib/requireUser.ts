import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/api/_lib/supabaseAdmin";
import { getBackofficeSession } from "@/app/api/backoffice/_lib/session";
import {
  mergeBackofficePermissions,
  type BackofficePermissionKey,
  type BackofficeRole,
} from "@/src/lib/backoffice-permissions";

export type BackofficeUser = {
  id: string;
  username: string;
  displayName: string | null;
  role: BackofficeRole;
  isActive: boolean;
  permissions: Record<BackofficePermissionKey, boolean>;
};

export async function requireBackofficeUser(): Promise<BackofficeUser> {
  const session = await getBackofficeSession();
  if (!session) throw new Error("UNAUTHORIZED");

  const supabase = getSupabaseAdmin();
  const { data: row, error } = await supabase
    .from("backoffice_users")
    .select("id,username,display_name,role,is_active,permissions")
    .eq("id", session.sub)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) throw new Error("UNAUTHORIZED");
  if (!row.is_active) throw new Error("INACTIVE");

  const role = row.role as BackofficeRole;
  const permissions = mergeBackofficePermissions(role, row.permissions as Record<string, unknown> | null);

  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name ?? session.displayName ?? null,
    role,
    isActive: row.is_active,
    permissions,
  };
}

export function permissionDenied() {
  return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
}

export function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

