import { NextResponse } from "next/server";
import { requireAuth, isAuthUser } from "@/lib/apiAuth";
import { mintExportToken } from "@/lib/exportToken";
import { trackEvent } from "@/lib/analytics";

export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  const token = mintExportToken(auth.telegramId);
  if (!token) return NextResponse.json({ error: "Export unavailable" }, { status: 500 });
  await trackEvent("export_token_created", auth.telegramId, undefined, auth.user.username);
  return NextResponse.json({ token });
}
