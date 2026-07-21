import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isAuthUser } from "@/lib/apiAuth";
import { resolveTagIds } from "@/lib/tags";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request, ["OWNER"]);
  if (!isAuthUser(auth)) return auth;

  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  for (const key of [
    "title",
    "address",
    "metro",
    "lat",
    "lng",
    "description",
    "swipeDescription",
    "priceNote",
  ]) {
    if (key in body) data[key] = body[key];
  }

  if (Array.isArray(body.tags)) {
    const tagIds = await resolveTagIds(body.tags);
    data.tags = {
      deleteMany: {},
      create: tagIds.map((tagId) => ({ tagId })),
    };
  }

  const idea = await prisma.dateIdea.update({
    where: { id },
    data,
    include: { tags: { include: { tag: true } } },
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
