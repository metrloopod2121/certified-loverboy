import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveTagIds } from "@/lib/tags";
import { withoutMetroTags } from "@/lib/metro";
import { tryConsumeImportQuota, quotaExhaustedMessage } from "@/lib/importQuota";
import { trackEvent } from "@/lib/analytics";
import {
  sendTelegramMessage,
  sendTelegramMessageWithButtons,
  editTelegramMessageText,
  answerCallbackQuery,
} from "@/lib/telegram";
import {
  findYandexMapsLink,
  findTelegramPostLink,
  parseYandexMapsLink,
  parsePostTextMulti,
  fetchTelegramPostText,
  formatIdeaPreview,
  type ParsedFromLink,
} from "@/lib/socialImport";

type TelegramForwardChat = { type: string; username?: string };

type TelegramMessageEntity = { type: string; offset: number; length: number; url?: string };

type TelegramMessage = {
  message_id: number;
  chat: { id: number };
  from?: { id: number; username?: string };
  text?: string;
  caption?: string;
  // Formatting entities for text/caption respectively. Post links are almost always styled as
  // clickable words ("Забронировать", "На карте") rather than typed out — the actual URL only
  // shows up here (type "text_link" + url), never in the visible text itself.
  entities?: TelegramMessageEntity[];
  caption_entities?: TelegramMessageEntity[];
  // Present when this message is one photo/video out of a multi-photo post. Telegram delivers
  // an album as separate messages (one webhook call each) and puts the caption on only one of
  // them — the rest arrive with no text at all.
  media_group_id?: string;
  // Bot API 7.0+ shape. Older field (forward_from_chat) kept alongside for servers still on
  // an earlier Bot API version — both are checked.
  forward_origin?: { type: string; chat?: TelegramForwardChat; message_id?: number };
  forward_from_chat?: TelegramForwardChat;
};

/** Pulls URLs hidden behind styled link text (Bot API only exposes these via entities, never
 *  in the plain text/caption string) so they still reach the parser and the venue link field. */
function hiddenLinksFromMessage(message: TelegramMessage): string[] {
  const entities = message.caption ? message.caption_entities : message.entities;
  if (!entities) return [];
  return entities
    .filter((entity): entity is TelegramMessageEntity & { url: string } => entity.type === "text_link" && Boolean(entity.url))
    .map((entity) => entity.url);
}

/** Appends any hidden link URLs to the visible text so downstream parsing (coordinate lookup,
 *  LLM extraction) sees them the same as a plain typed-out URL would be seen. */
function textWithHiddenLinks(text: string, links: string[]): string {
  return links.length > 0 ? `${text}\n\n${links.join("\n")}` : text;
}

/** Minimum length before a plain (non-forwarded) text message is treated as a pasted post --
 *  guards against accidental LLM calls on short one-off chat messages. */
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

/** Creates a PendingImport + approve/reject preview for each parsed place. A single post can
 *  list several venues, so this fires once per place rather than once per message. */
async function sendDraftsForApproval(
  chatId: string,
  ideas: ParsedFromLink[],
  header: string,
  sourceUrlFor: (idea: ParsedFromLink) => string,
  source: string
) {
  for (const idea of ideas) {
    const pending = await prisma.pendingImport.create({
      data: { chatId, sourceUrl: sourceUrlFor(idea), payload: JSON.stringify(idea), source },
    });

    await sendTelegramMessageWithButtons(chatId, formatIdeaPreview(idea, header), [
      { text: "✅ Да", callback_data: `pi:approve:${pending.id}` },
      { text: "❌ Нет", callback_data: `pi:reject:${pending.id}` },
    ]);
  }
}

async function handleYandexLink(message: TelegramMessage) {
  const url = findYandexMapsLink(message.text ?? "");
  if (!url) return;

  const chatId = String(message.chat.id);
  const quota = await tryConsumeImportQuota(chatId);
  if (!quota.ok) {
    await sendTelegramMessage(chatId, quotaExhaustedMessage());
    return;
  }

  await sendTelegramMessage(chatId, "Смотрю ссылку, секунду…");

  const parsed = await parseYandexMapsLink(url);
  if (!parsed) {
    await sendTelegramMessage(chatId, "Не смог разобрать эту ссылку. Попробуй другую или добавь вручную в приложении.");
    return;
  }

  await sendDraftsForApproval(chatId, [parsed], "📍 Новое место с Яндекс.Карт:", () => url, "bot_yandex_link");
}

