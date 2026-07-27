type TelegramMessageOptions = {
  parseMode?: "HTML";
  disableWebPagePreview?: boolean;
};

async function postTelegram(method: string, body: Record<string, unknown>) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Telegram ${method} failed: ${res.status} ${detail}`);
  }
}

export async function sendTelegramMessage(chatId: string, text: string, options: TelegramMessageOptions = {}) {
  await postTelegram("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: options.parseMode,
    disable_web_page_preview: options.disableWebPagePreview,
  });
}

export type InlineButton = { text: string; callback_data: string };

export async function sendTelegramMessageWithButtons(chatId: string, text: string, buttons: InlineButton[]) {
  await postTelegram("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: { inline_keyboard: [buttons] },
  });
}

export async function sendTelegramMessageWithWebAppButton(chatId: string, text: string, buttonText: string, url: string) {
  await postTelegram("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: {
      inline_keyboard: [[{ text: buttonText, web_app: { url } }]],
    },
  });
}

export async function editTelegramMessageText(chatId: string, messageId: number, text: string) {
  await postTelegram("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
  });
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await postTelegram("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  });
}
