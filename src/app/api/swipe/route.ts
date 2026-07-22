import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isAuthUser } from "@/lib/apiAuth";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(request: Request) {
  const auth = requireAuth(request, ["OWNER", "PARTNER"]);
  if (!isAuthUser(auth)) return auth;

  const body = await request.json();
  const { dateIdeaId, direction } = body as { dateIdeaId: string; direction: "LIKE" | "PASS" };
  if (!dateIdeaId || (direction !== "LIKE" && direction !== "PASS")) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  await prisma.swipe.upsert({
    where: { telegramUserId_dateIdeaId: { telegramUserId: auth.telegramId, dateIdeaId } },
    update: { direction },
    create: { telegramUserId: auth.telegramId, dateIdeaId, direction },
  });

  if (direction === "LIKE") {
    await checkForMatch(dateIdeaId);
  }

  return NextResponse.json({ ok: true });
}

async function checkForMatch(dateIdeaId: string) {
  const ownerId = process.env.OWNER_TG_ID;
  const partnerId = process.env.PARTNER_TG_ID;
  if (!ownerId || !partnerId) return;

  const [ownerSwipe, partnerSwipe] = await Promise.all([
    prisma.swipe.findUnique({
      where: { telegramUserId_dateIdeaId: { telegramUserId: ownerId, dateIdeaId } },
    }),
    prisma.swipe.findUnique({
      where: { telegramUserId_dateIdeaId: { telegramUserId: partnerId, dateIdeaId } },
    }),
  ]);

  if (ownerSwipe?.direction !== "LIKE" || partnerSwipe?.direction !== "LIKE") return;

  const existing = await prisma.match.findUnique({ where: { dateIdeaId } });
  if (existing?.notified) return;

  const idea = await prisma.dateIdea.findUnique({ where: { id: dateIdeaId } });
  if (!idea) return;

  await prisma.match.upsert({
    where: { dateIdeaId },
    update: {},
    create: { dateIdeaId },
  });

  await Promise.all([
    sendTelegramMessage(ownerId, `🎉 Match: ${idea.title}`),
    sendTelegramMessage(partnerId, `🎉 Match: ${idea.title}`),
  ]);

  await prisma.match.update({ where: { dateIdeaId }, data: { notified: true } });
}
