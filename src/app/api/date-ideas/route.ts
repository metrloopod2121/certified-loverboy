import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isAuthUser } from "@/lib/apiAuth";
import { resolveTagIds } from "@/lib/tags";
import { withoutMetroTags } from "@/lib/metro";
import { seedDemoPlacesIfEmpty } from "@/lib/demoPlaces";
import { trackEvent } from "@/lib/analytics";
import { eventsFeatureEnabled } from "@/lib/eventsFeature";
import type { LocationInput, PlaceLinkInput } from "@/lib/types";

const KNOWN_CREATE_SOURCES = new Set(["manual", "file_import", "link_in_app"]);

function parseEventDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  await seedDemoPlacesIfEmpty(auth.telegramId);

  const ideas = await prisma.dateIdea.findMany({
    where: { telegramUserId: auth.telegramId },
    include: { tags: { include: { tag: true } }, locations: true, links: { orderBy: { position: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  await trackEvent("places_list_loaded", auth.telegramId, { count: ideas.length }, auth.user.username);

  return NextResponse.json(ideas);
}

export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  const body = await request.json();
  const locations: LocationInput[] = Array.isArray(body.locations) ? body.locations : [];
  const links: PlaceLinkInput[] = Array.isArray(body.links) ? body.links : [];
  const tagIds = await resolveTagIds(withoutMetroTags(body.tags ?? [], locations.map((location) => location.metro)));

  const eventsAllowed = eventsFeatureEnabled(auth.telegramId);

  const idea = await prisma.dateIdea.create({
    data: {
      telegramUserId: auth.telegramId,
      title: body.title,
      description: body.description || null,
      priceNote: body.priceNote || null,
      eventStartsAt: eventsAllowed ? parseEventDate(body.eventStartsAt) : null,
      eventEndsAt: eventsAllowed ? parseEventDate(body.eventEndsAt) : null,
      tags: { create: tagIds.map((tagId) => ({ tagId })) },
      locations: {
        create: locations.map((loc) => ({
          address: loc.address || null,
          metro: loc.metro || null,
          lat: loc.lat ?? null,
          lng: loc.lng ?? null,
          url: loc.url || null,
        })),
      },
      links: {
        create: links
          .filter((link) => link.url.trim())
          .map((link, position) => ({ label: link.label.trim() || null, url: link.url.trim(), position })),
      },
    },
    include: { tags: { include: { tag: true } }, locations: true, links: { orderBy: { position: "asc" } } },
  });

  const source = typeof body.source === "string" && KNOWN_CREATE_SOURCES.has(body.source) ? body.source : "manual";
  await trackEvent(
    "place_created",
    auth.telegramId,
    {
      source,
      placeId: idea.id,
      tagsCount: idea.tags.length,
      locationsCount: idea.locations.length,
      linksCount: idea.links.length,
      hasEvent: idea.eventStartsAt != null,
    },
    auth.user.username
  );

  return NextResponse.json(idea, { status: 201 });
}
