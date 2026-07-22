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
import {
  findYandexMapsLink,
  parseYandexMapsLink,
  parsePostText,
  formatIdeaPreview,
  type ParsedFromLink,
} from "@/lib/socialImport";

type TelegramForwardChat = { type: string; username?: string };

type TelegramMessage = {
  message_id: number;
  chat: { id: number };
  from?: { id: number };
  text?: string;
  caption?: string;
  // Present when this message is one photo/video out of a multi-photo post. Telegram delivers
  // an album as separate messages (one webhook call each) and puts the caption on only one of
  // them — the rest arrive with no text at all.
  media_group_id?: string;
  // Bot API 7.0+ shape. Older field (forward_from_chat) kept alongside for servers still on
  // an earlier Bot API version — both are checked.
  forward_origin?: { type: string; chat?: TelegramForwardChat; message_id?: number };
  forward_from_chat?: TelegramForwardChat;
};

/** Minimum length before a plain (non-forwarded) owner text message is treated as a pasted
 *  post — guards against accidental LLM calls on short one-off chat messages. */
const PASTED_POST_MIN_LENGTH = 40;

/** Only channel posts count as "posts" for this flow — forwarded messages from a group or a
 *  person are left alone. */
function forwardedChannelSourceUrl(message: TelegramMessage): string {
  const chat = message.forward_origin?.chat ?? message.forward_from_chat;
  if (chat?.type !== "channel") return "";
  const messageId = message.forward_origin?.message_id ?? message.message_id;
  return chat.username ? `https://t.me/${chat.username}/${messageId}` : "";
}

function isChannelForward(message: TelegramMessage): boolean {
  return (message.forward_origin?.chat ?? message.forward_from_chat)?.type === "channel";
}

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

/** Owner forwards a channel post straight into the chat — post text already has address/
 *  price/description, so it's parsed directly, no page fetch involved. */
async function handleChannelForwardPost(message: TelegramMessage) {
  const chatId = String(message.chat.id);
  const text = (message.text ?? message.caption ?? "").trim();
  if (!text) {
    // Multi-photo posts arrive as one message per photo, all sharing a media_group_id, with
    // the caption on only one of them — silently skip the caption-less ones instead of
    // spamming an error per photo. A genuinely caption-less single-photo forward still errors.
    if (message.media_group_id) {
      console.log(`[import] album photo without caption, skipping chatId=${chatId} group=${message.media_group_id}`);
      return;
    }
    await sendTelegramMessage(chatId, "В пересланном посте нет текста — не смог разобрать. Добавь вручную в приложении.");
    return;
  }

  await sendTelegramMessage(chatId, "Смотрю пересланный пост, секунду…");

  const parsed = await parsePostText(text);
  if (!parsed) {
    console.log(`[import] channel forward parse failed chatId=${chatId}`);
    await sendTelegramMessage(chatId, "Не смог разобрать пост. Попробуй прислать текст сообщением или добавь вручную в приложении.");
    return;
  }

  const pending = await prisma.pendingImport.create({
    data: { chatId, sourceUrl: forwardedChannelSourceUrl(message), payload: JSON.stringify(parsed) },
  });

  await sendTelegramMessageWithButtons(chatId, formatIdeaPreview(parsed, "📩 Пост из канала:"), [
    { text: "✅ Да", callback_data: `pi:approve:${pending.id}` },
    { text: "❌ Нет", callback_data: `pi:reject:${pending.id}` },
  ]);
}

/** Fallback for when forwarding doesn't work (protected content, etc.) — owner pastes the post
 *  text as a plain message instead. Logged every time, since it only happens when the forward
 *  flow above wasn't usable. */
async function handlePastedPostText(message: TelegramMessage) {
  const chatId = String(message.chat.id);
  const text = (message.text ?? "").trim();

  console.log(`[import] owner pasted post text instead of forwarding chatId=${chatId} length=${text.length}`);

  await sendTelegramMessage(chatId, "Смотрю текст, секунду…");

  const parsed = await parsePostText(text);
  if (!parsed) {
    console.log(`[import] pasted text parse failed chatId=${chatId}`);
    await sendTelegramMessage(chatId, "Не смог разобрать текст. Добавь вручную в приложении.");
    return;
  }

  const pending = await prisma.pendingImport.create({
    data: { chatId, sourceUrl: "", payload: JSON.stringify(parsed) },
  });

  await sendTelegramMessageWithButtons(chatId, formatIdeaPreview(parsed, "📋 Вставленный текст:"), [
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
    if (isChannelForward(message)) {
      await handleChannelForwardPost(message);
      return NextResponse.json({ ok: true });
    }

    const text = message.text ?? "";
    if (findYandexMapsLink(text)) {
      await handleOwnerLink(message);
    } else if (text.trim().length >= PASTED_POST_MIN_LENGTH) {
      await handlePastedPostText(message);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
