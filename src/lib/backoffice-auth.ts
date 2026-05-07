import jwt from "jsonwebtoken";
import type { BackofficePermissions, BackofficeRole } from "@/src/lib/backoffice-permissions";

export type BackofficeSessionUser = {
  id: string;
  username: string;
  displayName: string | null;
  role: BackofficeRole;
  permissions: BackofficePermissions;
  isActive: boolean;
};

export type BackofficeJwtPayload = {
  sub: string;
  username: string;
  role: BackofficeRole;
  permissions: BackofficePermissions;
  displayName: string | null;
};

export const BACKOFFICE_COOKIE_NAME = "backoffice_session";
export const BACKOFFICE_SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

export function requireJwtSecret(): string {
  const s = process.env.BACKOFFICE_JWT_SECRET;
  if (!s || s.trim().length < 32) {
    throw new Error("Missing env BACKOFFICE_JWT_SECRET (>= 32 chars)");
  }
  return s;
}

export function signBackofficeJwt(payload: BackofficeJwtPayload): string {
  const secret = requireJwtSecret();
  return jwt.sign(payload, secret, {
    algorithm: "HS256",
    expiresIn: BACKOFFICE_SESSION_MAX_AGE_SEC,
  });
}

export function verifyBackofficeJwt(token: string): BackofficeJwtPayload {
  const secret = requireJwtSecret();
  const decoded = jwt.verify(token, secret) as unknown;
  return decoded as BackofficeJwtPayload;
}

