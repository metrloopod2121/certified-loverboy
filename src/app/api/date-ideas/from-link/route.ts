import { NextResponse } from "next/server";
import { requireAuth, isAuthUser } from "@/lib/apiAuth";
import { tryConsumeImportQuota, quotaExhaustedMessage } from "@/lib/importQuota";
import {
  findYandexMapsLink,
  findInstagramLink,
  findTelegramPostLink,
  parseYandexMapsLink,
  parseInstagramLink,
  parsePostTextMulti,
  fetchTelegramPostText,
  appendPlaceLink,
  type ParsedFromLink,
  type ParsedPlaceLink,
} from "@/lib/socialImport";
import { instagramImportAllowed } from "@/lib/instagramFeature";
import { eventsFeatureEnabled } from "@/lib/eventsFeature";
import { getUserLanguage } from "@/lib/userSettings";
import { t } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";
import type { DateIdeaInput } from "@/lib/types";

function urlHost(raw: string): string | null {
  try {
    return new URL(raw).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function sourcePlaceLink(kind: LinkKind, url: string): ParsedPlaceLink | null {
  if (kind === "telegram") return { label: "Telegram", url };
  if (kind === "instagram") return { label: "Instagram", url };
  return null;
}

/** Shapes a parsed place into the draft shape the Mini App's review sheet / DateIdeaForm expect. */
function toDraft(parsed: ParsedFromLink, sourceUrl: string, kind: LinkKind): DateIdeaInput {
  const links = appendPlaceLink(parsed.links, sourcePlaceLink(kind, sourceUrl));
  return {
    title: parsed.title,
    description: parsed.description ?? "",
    priceNote: parsed.priceNote ?? "",
    eventStartsAt: parsed.eventStartsAt,
    eventEndsAt: parsed.eventEndsAt,
    reminderAt: null,
    tags: parsed.tags,
    locations: [
      {
        address: parsed.address ?? "",
        metro: parsed.metro ?? "",
        lat: parsed.lat,
        lng: parsed.lng,
        url: parsed.mapUrl ?? (kind === "yandex" ? sourceUrl : ""),
      },
    ],
    links: links.map((link) => ({ label: link.label ?? "", url: link.url })),
  };
}

type LinkKind = "yandex" | "instagram" | "telegram";

/** Same three sources the bot recognizes, checked in the same priority order (a bare Yandex/
 *  Instagram/Telegram link never collides with another kind in the same text). */
function detectLinkKind(raw: string): { kind: LinkKind; url: string } | null {
  const yandex = findYandexMapsLink(raw);
  if (yandex) return { kind: "yandex", url: yandex };
  const instagram = findInstagramLink(raw);
  if (instagram) return { kind: "instagram", url: instagram };
  const telegram = findTelegramPostLink(raw);
  if (telegram) return { kind: "telegram", url: telegram };
  return null;
}

/** In-app counterpart to the bot's link import -- same three sources (Yandex Maps, Instagram
 *  reel/post, Telegram post) and the same per-user ImportQuota, so one free-tier limit covers
 *  both surfaces. Instagram stays behind the same pilot gate as the bot. Returns every place
 *  found -- a Telegram post or Instagram reel can mention several venues, a Yandex link always
 *  exactly one. */
export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  const lang = await getUserLanguage(auth.telegramId);
  const body = await request.json();
  const raw = typeof body?.url === "string" ? body.url.trim() : "";
  if (!raw) {
    await trackEvent("link_import_failed", auth.telegramId, { surface: "app", reason: "empty" }, auth.user.username);
    return NextResponse.json({ error: "Link is required" }, { status: 400 });
  }

  await trackEvent(
    "link_import_started",
    auth.telegramId,
    { surface: "app", rawLength: raw.length, host: urlHost(raw) },
    auth.user.username
  );

  const detected = detectLinkKind(raw);
  if (!detected) {
    await trackEvent(
      "link_import_failed",
      auth.telegramId,
      { surface: "app", reason: "unsupported_link", rawLength: raw.length, host: urlHost(raw) },
      auth.user.username
    );
    return NextResponse.json({ error: t(lang, "unsupportedLinkError") }, { status: 400 });
  }
  const { kind, url } = detected;

  if (kind === "instagram" && !instagramImportAllowed(auth.telegramId)) {
    await trackEvent(
      "instagram_import_gated",
      auth.telegramId,
      { surface: "app", host: urlHost(url) },
      auth.user.username
    );
    return NextResponse.json({ error: t(lang, "instagramImportUnavailable") }, { status: 403 });
  }

  const quota = await tryConsumeImportQuota(auth.telegramId);
  if (!quota.ok) {
    await trackEvent(
      "link_import_failed",
      auth.telegramId,
      { surface: "app", reason: "quota_exhausted", host: urlHost(url), kind },
      auth.user.username
    );
    return NextResponse.json({ error: quotaExhaustedMessage(lang) }, { status: 429 });
  }

  const includeEvents = eventsFeatureEnabled(auth.telegramId);
  let drafts: ParsedFromLink[];
  if (kind === "yandex") {
    const parsed = await parseYandexMapsLink(url);
    drafts = parsed ? [parsed] : [];
  } else if (kind === "instagram") {
    drafts = await parseInstagramLink(url, includeEvents);
  } else {
    const postText = await fetchTelegramPostText(url);
    drafts = postText ? await parsePostTextMulti(postText, includeEvents) : [];
  }

  if (drafts.length === 0) {
    await trackEvent(
      "link_import_failed",
      auth.telegramId,
      { surface: "app", reason: "parse_failed", host: urlHost(url), kind },
      auth.user.username
    );
    return NextResponse.json({ error: t(lang, "couldntParseLink") }, { status: 422 });
  }

  await trackEvent(
    "link_import_parsed",
    auth.telegramId,
    {
      surface: "app",
      host: urlHost(url),
      kind,
      draftsCount: drafts.length,
      tagsCount: drafts.reduce((sum, d) => sum + d.tags.length, 0),
      hasCoordinates: drafts.some((d) => d.lat != null && d.lng != null),
      remaining: quota.remaining,
    },
    auth.user.username
  );

  return NextResponse.json({ items: drafts.map((parsed) => toDraft(parsed, url, kind)) });
}
