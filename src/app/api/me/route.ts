import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/telegramAuth";
import { eventsFeatureEnabled } from "@/lib/eventsFeature";

export async function GET(request: Request) {
  const auth = authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    telegramId: auth.telegramId,
    features: { events: eventsFeatureEnabled(auth.telegramId) },
  });
}
