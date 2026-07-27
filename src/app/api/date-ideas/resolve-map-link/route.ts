import { NextResponse } from "next/server";
import { requireAuth, isAuthUser } from "@/lib/apiAuth";
import { tryConsumeImportQuota, quotaExhaustedMessage } from "@/lib/importQuota";
import { isYandexMapsUrl } from "@/lib/coords";
import { parseYandexMapsLink } from "@/lib/socialImport";
import { trackEvent } from "@/lib/analytics";

/** Backs the place form's "Get location from link" button for the case a bare local URL-parse
 *  can't find coordinates -- the common case for a .../org/<slug>/<id>?si=... share link, which
 *  has none in its own query params. Runs the same AI extraction as the full link importer
 *  (parseYandexMapsLink) so address/metro come back too, not just coordinates -- and shares that
 *  import's quota, since it's the same underlying Cloudflare/Brave usage. */
export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  const body = await request.json();
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url || !isYandexMapsUrl(url)) {
    return NextResponse.json({ error: "A Yandex Maps link is required" }, { status: 400 });
  }

  const quota = await tryConsumeImportQuota(auth.telegramId);
  if (!quota.ok) {
    await trackEvent(
      "place_form_link_resolve_failed",
      auth.telegramId,
      { reason: "quota_exhausted" },
      auth.user.username
    );
    return NextResponse.json({ error: quotaExhaustedMessage() }, { status: 429 });
  }

  const parsed = await parseYandexMapsLink(url);
  await trackEvent(
    "place_form_link_resolved",
    auth.telegramId,
    {
      found: Boolean(parsed),
      hasCoordinates: Boolean(parsed?.lat != null && parsed?.lng != null),
      hasAddress: Boolean(parsed?.address),
      hasMetro: Boolean(parsed?.metro),
      remaining: quota.remaining,
    },
    auth.user.username
  );

  if (!parsed) {
    return NextResponse.json({ lat: null, lng: null, address: null, metro: null });
  }
  return NextResponse.json({ lat: parsed.lat, lng: parsed.lng, address: parsed.address, metro: parsed.metro });
}
