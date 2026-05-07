export type BackofficePermissionKey =
  | "dashboard.view"
  | "deposits.view"
  | "deposits.approve"
  | "deposits.reject"
  | "withdraws.view"
  | "withdraws.approve"
  | "withdraws.reject"
  | "bills.view"
  | "bills.cancel"
  | "bills.resend"
  | "results.view"
  | "results.settle"
  | "customers.view"
  | "customers.adjust_credit"
  | "reports.view"
  | "staff.view"
  | "staff.create"
  | "staff.update"
  | "settings.view"
  | "settings.update";

export type BackofficeRole = "owner" | "admin" | "manager" | "staff" | "viewer";

export const ALL_BACKOFFICE_PERMS: BackofficePermissionKey[] = [
  "dashboard.view",
  "deposits.view",
  "deposits.approve",
  "deposits.reject",
  "withdraws.view",
  "withdraws.approve",
  "withdraws.reject",
  "bills.view",
  "bills.cancel",
  "bills.resend",
  "results.view",
  "results.settle",
  "customers.view",
  "customers.adjust_credit",
  "reports.view",
  "staff.view",
  "staff.create",
  "staff.update",
  "settings.view",
  "settings.update",
];

export type BackofficePermissions = Record<BackofficePermissionKey, boolean>;

function baseNone(): BackofficePermissions {
  return Object.fromEntries(ALL_BACKOFFICE_PERMS.map((k) => [k, false])) as BackofficePermissions;
}

function baseAll(): BackofficePermissions {
  return Object.fromEntries(ALL_BACKOFFICE_PERMS.map((k) => [k, true])) as BackofficePermissions;
}

export function defaultBackofficePermissions(role: BackofficeRole): BackofficePermissions {
  if (role === "owner") return baseAll();
  if (role === "admin") return baseAll();
  if (role === "viewer") {
    return {
      ...baseNone(),
      "dashboard.view": true,
      "deposits.view": true,
      "withdraws.view": true,
      "bills.view": true,
      "results.view": true,
      "customers.view": true,
      "reports.view": true,
      "staff.view": true,
      "settings.view": true,
    };
  }
  if (role === "manager") {
    return {
      ...baseAll(),
      // managers can't manage staff/settings by default
      "staff.create": false,
      "staff.update": false,
      "settings.update": false,
    };
  }
  // staff (default)
  return {
    ...baseNone(),
    "dashboard.view": true,
    "deposits.view": true,
    "deposits.approve": true,
    "deposits.reject": true,
    "withdraws.view": true,
    "withdraws.approve": true,
    "withdraws.reject": true,
    "bills.view": true,
    "bills.cancel": true,
    "bills.resend": true,
    "results.view": true,
    "results.settle": true,
    "customers.view": true,
    "customers.adjust_credit": false,
    "reports.view": true,
    "staff.view": false,
    "staff.create": false,
    "staff.update": false,
    "settings.view": true,
    "settings.update": false,
  };
}

export function mergeBackofficePermissions(
  role: BackofficeRole,
  dbJson: Record<string, unknown> | null,
): BackofficePermissions {
  const base = defaultBackofficePermissions(role);
  if (!dbJson || typeof dbJson !== "object") return base;
  const out = { ...base };
  for (const k of ALL_BACKOFFICE_PERMS) {
    const v = dbJson[k];
    if (typeof v === "boolean") out[k] = v;
  }
  return out;
}

export function backofficeCan(perms: Partial<Record<BackofficePermissionKey, boolean>>, key: BackofficePermissionKey) {
  return Boolean(perms?.[key]);
}

