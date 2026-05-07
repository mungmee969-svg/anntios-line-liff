import { cookies } from "next/headers";
import { BACKOFFICE_COOKIE_NAME, verifyBackofficeJwt, type BackofficeJwtPayload } from "@/src/lib/backoffice-auth";

export async function getBackofficeSession(): Promise<BackofficeJwtPayload | null> {
  const store = await cookies();
  const token = store.get(BACKOFFICE_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return verifyBackofficeJwt(token);
  } catch {
    return null;
  }
}

