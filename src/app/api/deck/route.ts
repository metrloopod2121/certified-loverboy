import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isAuthUser } from "@/lib/apiAuth";

export async function GET(request: Request) {
  const auth = requireAuth(request, ["OWNER", "PARTNER"]);
  if (!isAuthUser(auth)) return auth;

  const already = await prisma.swipe.findMany({
    where: { telegramUserId: auth.telegramId },
    select: { dateIdeaId: true },
  });
  const swipedIds = already.map((s) => s.dateIdeaId);

  const ideas = await prisma.dateIdea.findMany({
    where: {
      id: { notIn: swipedIds },
      ...(auth.role === "PARTNER" ? { inPartnerDeck: true } : {}),
    },
    include: { tags: { include: { tag: true } } },
    orderBy: { createdAt: "asc" },
  });

  const shaped = ideas.map((idea) =>
    auth.role === "PARTNER" && !idea.showPriceToPartner
      ? { ...idea, priceNote: null }
      : idea
  );

  return NextResponse.json(shaped);
}
