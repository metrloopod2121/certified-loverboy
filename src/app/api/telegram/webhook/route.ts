import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveTagIds } from "@/lib/tags";
import { withoutMetroTags } from "@/lib/metro";
import {
  forwardTelegramMessage,
  sendTelegramMessage,
  sendTelegramMessageWithButtons,
  editTelegramMessageText,
  answerCallbackQuery,
} from "@/lib/telegram";
import { findYandexMapsLink, parseYandexMapsLink, formatIdeaPreview, type ParsedFromLink } from "@/lib/socialImport";

type TelegramMessage = {
  message_id: number;
  chat: { id: number };
  from?: { id: number };
  text?: string;
};

type TelegramCallbackQuery = {
  id: string;
  data?: string;
  from: { id: number };
  message?: { message_id: number; chat: { id: number } };
};

type TelegramUpdate = {
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

async function handleOwnerLink(message: TelegramMessage) {
  const url = findYandexMapsLink(message.text ?? "");
  if (!url) return;

  const chatId = String(message.chat.id);
  await sendTelegramMessage(chatId, "Смотрю ссылку, секунду…");

  const parsed = await parseYandexMapsLink(url);
  if (!parsed) {
    await sendTelegramMessage(chatId, "Не смог разобрать эту ссылку. Попробуй другую или добавь вручную в приложении.");
    return;
  }

  const pending = await prisma.pendingImport.create({
    data: { chatId, sourceUrl: url, payload: JSON.stringify(parsed) },
  });

  await sendTelegramMessageWithButtons(chatId, formatIdeaPreview(parsed), [
    { text: "✅ Да", callback_data: `pi:approve:${pending.id}` },
    { text: "❌ Нет", callback_data: `pi:reject:${pending.id}` },
  ]);
}

async function handleCallbackQuery(callbackQuery: TelegramCallbackQuery, ownerId: string) {
  const data = callbackQuery.data ?? "";
  const match = data.match(/^pi:(approve|reject):(.+)$/);
  if (!match || String(callbackQuery.from.id) !== ownerId) {
    await answerCallbackQuery(callbackQuery.id);
    return;
  }

  const [, action, pendingId] = match;
  const pending = await prisma.pendingImport.findUnique({ where: { id: pendingId } });
  if (!pending) {
    await answerCallbackQuery(callbackQuery.id, "Уже обработано или устарело");
    return;
  }

  const chatId = callbackQuery.message?.chat.id;
  const messageId = callbackQuery.message?.message_id;

  if (action === "reject") {
    await prisma.pendingImport.delete({ where: { id: pendingId } });
    await answerCallbackQuery(callbackQuery.id, "Отменено");
    if (chatId && messageId) await editTelegramMessageText(String(chatId), messageId, "❌ Отменено.");
    return;
  }

  const idea = JSON.parse(pending.payload) as ParsedFromLink;
  const tagIds = await resolveTagIds(withoutMetroTags(idea.tags, [idea.metro]));

  await prisma.dateIdea.create({
    data: {
      title: idea.title,
      description: idea.description,
      priceNote: idea.priceNote,
      tags: { create: tagIds.map((tagId) => ({ tagId })) },
      locations: {
        create: [
          {
            address: idea.address,
            metro: idea.metro,
            lat: idea.lat,
            lng: idea.lng,
            url: pending.sourceUrl,
          },
        ],
      },
    },
  });

  await prisma.pendingImport.delete({ where: { id: pendingId } });
  await answerCallbackQuery(callbackQuery.id, "Добавлено");
  if (chatId && messageId) await editTelegramMessageText(String(chatId), messageId, `✅ Добавлено: ${idea.title}`);
}

/** Receives Telegram updates: forwards partner messages to the owner, and lets the owner
 *  drop a Yandex Maps link straight in chat to parse + approve it into the database. */
export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update = (await request.json()) as TelegramUpdate;
  const ownerId = process.env.OWNER_TG_ID;
  const partnerId = process.env.PARTNER_TG_ID;

  if (!ownerId || !partnerId) return NextResponse.json({ ok: true });

  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query, ownerId);
    return NextResponse.json({ ok: true });
  }

  const message = update.message;
  if (!message) return NextResponse.json({ ok: true });

  if (String(message.from?.id) === partnerId) {
    await forwardTelegramMessage(ownerId, String(message.chat.id), message.message_id);
    return NextResponse.json({ ok: true });
  }

  if (String(message.from?.id) === ownerId) {
    await handleOwnerLink(message);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
