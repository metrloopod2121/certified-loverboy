import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isAuthUser } from "@/lib/apiAuth";
import { resolveTagIds } from "@/lib/tags";
import { normalizeMetroValue, withoutMetroTags } from "@/lib/metro";
import { trackEvent } from "@/lib/analytics";
import { eventsFeatureEnabled } from "@/lib/eventsFeature";
import type { LocationInput, PlaceLinkInput } from "@/lib/types";

function parseEventDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sameInstant(a: Date | null, b: Date | null): boolean {
  return (a?.getTime() ?? null) === (b?.getTime() ?? null);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  const { id } = await params;
  const idea = await prisma.dateIdea.findUnique({
    where: { id },
    include: { tags: { include: { tag: true } }, locations: true, links: { orderBy: { position: "asc" } } },
  });
  if (!idea || idea.telegramUserId !== auth.telegramId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await trackEvent("place_viewed", auth.telegramId, { placeId: id }, auth.user.username);

  return NextResponse.json(idea);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  const { id } = await params;
  const existing = await prisma.dateIdea.findUnique({
    where: { id },
    select: { telegramUserId: true, locations: true, reminderAt: true },
  });
  if (!existing || existing.telegramUserId !== auth.telegramId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();

  const data: Record<string, unknown> = {};
  for (const key of ["title", "description", "priceNote"]) {
    if (key in body) data[key] = body[key];
  }

  if (eventsFeatureEnabled(auth.telegramId)) {
    if ("eventStartsAt" in body) data.eventStartsAt = parseEventDate(body.eventStartsAt);
    if ("eventEndsAt" in body) data.eventEndsAt = parseEventDate(body.eventEndsAt);
    if ("reminderAt" in body) {
      const reminderAt = parseEventDate(body.reminderAt);
      data.reminderAt = reminderAt;
      if (!sameInstant(reminderAt, existing.reminderAt)) data.reminderSentAt = null;
    } else if ("eventStartsAt" in body && data.eventStartsAt === null) {
      data.reminderAt = null;
      data.reminderSentAt = null;
    }
  }

  const locations: LocationInput[] | null = Array.isArray(body.locations)
    ? body.locations.map((loc: LocationInput) => ({ ...loc, metro: normalizeMetroValue(loc.metro) }))
    : null;

  if (Array.isArray(body.tags)) {
    const metroSource = locations ?? existing.locations;
    const tagIds = await resolveTagIds(withoutMetroTags(body.tags, metroSource.map((location) => location.metro)));
    data.tags = {
      deleteMany: {},
      create: tagIds.map((tagId) => ({ tagId })),
    };
  }

  if (locations) {
    data.locations = {
      deleteMany: {},
      create: locations.map((loc) => ({
        address: loc.address || null,
        metro: loc.metro || null,
        lat: loc.lat ?? null,
        lng: loc.lng ?? null,
        url: loc.url || null,
      })),
    };
  }

  if (Array.isArray(body.links)) {
    const links: PlaceLinkInput[] = body.links;
    data.links = {
      deleteMany: {},
      create: links
        .filter((link) => link.url.trim())
        .map((link, position) => ({ label: link.label.trim() || null, url: link.url.trim(), position })),
    };
  }

  const idea = await prisma.dateIdea.update({
    where: { id },
    data,
    include: { tags: { include: { tag: true } }, locations: true, links: { orderBy: { position: "asc" } } },
  });
  await trackEvent(
    "place_updated",
    auth.telegramId,
    {
      placeId: id,
      changedFields: [
        ...["title", "description", "priceNote"].filter((key) => key in body),
        ...(Array.isArray(body.tags) ? ["tags"] : []),
        ...(locations ? ["locations"] : []),
        ...(Array.isArray(body.links) ? ["links"] : []),
        ...(["eventStartsAt", "eventEndsAt"].some((key) => key in data) ? ["event"] : []),
        ...("reminderAt" in data ? ["reminder"] : []),
      ],
      tagsCount: idea.tags.length,
      locationsCount: idea.locations.length,
      linksCount: idea.links.length,
      hasEvent: idea.eventStartsAt != null,
      hasReminder: idea.reminderAt != null,
    },
    auth.user.username
  );
  return NextResponse.json(idea);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  const { id } = await params;
  const existing = await prisma.dateIdea.findUnique({ where: { id }, select: { telegramUserId: true } });
  if (!existing || existing.telegramUserId !== auth.telegramId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.dateIdea.delete({ where: { id } });
  await trackEvent("place_deleted", auth.telegramId, { placeId: id }, auth.user.username);
  return NextResponse.json({ ok: true });
}
