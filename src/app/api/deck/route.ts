import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isAuthUser } from "@/lib/apiAuth";
import type { DateIdeaType } from "@/lib/types";

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
  const requestedType = new URL(request.url).searchParams.get("type");
  const type: DateIdeaType | undefined = requestedType === "DATE" || requestedType === "FOOD"
    ? requestedType
    : undefined;

  const ideas = await prisma.dateIdea.findMany({
    where: { id: { notIn: swipedIds }, ...(type ? { type } : {}) },
    include: { tags: { include: { tag: true } }, locations: true },
    orderBy: { createdAt: "asc" },
  });

  const shaped = ideas.map((idea) =>
    auth.role === "PARTNER" ? { ...idea, priceNote: null } : idea
  );

  return NextResponse.json(shuffle(shaped));
}
