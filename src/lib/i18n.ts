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
  openAppButton: { ru: "Открыть приложение", en: "Open the app" },
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
    ru: "Лимит на импорт по ссылке исчерпан. Добавить место вручную в приложении можно в любой момент.",
    en: "You've used your link imports. You can still add a place manually in the app anytime.",
  },
  previewAddress: { ru: "Адрес", en: "Address" },
  previewMetro: { ru: "Метро", en: "Metro" },
  previewPrice: { ru: "Цена", en: "Price" },
  previewTags: { ru: "Теги", en: "Tags" },
  previewLinks: { ru: "Ссылки", en: "Links" },
  previewAddToBase: { ru: "Добавить в базу?", en: "Add to your base?" },

  // Mini App UI
  navIdeas: { ru: "Идеи", en: "Ideas" },
  navMap: { ru: "Карта", en: "Map" },
  navProfile: { ru: "Профиль", en: "Profile" },
  authGateHint: { ru: "Открой приложение через бота в Telegram.", en: "Open this app through the Telegram bot." },

  storageTitle: { ru: "Хранилище идей", en: "Ideas Storage" },
  addIdea: { ru: "Добавить идею", en: "Add idea" },
  closeForm: { ru: "Закрыть форму", en: "Close form" },
  filterTags: { ru: "Теги", en: "Tags" },
  filterMetro: { ru: "Метро", en: "Metro" },
  sortNewest: { ru: "Новые", en: "Newest" },
  sortTitle: { ru: "Название", en: "Title" },
  sortNearby: { ru: "Рядом", en: "Nearby" },
  sortDefaultLabel: { ru: "Сортировка", en: "Sort" },
  locationSet: { ru: "Локация задана — сортирую по расстоянию", en: "Location set — sorting by distance" },
  change: { ru: "Изменить", en: "Change" },
  locating: { ru: "Определяю…", en: "Locating…" },
  useMyLocation: { ru: "Использовать моё местоположение", en: "Use my location" },
  manualLocationPlaceholder: { ru: "55.75, 37.61 или ссылка на карту", en: "55.75, 37.61 or a maps link" },
  setLocation: { ru: "Задать", en: "Set" },
  geoNotSupported: { ru: "Геолокация здесь не поддерживается", en: "Geolocation isn't supported here" },
  geoFailed: { ru: "Не удалось определить местоположение", en: "Couldn't get your location" },
  manualLocationInvalid: {
    ru: "Введи координаты вида 55.75, 37.61 или ссылку на карту",
    en: "Enter coordinates like 55.75, 37.61 or a maps link",
  },
  tabManual: { ru: "Вручную", en: "Manual" },
  tabLink: { ru: "Ссылка", en: "Link" },
  tabImportFile: { ru: "Импорт файла", en: "Import file" },
  pasteYandexLink: { ru: "Вставь ссылку на Яндекс.Карты", en: "Paste a Yandex Maps link" },
  linkPlaceholder: {
    ru: "https://yandex.ru/maps/... (или весь скопированный текст)",
    en: "https://yandex.ru/maps/... (or the whole shared text)",
  },
  reading: { ru: "Читаю…", en: "Reading…" },
  add: { ru: "Добавить", en: "Add" },
  filesHint: {
    ru: "Файлы (.md / .txt) — можно выбрать сразу несколько",
    en: "Files (.md / .txt) — pick several at once if you like",
  },
  chooseFiles: { ru: "Выбрать файлы", en: "Choose files" },
  loadingEllipsis: { ru: "Загрузка…", en: "Loading…" },
  editAria: { ru: "Редактировать", en: "Edit" },
  deleteAria: { ru: "Удалить", en: "Delete" },
  noAddress: { ru: "Без адреса", en: "No address" },
  away: { ru: "от вас", en: "away" },
  noCoordinates: { ru: "Нет координат", en: "No coordinates" },
  nothingYet: { ru: "Здесь пока пусто — добавь первую идею.", en: "Nothing here yet — add your first idea." },
  couldntParseLink: { ru: "Не смог разобрать эту ссылку", en: "Couldn't parse this link" },
  readingLinkOverlay: { ru: "Читаю ссылку…", en: "Reading the link…" },
  aiLookingUp: { ru: "ИИ ищет место, пара секунд", en: "AI is looking up the place, a few seconds" },

  placeDetails: { ru: "Детали места", en: "Place details" },
  titleLabel: { ru: "Название", en: "Title" },
  titlePlaceholder: {
    ru: "Пикник в парке, уютное кафе рядом…",
    en: "Picnic in the park, cozy café nearby…",
  },
  removeLocationAria: { ru: "Удалить локацию", en: "Remove location" },
  addressPlaceholder: { ru: "Улица, дом", en: "Street, building" },
  metroPlaceholder: { ru: "Метро", en: "Metro" },
  mapsLinkPlaceholder: { ru: "https://yandex.ru/maps/...", en: "https://yandex.ru/maps/..." },
  chooseOnMap: { ru: "Выбрать на карте", en: "Choose on map" },
  onlyYandexError: { ru: "Поддерживаются только ссылки на Яндекс.Карты", en: "Only Yandex Maps links are supported" },
  noCoordsHint: {
    ru: "Не удалось прочитать координаты из ссылки — попробуй выбрать на карте",
    en: "Couldn't read coordinates from this link — try Choose on map instead",
  },
  locationSelected: { ru: "Локация выбрана", en: "Location selected" },
  clear: { ru: "Очистить", en: "Clear" },
  addLocationBtn: { ru: "Добавить локацию", en: "Add location" },
  linksLabel: { ru: "Ссылки", en: "Links" },
  linkLabelPlaceholder: { ru: "Метка (Instagram, бронь…)", en: "Label (Instagram, booking…)" },
  urlPlaceholder: { ru: "https://", en: "https://" },
  removeLinkAria: { ru: "Удалить ссылку", en: "Remove link" },
  addLinkBtn: { ru: "Добавить ссылку", en: "Add link" },
  tagsLabel: { ru: "Теги", en: "Tags" },
  tagsPlaceholder: { ru: "свидание, романтика, искусство…", en: "date, romance, art…" },
  tagsHint: {
    ru: "Добавь тег «date», чтобы отметить идею для свидания — оставь без него для обычного места",
    en: "Tag it “date” to mark a date idea — leave it off for a plain venue",
  },
  priceLabel: { ru: "Цена", en: "Price" },
  pricePlaceholder: { ru: "1500–3000 ₽", en: "1500–3000 ₽" },
  descriptionLabel: { ru: "Описание", en: "Description" },
  descriptionPlaceholder: { ru: "Заметки в свободной форме", en: "Free-form notes" },
  saveBtn: { ru: "Сохранить", en: "Save" },
  savingBtn: { ru: "Сохраняю…", en: "Saving…" },
  cancelBtn: { ru: "Отмена", en: "Cancel" },
  couldntSave: { ru: "Не удалось сохранить", en: "Couldn't save" },

  closeAria: { ru: "Закрыть", en: "Close" },
  untitled: { ru: "Без названия", en: "Untitled" },
  addingBtn: { ru: "Добавляю…", en: "Adding…" },

  searchPlaceholder: { ru: "Поиск…", en: "Search…" },
  nothingFound: { ru: "Ничего не найдено", en: "Nothing found" },

  couldntLoad: { ru: "Не удалось загрузить", en: "Couldn't load" },
  noCoordsYet: {
    ru: "Ни у одной идеи пока нет координат — открой её на экране «Идеи», нажми «Редактировать» и добавь координаты, тогда она появится здесь.",
    en: "None of the ideas have coordinates yet — open one on the Ideas screen, tap Edit, and add coordinates so it shows up here.",
  },
  linkWord: { ru: "Ссылка", en: "Link" },

  backAria: { ru: "Назад", en: "Back" },
  couldntLoadPlace: { ru: "Не удалось загрузить это место.", en: "Couldn't load this place." },
  openLink: { ru: "Открыть ссылку", en: "Open link" },

  profileTitle: { ru: "Профиль", en: "Profile" },
  languageHeading: { ru: "Язык", en: "Language" },
  languageDescription: {
    ru: "Язык бота и интерфейса приложения.",
    en: "Language for the bot and this app.",
  },
  aboutBotHeading: { ru: "О боте", en: "About the bot" },
  aboutBotText: {
    ru: "Этот бот ведёт твою личную базу мест и идей для свиданий. Скинь ему ссылку на Яндекс.Карты, перешли пост из канала или вставь ссылку на пост — он найдёт место и предложит добавить его в базу.",
    en: "This bot keeps your own personal base of places and date ideas. Send it a Yandex Maps link, forward a channel post, or paste a link to a post — it picks out the place and offers to add it to your base.",
  },
  linkImportsHeading: { ru: "Импорты по ссылке", en: "Link imports" },
  linkImportsRemaining: { ru: "Осталось", en: "Remaining" },
  supportHeading: { ru: "Поддержка", en: "Support" },
  supportDescription: {
    ru: "Нашёл баг или что-то непонятно? Опиши ниже.",
    en: "Found a bug or something's confusing? Describe it below.",
  },
  supportPlaceholder: { ru: "Что случилось?", en: "What happened?" },
  sendingBtn: { ru: "Отправляю…", en: "Sending…" },
  sendBtn: { ru: "Отправить", en: "Send" },
  sentMsg: { ru: "Отправлено — спасибо!", en: "Sent — thanks!" },
  couldntSend: { ru: "Не удалось отправить", en: "Couldn't send" },
  yourDataHeading: { ru: "Твои данные", en: "Your data" },
  yourDataDescription: {
    ru: "Скачай все места из своей базы в виде .zip с markdown-файлами.",
    en: "Download every place in your base as a .zip of markdown files.",
  },
  exportingBtn: { ru: "Экспортирую…", en: "Exporting…" },
  exportBtn: { ru: "Экспортировать всё в файлы", en: "Export all as files" },
} satisfies Record<string, Record<Lang, string>>;

export type StringKey = keyof typeof strings;

export function t(lang: Lang, key: StringKey): string {
  return strings[key][lang];
}

export function addedEditText(lang: Lang, title: string): string {
  return lang === "ru" ? `✅ Добавлено: ${title}` : `✅ Added: ${title}`;
}

/** Russian has three plural forms depending on the last digit(s); English just has one/many. */
function ruPlural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

export function foundPlacesText(lang: Lang, count: number): string {
  if (lang === "ru") return `Найдено мест: ${count}`;
  return `Found ${count} ${count === 1 ? "place" : "places"}`;
}

export function locationsCountLabel(lang: Lang, count: number): string {
  if (lang === "ru") return `Локации (${count})`;
  return `Locations (${count})`;
}

export function locationOrdinalLabel(lang: Lang, index: number): string {
  if (lang === "ru") return `Локация ${index}`;
  return `Location ${index}`;
}

export function locationsHeading(lang: Lang, count: number): string {
  if (lang === "ru") return ruPlural(count, "Локация", "Локации", "Локаций");
  return count > 1 ? "Locations" : "Location";
}

export function awayText(lang: Lang, distance: string): string {
  return `${distance} ${t(lang, "away")}`;
}
