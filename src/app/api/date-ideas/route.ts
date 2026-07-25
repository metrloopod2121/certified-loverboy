import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isAuthUser } from "@/lib/apiAuth";
import { resolveTagIds } from "@/lib/tags";
import { withoutMetroTags } from "@/lib/metro";
import type { LocationInput } from "@/lib/types";

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  const ideas = await prisma.dateIdea.findMany({
    where: { telegramUserId: auth.telegramId },
    include: { tags: { include: { tag: true } }, locations: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(ideas);
}

export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  const body = await request.json();
  const locations: LocationInput[] = Array.isArray(body.locations) ? body.locations : [];
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
    },
    include: { tags: { include: { tag: true } }, locations: true },
  });
  return NextResponse.json(idea, { status: 201 });
}
