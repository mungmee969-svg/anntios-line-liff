import liff from "@line/liff";

const LIFF_FALLBACK_ID = "2009989826-L6OPDoa5";

let initPromise: Promise<void> | null = null;

export function getLiffId(): string {
  const id = process.env.NEXT_PUBLIC_LIFF_ID;
  return id && id.trim().length > 0 ? id.trim() : LIFF_FALLBACK_ID;
}

/** LINE / LIFF related keys — avoid wiping unrelated localStorage. */
export function clearLineAuthStorage(): void {
  if (typeof window === "undefined") return;

  const matchKey = (k: string) =>
    /liff|^LIFF|@line|line.?login|line.?credential|openid/i.test(k);

  const collect = (store: Storage) => {
    const keys: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (k && matchKey(k)) keys.push(k);
    }
    keys.forEach((k) => store.removeItem(k));
  };

  try {
    collect(window.localStorage);
    collect(window.sessionStorage);
  } catch {
    /* ignore storage errors */
  }
}

export async function forceLiffRelogin(): Promise<void> {
  clearLineAuthStorage();
  await ensureLiffReady();
  try {
    if (liff.isLoggedIn()) {
      await Promise.resolve(liff.logout());
    }
  } catch {
    /* ignore */
  }
  loginKeepingPath();
}

export async function ensureLiffReady(): Promise<void> {
  const liffId = getLiffId();
  if (!initPromise) {
    initPromise = liff.init({ liffId });
  }
  await initPromise;
}

/**
 * Login and keep current path (staff/admin safe).
 * LIFF defaults can drop pathname → ends up at `/`.
 */
export function loginKeepingPath(): void {
  if (typeof window === "undefined") {
    // No-op on server
    return;
  }
  const redirectUri = window.location.href;
  liff.login({ redirectUri });
}

/**
 * Fresh id token — always await; do not store on the client.
 * LIFF 2.x exposes sync `getIDToken()`; wrap for a stable async API.
 */
export async function getFreshIdToken(): Promise<string> {
  await ensureLiffReady();
  if (!liff.isLoggedIn()) {
    throw new Error("NOT_LOGGED_IN");
  }
  const raw = await Promise.resolve(liff.getIDToken?.());
  const token =
    typeof raw === "string" ? raw.trim() : raw != null ? String(raw).trim() : "";
  if (!token) {
    throw new Error("NO_ID_TOKEN");
  }
  return token;
}

export function isLikelyExpiredIdTokenError(status: number, body: string): boolean {
  const b = body.toLowerCase();
  if (status === 401) return true;
  if (b.includes("idtoken expired") || b.includes("id token expired")) return true;
  if (b.includes("idtoken") && b.includes("expired")) return true;
  if (b.includes("invalid_token") && b.includes("expired")) return true;
  return false;
}

export async function liffAuthedFetch(
  input: RequestInfo,
  init: RequestInit = {},
): Promise<Response> {
  await ensureLiffReady();

  if (!liff.isLoggedIn()) {
    loginKeepingPath();
    return new Response(JSON.stringify({ error: "LOGIN_REQUIRED" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const token = await getFreshIdToken();
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);

  const res = await fetch(input, { ...init, headers });
  let body = "";
  try {
    body = await res.clone().text();
  } catch {
    body = "";
  }

  if (!res.ok && isLikelyExpiredIdTokenError(res.status, body)) {
    await forceLiffRelogin();
  }

  return res;
}
