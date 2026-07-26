export type Lang = "ru" | "en";

export const DEFAULT_LANG: Lang = "ru";

export function isLang(value: unknown): value is Lang {
  return value === "ru" || value === "en";
}

const strings = {
  start: {
    ru: [
      "Привет! Я собираю базу мест для свиданий и просто интересных точек.",
      "",
      "Кинь мне ссылку на Яндекс.Карты, перешли пост из телеграм-канала, вставь ссылку на пост или просто текст — я распознаю место и предложу добавить его в базу.",
      "",
      "Открой приложение через кнопку меню — там список, карта и фильтры по своей базе.",
      "",
      "Есть проблема? Напиши /support и опиши её.",
    ].join("\n"),
    en: [
      "Hi! I collect a base of date spots and other interesting places.",
      "",
      "Send me a Yandex Maps link, forward a channel post, paste a link to a post, or just plain text — I'll pick out the place and offer to add it to your base.",
      "",
      "Open the app via the menu button — there's a list, a map, and filters over your own base.",
      "",
      "Found a problem? Write /support and describe it.",
    ].join("\n"),
  },
  supportUsage: {
    ru: "Опиши проблему одним сообщением, начиная с /support — например:\n/support не открывается карта",
    en: "Describe the problem in one message, starting with /support — for example:\n/support the map won't open",
  },
  supportThanks: {
    ru: "Спасибо! Передал в поддержку, скоро ответим.",
    en: "Thanks! Passed it on to support, we'll get back to you soon.",
  },
  lookingAtLink: { ru: "Смотрю ссылку, секунду…", en: "Looking at the link, one sec…" },
  lookingAtPostLink: { ru: "Смотрю пост по ссылке, секунду…", en: "Looking at the post, one sec…" },
  lookingAtForwardedPost: { ru: "Смотрю пересланный пост, секунду…", en: "Looking at the forwarded post, one sec…" },
  lookingAtPastedText: { ru: "Смотрю текст, секунду…", en: "Looking at the text, one sec…" },
  linkParseFailed: {
    ru: "Не смог разобрать эту ссылку. Попробуй другую или добавь вручную в приложении.",
    en: "Couldn't parse this link. Try another one or add it manually in the app.",
  },
  postLinkOpenFailed: {
    ru: "Не смог открыть пост по ссылке. Перешли его боту сообщением или добавь вручную в приложении.",
    en: "Couldn't open the post from this link. Forward it to me as a message or add it manually in the app.",
  },
  postLinkParseFailed: {
    ru: "Не смог разобрать пост. Попробуй переслать его сообщением или добавь вручную в приложении.",
    en: "Couldn't parse the post. Try forwarding it as a message or add it manually in the app.",
  },
  forwardedNoText: {
    ru: "В пересланном посте нет текста — не смог разобрать. Добавь вручную в приложении.",
    en: "The forwarded post has no text — couldn't parse it. Add it manually in the app.",
  },
  forwardedParseFailed: {
    ru: "Не смог разобрать пост. Попробуй прислать текст сообщением или добавь вручную в приложении.",
    en: "Couldn't parse the post. Try sending the text as a message or add it manually in the app.",
  },
  pastedParseFailed: {
    ru: "Не смог разобрать текст. Добавь вручную в приложении.",
    en: "Couldn't parse the text. Add it manually in the app.",
  },
  headerYandexLink: { ru: "📍 Новое место с Яндекс.Карт:", en: "📍 New place from Yandex Maps:" },
  headerPostLink: { ru: "📩 Пост по ссылке:", en: "📩 Post from a link:" },
  headerChannelForward: { ru: "📩 Пост из канала:", en: "📩 Post from a channel:" },
  headerPastedText: { ru: "📋 Вставленный текст:", en: "📋 Pasted text:" },
  yesButton: { ru: "✅ Да", en: "✅ Yes" },
  noButton: { ru: "❌ Нет", en: "❌ No" },
  callbackStale: { ru: "Уже обработано или устарело", en: "Already handled or expired" },
  callbackCancelled: { ru: "Отменено", en: "Cancelled" },
  cancelledEdit: { ru: "❌ Отменено.", en: "❌ Cancelled." },
  callbackAdded: { ru: "Добавлено", en: "Added" },
  quotaExhausted: {
    ru: "Бесплатный лимит на импорт по ссылке исчерпан (5 из 5). Платные подписки скоро появятся — а добавить место вручную в приложении можно в любой момент.",
    en: "You've used your free link imports (5 of 5). Paid plans are coming soon — you can still add a place manually in the app anytime.",
  },
  previewAddress: { ru: "Адрес", en: "Address" },
  previewMetro: { ru: "Метро", en: "Metro" },
  previewPrice: { ru: "Цена", en: "Price" },
  previewTags: { ru: "Теги", en: "Tags" },
  previewLinks: { ru: "Ссылки", en: "Links" },
  previewAddToBase: { ru: "Добавить в базу?", en: "Add to your base?" },
} satisfies Record<string, Record<Lang, string>>;

export type StringKey = keyof typeof strings;

export function t(lang: Lang, key: StringKey): string {
  return strings[key][lang];
}

export function addedEditText(lang: Lang, title: string): string {
  return lang === "ru" ? `✅ Добавлено: ${title}` : `✅ Added: ${title}`;
}
