import { NextResponse } from "next/server";
import { requireAuth, isAuthUser } from "@/lib/apiAuth";
import { submitSupportMessage } from "@/lib/support";
import { trackEvent } from "@/lib/analytics";

/** In-app counterpart to the bot's /support command -- same durable log + admin forward,
 *  just reachable from the Profile tab instead of typing a command in the chat. */
export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  const body = await request.json();
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const username = auth.user.username ? `@${auth.user.username}` : null;
  await submitSupportMessage(auth.telegramId, username, text);
  await trackEvent(
    "support_submitted",
    auth.telegramId,
    { surface: "app", username: username ?? null, textLength: text.length },
    auth.user.username
  );

  return NextResponse.json({ ok: true });
}
