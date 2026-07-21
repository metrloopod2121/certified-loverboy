import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isAuthUser } from "@/lib/apiAuth";
import { resolveTagIds } from "@/lib/tags";

export async function GET(request: Request) {
  const auth = requireAuth(request, ["OWNER"]);
  if (!isAuthUser(auth)) return auth;

  const ideas = await prisma.dateIdea.findMany({
    include: { tags: { include: { tag: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(ideas);
}

export async function POST(request: Request) {
  const auth = requireAuth(request, ["OWNER"]);
  if (!isAuthUser(auth)) return auth;

  const body = await request.json();
  const tagIds = await resolveTagIds(body.tags ?? []);

  const idea = await prisma.dateIdea.create({
    data: {
      title: body.title,
      address: body.address || null,
      metro: body.metro || null,
      lat: body.lat ?? null,
      lng: body.lng ?? null,
      description: body.description || null,
      swipeDescription: body.swipeDescription || null,
      priceNote: body.priceNote || null,
      inPartnerDeck: Boolean(body.inPartnerDeck),
      showPriceToPartner: Boolean(body.showPriceToPartner),
      tags: { create: tagIds.map((tagId) => ({ tagId })) },
    },
    include: { tags: { include: { tag: true } } },
  });
  return NextResponse.json(idea, { status: 201 });
}
