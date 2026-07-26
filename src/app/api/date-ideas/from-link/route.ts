import { NextResponse } from "next/server";
import { requireAuth, isAuthUser } from "@/lib/apiAuth";
import { tryConsumeImportQuota, quotaExhaustedMessage } from "@/lib/importQuota";
import { findYandexMapsLink, parseYandexMapsLink, type ParsedFromLink } from "@/lib/socialImport";
import { trackEvent } from "@/lib/analytics";
import type { ParsedDateIdea } from "@/lib/parseDateMarkdown";

function urlHost(raw: string): string | null {
  try {
    return new URL(raw).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Shapes a Yandex Maps parse result into the same draft shape the markdown importer
 *  produces, so the Mini App can review/save it through the existing DateIdeaForm flow. */
function toDraft(parsed: ParsedFromLink, sourceUrl: string): ParsedDateIdea {
  return {
    title: parsed.title,
    description: parsed.description ?? "",
    priceNote: parsed.priceNote ?? "",
    tags: parsed.tags,
    locations: [
      {
        address: parsed.address ?? "",
        metro: parsed.metro ?? "",
        lat: parsed.lat,
        lng: parsed.lng,
        url: parsed.mapUrl ?? sourceUrl,
      },
    ],
    links: parsed.links.map((link) => ({ label: link.label ?? "", url: link.url })),
  };
}

/** In-app counterpart to the bot's link import — same Yandex-only scope for now, and shares
 *  the same per-user ImportQuota so one free-tier limit covers both surfaces. */
export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  const body = await request.json();
  const raw = typeof body?.url === "string" ? body.url.trim() : "";
  if (!raw) {
    await trackEvent("link_import_failed", auth.telegramId, { surface: "app", reason: "empty" });
    return NextResponse.json({ error: "Link is required" }, { status: 400 });
  }

  await trackEvent("link_import_started", auth.telegramId, {
    surface: "app",
    rawLength: raw.length,
    host: urlHost(raw),
  });

  const url = findYandexMapsLink(raw);
  if (!url) {
    await trackEvent("link_import_failed", auth.telegramId, {
      surface: "app",
      reason: "unsupported_link",
      rawLength: raw.length,
      host: urlHost(raw),
    });
    return NextResponse.json({ error: "Only Yandex Maps links are supported right now" }, { status: 400 });
  }

  const quota = await tryConsumeImportQuota(auth.telegramId);
  if (!quota.ok) {
    await trackEvent("link_import_failed", auth.telegramId, { surface: "app", reason: "quota_exhausted", host: urlHost(url) });
    return NextResponse.json({ error: quotaExhaustedMessage() }, { status: 429 });
  }

  const parsed = await parseYandexMapsLink(url);
  if (!parsed) {
    await trackEvent("link_import_failed", auth.telegramId, { surface: "app", reason: "parse_failed", host: urlHost(url) });
    return NextResponse.json({ error: "Couldn't parse this link. Try another one or add it manually." }, { status: 422 });
  }

  await trackEvent("link_import_parsed", auth.telegramId, {
    surface: "app",
    host: urlHost(url),
    tagsCount: parsed.tags.length,
    linksCount: parsed.links.length,
    hasCoordinates: parsed.lat != null && parsed.lng != null,
    remaining: quota.remaining,
  });

  return NextResponse.json(toDraft(parsed, url));
}
