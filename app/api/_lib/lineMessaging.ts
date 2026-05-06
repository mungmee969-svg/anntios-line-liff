export async function pushLineTextSafe(params: { to: string; text: string }) {
  try {
    await pushLineText(params);
  } catch (e) {
    console.error("[LINE push]", e);
  }
}

export async function pushLineText(params: { to: string; text: string }) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("Missing env LINE_CHANNEL_ACCESS_TOKEN");

  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: params.to,
      messages: [{ type: "text", text: params.text }],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LINE push failed (${res.status}): ${text || res.statusText}`);
  }
}