/** Owner shares a bare link to a Telegram post (not a forward) — fetches the post's public
 *  embed page and parses it the same way a forwarded post would be. */
async function handleTelegramPostLink(message: TelegramMessage, url: string) {
  const chatId = String(message.chat.id);
  const quota = await tryConsumeImportQuota(chatId);
  if (!quota.ok) {
    await sendTelegramMessage(chatId, quotaExhaustedMessage());
    return;
  }

  await sendTelegramMessage(chatId, "Смотрю пост по ссылке, секунду…");

  const postText = await fetchTelegramPostText(url);
  if (!postText) {
    console.log(`[import] telegram post link fetch failed chatId=${chatId} url=${url}`);
    await sendTelegramMessage(chatId, "Не смог открыть пост по ссылке. Перешли его боту сообщением или добавь вручную в приложении.");
    return;
  }

  const drafts = await parsePostTextMulti(postText);
  if (drafts.length === 0) {
    console.log(`[import] telegram post link parse failed chatId=${chatId} url=${url}`);
    await sendTelegramMessage(chatId, "Не смог разобрать пост. Попробуй переслать его сообщением или добавь вручную в приложении.");
    return;
  }

  await sendDraftsForApproval(chatId, drafts, "📩 Пост по ссылке:", (idea) => idea.mapUrl ?? url, "bot_telegram_post_link");
}

/** A channel post forwarded straight into the chat — post text already has address/price/
 *  description, so it's parsed directly, no page fetch involved. A post can list several
 *  places; each becomes its own draft with its own approve/reject buttons. */
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

  const quota = await tryConsumeImportQuota(chatId);
  if (!quota.ok) {
    await sendTelegramMessage(chatId, quotaExhaustedMessage());
    return;
  }

  await sendTelegramMessage(chatId, "Смотрю пересланный пост, секунду…");

  const hiddenLinks = hiddenLinksFromMessage(message);
  const drafts = await parsePostTextMulti(textWithHiddenLinks(text, hiddenLinks));
  if (drafts.length === 0) {
    console.log(`[import] channel forward parse failed chatId=${chatId}`);
    await sendTelegramMessage(chatId, "Не смог разобрать пост. Попробуй прислать текст сообщением или добавь вручную в приложении.");
    return;
  }

  const fallbackUrl = hiddenLinks[0] ?? forwardedChannelSourceUrl(message);
  await sendDraftsForApproval(chatId, drafts, "📩 Пост из канала:", (idea) => idea.mapUrl ?? fallbackUrl, "bot_channel_forward");
}

/** Fallback for when forwarding doesn't work (protected content, etc.) — pastes the post text
 *  as a plain message instead. Logged every time, since it only happens when the forward flow
 *  above wasn't usable. */
async function handlePastedPostText(message: TelegramMessage) {
  const chatId = String(message.chat.id);
  const text = (message.text ?? "").trim();

  console.log(`[import] pasted post text instead of forwarding chatId=${chatId} length=${text.length}`);

  const quota = await tryConsumeImportQuota(chatId);
  if (!quota.ok) {
    await sendTelegramMessage(chatId, quotaExhaustedMessage());
    return;
  }

  await sendTelegramMessage(chatId, "Смотрю текст, секунду…");

  const hiddenLinks = hiddenLinksFromMessage(message);
  const drafts = await parsePostTextMulti(textWithHiddenLinks(text, hiddenLinks));
  if (drafts.length === 0) {
    console.log(`[import] pasted text parse failed chatId=${chatId}`);
    await sendTelegramMessage(chatId, "Не смог разобрать текст. Добавь вручную в приложении.");
    return;
  }

  const fallbackUrl = hiddenLinks[0] ?? "";
  await sendDraftsForApproval(chatId, drafts, "📋 Вставленный текст:", (idea) => idea.mapUrl ?? fallbackUrl, "bot_pasted_text");
}

