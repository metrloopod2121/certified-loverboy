import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isAuthUser } from "@/lib/apiAuth";

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

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

  return NextResponse.json(shuffle(shaped));
}
