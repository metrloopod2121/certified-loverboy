import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isAuthUser } from "@/lib/apiAuth";
import { resolveTagIds } from "@/lib/tags";
import { withoutMetroTags } from "@/lib/metro";
import type { DateIdeaType, LocationInput } from "@/lib/types";

function parseIdeaType(value: unknown): DateIdeaType {
  return value === "FOOD" ? "FOOD" : "DATE";
}

export async function GET(request: Request) {
  const auth = requireAuth(request, ["OWNER", "PARTNER"]);
  if (!isAuthUser(auth)) return auth;

  const ideas = await prisma.dateIdea.findMany({
    include: { tags: { include: { tag: true } }, locations: true },
    orderBy: { createdAt: "desc" },
  });

  const shaped = ideas.map((idea) =>
    auth.role === "PARTNER"
      ? { ...idea, priceNote: null }
      : idea
  );
  return NextResponse.json(shaped);
}

export async function POST(request: Request) {
  const auth = requireAuth(request, ["OWNER"]);
  if (!isAuthUser(auth)) return auth;

  const body = await request.json();
  const locations: LocationInput[] = Array.isArray(body.locations) ? body.locations : [];
  const tagIds = await resolveTagIds(withoutMetroTags(body.tags ?? [], locations.map((location) => location.metro)));

  const idea = await prisma.dateIdea.create({
    data: {
      type: parseIdeaType(body.type),
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
    },
    include: { tags: { include: { tag: true } }, locations: true },
  });
  return NextResponse.json(idea, { status: 201 });
}
