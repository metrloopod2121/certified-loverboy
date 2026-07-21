import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isAuthUser } from "@/lib/apiAuth";
import { resolveTagIds } from "@/lib/tags";
import { withoutMetroTags } from "@/lib/metro";
import type { DateIdeaType, LocationInput } from "@/lib/types";

function parseIdeaType(value: unknown): DateIdeaType {
  return value === "FOOD" ? "FOOD" : "DATE";
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request, ["OWNER"]);
  if (!isAuthUser(auth)) return auth;

  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if ("type" in body) data.type = parseIdeaType(body.type);
  for (const key of ["title", "description", "swipeDescription", "priceNote"]) {
    if (key in body) data[key] = body[key];
  }

  const locations: LocationInput[] | null = Array.isArray(body.locations) ? body.locations : null;

  if (Array.isArray(body.tags)) {
    const existingLocations = locations
      ? locations
      : (await prisma.dateIdea.findUnique({ where: { id }, select: { locations: true } }))?.locations ?? [];
    const tagIds = await resolveTagIds(withoutMetroTags(body.tags, existingLocations.map((location) => location.metro)));
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

  const idea = await prisma.dateIdea.update({
    where: { id },
    data,
    include: { tags: { include: { tag: true } }, locations: true },
  });
  return NextResponse.json(idea);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request, ["OWNER"]);
  if (!isAuthUser(auth)) return auth;

  const { id } = await params;
  await prisma.dateIdea.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
