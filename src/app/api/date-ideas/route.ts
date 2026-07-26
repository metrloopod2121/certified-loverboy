import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isAuthUser } from "@/lib/apiAuth";
import { resolveTagIds } from "@/lib/tags";
import { withoutMetroTags } from "@/lib/metro";
import { seedDemoPlacesIfEmpty } from "@/lib/demoPlaces";
import { trackEvent } from "@/lib/analytics";
import type { LocationInput, PlaceLinkInput } from "@/lib/types";

const KNOWN_CREATE_SOURCES = new Set(["manual", "file_import", "link_in_app"]);

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  await seedDemoPlacesIfEmpty(auth.telegramId);

  const ideas = await prisma.dateIdea.findMany({
    where: { telegramUserId: auth.telegramId },
    include: { tags: { include: { tag: true } }, locations: true, links: { orderBy: { position: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(ideas);
}

export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  const body = await request.json();
  const locations: LocationInput[] = Array.isArray(body.locations) ? body.locations : [];
  const links: PlaceLinkInput[] = Array.isArray(body.links) ? body.links : [];
  const tagIds = await resolveTagIds(withoutMetroTags(body.tags ?? [], locations.map((location) => location.metro)));

  const idea = await prisma.dateIdea.create({
    data: {
      telegramUserId: auth.telegramId,
      title: body.title,
      description: body.description || null,
      swipeDescription: body.swipeDescription || null,
      priceNote: body.priceNote || null,
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
  await trackEvent("place_created", auth.telegramId, { source });

  return NextResponse.json(idea, { status: 201 });
}
