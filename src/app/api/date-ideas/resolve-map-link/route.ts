import { NextResponse } from "next/server";
import { requireAuth, isAuthUser } from "@/lib/apiAuth";
import { isYandexMapsUrl } from "@/lib/coords";
import { resolveYandexMapsCoordinates } from "@/lib/socialImport";

/** Lightweight coordinate lookup for the place form's "Get location from link" button -- no AI
 *  call and no import quota (unlike /api/date-ideas/from-link), just fetches the Yandex Maps
 *  page and reads its embedded pin. Auth-gated so this doesn't become an open URL-fetch proxy. */
export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  const body = await request.json();
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url || !isYandexMapsUrl(url)) {
    return NextResponse.json({ error: "A Yandex Maps link is required" }, { status: 400 });
  }

  const coords = await resolveYandexMapsCoordinates(url);
  return NextResponse.json({ lat: coords?.lat ?? null, lng: coords?.lng ?? null });
}
