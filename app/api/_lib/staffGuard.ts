import type { NextRequest } from "next/server";
import { verifyLiffIdToken } from "@/app/api/_lib/lineAuth";
import { getSupabaseAdmin } from "@/app/api/_lib/supabaseAdmin";

export type StaffRole = "owner" | "manager" | "staff" | "viewer";

export type StaffPermissionKey =
  | "can_view_dashboard"
  | "can_approve_deposit"
  | "can_approve_withdraw"
  | "can_cancel_bill"
  | "can_settle_result"
  | "can_adjust_credit"
  | "can_view_customers"
  | "can_export_report"
  | "can_manage_staff";

const ALL_KEYS: StaffPermissionKey[] = [
  "can_view_dashboard",
  "can_approve_deposit",
  "can_approve_withdraw",
  "can_cancel_bill",
  "can_settle_result",
  "can_adjust_credit",
  "can_view_customers",
  "can_export_report",
  "can_manage_staff",
];

function parseOwnerIds(): Set<string> {
  const raw =
    process.env.NEXT_PUBLIC_ADMIN_USER_IDS || process.env.ADMIN_USER_IDS || "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

function defaultPermissions(role: StaffRole): Record<StaffPermissionKey, boolean> {
  const all = Object.fromEntries(ALL_KEYS.map((k) => [k, true])) as Record<
    StaffPermissionKey,
    boolean
  >;
  const none = Object.fromEntries(ALL_KEYS.map((k) => [k, false])) as Record<
    StaffPermissionKey,
    boolean
  >;

  if (role === "owner") return all;

  if (role === "manager") {
    return { ...all, can_manage_staff: false };
  }

  if (role === "staff") {
    return {
      ...none,
      can_view_dashboard: true,
      can_approve_deposit: true,
      can_approve_withdraw: true,
      can_cancel_bill: true,
      can_settle_result: true,
      can_view_customers: true,
      can_export_report: true,
    };
  }

  // viewer
  return {
    ...none,
    can_view_dashboard: true,
    can_view_customers: true,
  };
}

function mergePermissions(
  role: StaffRole,
  dbJson: Record<string, unknown> | null,
): Record<StaffPermissionKey, boolean> {
  const base = defaultPermissions(role);
  if (!dbJson || typeof dbJson !== "object") return base;
  const out = { ...base };
  for (const k of ALL_KEYS) {
    if (k in dbJson && typeof dbJson[k] === "boolean") {
      out[k] = dbJson[k] as boolean;
    }
  }
  return out;
}

export type StaffContext = {
  userId: string;
  displayName: string | null;
  role: StaffRole;
  staffRowId: string | null;
  permissions: Record<StaffPermissionKey, boolean>;
};

export function staffHasPermission(ctx: StaffContext, key: StaffPermissionKey): boolean {
  return Boolean(ctx.permissions[key]);
}

/** Owner จาก env = เห็นทุกอย่างโดยไม่ต้องมีแถว staff_users */
export async function requireStaff(
  req: NextRequest,
  permission: StaffPermissionKey,
): Promise<StaffContext> {
  const user = await verifyLiffIdToken(req);
  const owners = parseOwnerIds();

  if (owners.has(user.userId)) {
    const perms = defaultPermissions("owner");
    return {
      userId: user.userId,
      displayName: user.displayName,
      role: "owner",
      staffRowId: null,
      permissions: perms,
    };
  }

  const supabase = getSupabaseAdmin();
  const { data: row, error } = await supabase
    .from("staff_users")
    .select("id,display_name,role,is_active,permissions")
    .eq("line_user_id", user.userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row || !row.is_active) throw new Error("FORBIDDEN");

  const role = row.role as StaffRole;
  const permissions = mergePermissions(role, row.permissions as Record<string, unknown> | null);

  const ctx: StaffContext = {
    userId: user.userId,
    displayName: row.display_name ?? user.displayName,
    role,
    staffRowId: row.id,
    permissions,
  };

  if (!staffHasPermission(ctx, permission)) throw new Error("FORBIDDEN");
  return ctx;
}

/** ใช้เมนู /me — ไม่บังคับ permission เฉพาะรายการ */
export async function resolveStaff(req: NextRequest): Promise<StaffContext | null> {
  try {
    const user = await verifyLiffIdToken(req);
    const owners = parseOwnerIds();
    if (owners.has(user.userId)) {
      return {
        userId: user.userId,
        displayName: user.displayName,
        role: "owner",
        staffRowId: null,
        permissions: defaultPermissions("owner"),
      };
    }
    const supabase = getSupabaseAdmin();
    const { data: row, error } = await supabase
      .from("staff_users")
      .select("id,display_name,role,is_active,permissions")
      .eq("line_user_id", user.userId)
      .maybeSingle();
    if (error || !row || !row.is_active) return null;
    const role = row.role as StaffRole;
    return {
      userId: user.userId,
      displayName: row.display_name ?? user.displayName,
      role,
      staffRowId: row.id,
      permissions: mergePermissions(role, row.permissions as Record<string, unknown> | null),
    };
  } catch {
    return null;
  }
}
