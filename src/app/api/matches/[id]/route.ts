import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isAuthUser } from "@/lib/apiAuth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request, ["OWNER", "PARTNER"]);
  if (!isAuthUser(auth)) return auth;

  const body = await request.json();
  if (typeof body.isFavorite !== "boolean") {
    return NextResponse.json({ error: "isFavorite must be a boolean" }, { status: 400 });
  }

  const { id } = await params;
  const match = await prisma.match.update({
    where: { id },
    data: { isFavorite: body.isFavorite },
    select: { id: true, isFavorite: true },
  });

  return NextResponse.json(match);
}

/** Unmatches: removes the Match and both sides' Swipe rows for its idea, so it's no longer
 *  "already swiped" and reappears in the deck for both owner and partner. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request, ["OWNER", "PARTNER"]);
  if (!isAuthUser(auth)) return auth;

  const { id } = await params;
  const match = await prisma.match.findUnique({ where: { id }, select: { dateIdeaId: true } });
  if (!match) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const telegramIds = [process.env.OWNER_TG_ID, process.env.PARTNER_TG_ID].filter(
    (value): value is string => Boolean(value)
  );

  await prisma.$transaction([
    prisma.match.delete({ where: { id } }),
    prisma.swipe.deleteMany({
      where: { dateIdeaId: match.dateIdeaId, telegramUserId: { in: telegramIds } },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
