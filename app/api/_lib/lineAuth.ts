import type { NextRequest } from "next/server";

export type LineUser = {
  userId: string;
  displayName: string | null;
};

function getBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

export async function verifyLiffIdToken(req: NextRequest): Promise<LineUser> {
  const idToken = getBearerToken(req);
  if (!idToken) throw new Error("Missing Authorization Bearer token (LIFF id_token)");

  const channelId = process.env.LINE_CHANNEL_ID;
  if (!channelId) throw new Error("Missing env LINE_CHANNEL_ID");

  // Verify via LINE OAuth verify endpoint
  // https://developers.line.biz/en/docs/line-login/verify-id-token/
  const body = new URLSearchParams();
  body.set("id_token", idToken);
  body.set("client_id", channelId);

  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LINE verify failed (${res.status}): ${text || res.statusText}`);
  }

  const json = (await res.json()) as {
    sub?: string;
    name?: string;
  };

  const userId = json.sub?.trim();
  if (!userId) throw new Error("LINE verify: missing sub (userId)");

  return { userId, displayName: json.name?.trim() || null };
}