async function handleStartCommand(message: TelegramMessage) {
  const chatId = String(message.chat.id);
  await trackEvent("bot_start", chatId);
  await sendTelegramMessage(
    chatId,
    [
      "Привет! Я собираю базу мест для свиданий и просто интересных точек.",
      "",
      "Кинь мне ссылку на Яндекс.Карты, перешли пост из телеграм-канала, вставь ссылку на пост или просто текст — я распознаю место и предложу добавить его в базу.",
      "",
      "Открой приложение через кнопку меню — там список, карта и фильтры по своей базе.",
      "",
      "Есть проблема? Напиши /support и опиши её.",
    ].join("\n")
  );
}

/** Logs the message to SupportMessage (durable copy) and forwards it to ADMIN_TG_ID, so
 *  nothing gets lost even if the Telegram DM notification is missed. */
async function handleSupportCommand(message: TelegramMessage) {
  const chatId = String(message.chat.id);
  const text = (message.text ?? "").replace(/^\/support(@\w+)?\s*/i, "").trim();

  if (!text) {
    await sendTelegramMessage(
      chatId,
      "Опиши проблему одним сообщением, начиная с /support — например:\n/support не открывается карта"
    );
    return;
  }

  const username = message.from?.username ? `@${message.from.username}` : null;
  await prisma.supportMessage.create({ data: { telegramUserId: chatId, username, text } });

  const adminId = process.env.ADMIN_TG_ID;
  if (adminId) {
    await sendTelegramMessage(adminId, `🆘 Support от ${username ?? `id ${chatId}`}:\n${text}`);
  }

  await sendTelegramMessage(chatId, "Спасибо! Передал в поддержку, скоро ответим.");
}

async function handleCallbackQuery(callbackQuery: TelegramCallbackQuery) {
  const data = callbackQuery.data ?? "";
  const match = data.match(/^pi:(approve|reject):(.+)$/);
  if (!match) {
    await answerCallbackQuery(callbackQuery.id);
    return;
  }

  const [, action, pendingId] = match;
  const pending = await prisma.pendingImport.findUnique({ where: { id: pendingId } });
  if (!pending || pending.chatId !== String(callbackQuery.from.id)) {
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
      telegramUserId: pending.chatId,
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
      links: {
        create: idea.links.map((link, position) => ({ label: link.label, url: link.url, position })),
      },
    },
  });

  await prisma.pendingImport.delete({ where: { id: pendingId } });
  await trackEvent("place_created", pending.chatId, { source: pending.source });
  await answerCallbackQuery(callbackQuery.id, "Добавлено");
  if (chatId && messageId) await editTelegramMessageText(String(chatId), messageId, `✅ Добавлено: ${idea.title}`);
}

/** Receives Telegram updates. Any user can message the bot: a Yandex Maps link, a Telegram
 *  post link, a forwarded/pasted post, or /support — each gets parsed/handled for that user's
 *  own data, gated by their own import quota. */
export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update = (await request.json()) as TelegramUpdate;

  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
    return NextResponse.json({ ok: true });
  }

  const message = update.message;
  if (!message || !message.from) return NextResponse.json({ ok: true });

  const text = message.text ?? "";

  if (/^\/start(\s|$)/i.test(text)) {
    await handleStartCommand(message);
    return NextResponse.json({ ok: true });
  }

  if (/^\/support(@\w+)?(\s|$)/i.test(text)) {
    await handleSupportCommand(message);
    return NextResponse.json({ ok: true });
  }

  if (isChannelForward(message)) {
    await handleChannelForwardPost(message);
    return NextResponse.json({ ok: true });
  }

  const trimmed = text.trim();
  const yandexLink = findYandexMapsLink(text);
  const telegramLink = findTelegramPostLink(text);
  // Only treat it as "just a link" when the whole message IS the link — a link mentioned
  // somewhere inside a full pasted post (e.g. a channel self-promo footer) should still go
  // through the pasted-post-text path below, not be re-fetched as if it were the post itself.
  const isBareTelegramLink = telegramLink !== null && trimmed === telegramLink;

  if (yandexLink) {
    await handleYandexLink(message);
  } else if (isBareTelegramLink) {
    await handleTelegramPostLink(message, telegramLink);
  } else if (trimmed.length >= PASTED_POST_MIN_LENGTH) {
    await handlePastedPostText(message);
  }

  return NextResponse.json({ ok: true });
}
