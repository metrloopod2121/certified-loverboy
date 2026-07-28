# Project State

Актуальный снимок состояния проекта на 2026-07-28. Этот файл нужен как "память"
проекта: что сейчас включено, где это лежит, какие команды важны, что уже
задеплоено и какие решения были приняты.

## Общая картина

`certified-loverboy` — публичный Telegram Mini App + bot для личной базы мест.
Каждый Telegram-пользователь видит только свои места, скоуп по `telegramUserId`.
Парная swipe/match-механика удалена; текущий продукт — одиночная база мест.

Продакшен:
- VPS: `2.26.91.146` (мигрировали с `31.76.0.133` 2026-07-27 — старый сервер держал VPN-стек
  на порту 443, из-за чего Mini App работал только на нестандартном 8443, что часть
  пользователей не могла открыть; новый сервер чистый, только это приложение)
- systemd service: `certified-loverboy.service`
- app path: `/srv/web/app/certified-loverboy/app`
- app user: `loverboy`
- port: `3101`
- reminders timer: `certified-loverboy-reminders.timer` runs `scripts/sendReminders.mjs` every
  minute; emergency pause via `REMINDERS_ENABLED=0` in `.env` or
  `systemctl disable --now certified-loverboy-reminders.timer`
- HTTPS: `https://vacanator.xyz/` (порт 443 напрямую, без `:8443` — сервер свободен от VPN)
- bot: `@certified7overBot`
- Telegram webhook: `https://vacanator.xyz/api/telegram/webhook`, pinned with Bot API
  `ip_address=2.26.91.146` to avoid Telegram using stale DNS for the old VPN host
- latest deployed commit: verify on the server with
  `sudo -u loverboy git rev-parse --short HEAD` after each deploy

**Старый сервер `31.76.0.133` больше не используется для этого проекта — НЕ деплоить туда.**
Сервис там пока оставлен выключенным/остановленным как временный откат, домен на него больше
не резолвится. На нём по-прежнему живёт VPN-стек и отдельный проект `moPlaces`
(`moplaces.vacanator.xyz`) — их не трогать.

Локально `pre fill data .zip` — частный untracked файл, не относится к деплою и не должен
случайно попадать в commit. Перед любым деплоем всегда сверять `git status`, потому что
в репо параллельно работают Codex/Claude/пользователь.

## Текущий UI

В Mini App три основных таба:
- Ideas Storage (`/`) — список мест, фильтры tags/metro, сортировки, добавление места вручную или через ссылку (Yandex Maps / Instagram reel-post / Telegram post); карточки открывают `/place/[id]`, а у карточки с координатами есть только быстрый переход на карту `/map?focus=<locationId>` — edit/delete на карточке не показываются.
- Place detail (`/place/[id]`) — описание места, ссылки/локации, нижняя action bar: "Удалить" слева, "Редактировать" справа; редактирование открывает `DateIdeaForm` прямо на экране деталей, удаление возвращает на Ideas Storage. Локация с map URL кликабельна всей адресной плашкой и показывает стрелку справа; отдельный текст "Открыть ссылку" не используется. `PlaceLink` в разделе "Ссылки" тоже рисуются как отдельные full-width кликабельные rows с иконкой и стрелкой справа.
- Map (`/map`) — карта мест с координатами, фильтры tags/metro; при `?focus=<locationId>` в query карта долетает (`flyTo`) до этого пина и открывает его попап, как только маркеры подгрузятся (свой отдельный `/api/date-ideas` fetch, независимый от Storage).
- Profile (`/profile`) — язык, инфо о боте, счетчик импортов по ссылке, support, export.

Текущая форма места (`DateIdeaForm`):
- event-секция называется "Дата (опционально)" и без поясняющего текста; у start date/time нет видимых
  лейблов над полями, только нативные поля с compact placeholder/aria-label;
- под блоком даты отдельной карточкой стоит "Напоминание": строка с текстом слева и тумблером
  справа. При включении раскрывается нативный `<select>` с пятью относительными пресетами:
  за 15 минут, за час, за 6 часов, за день, за 2 дня. В БД всё равно сохраняется абсолютный
  `reminderAt`, вычисленный от `eventStartsAt`; для сохранения reminder нужны дата и время события;
- секция локаций называется просто "Локации", без счетчика в скобках;
- кнопки получения пина компактные: "Из ссылки" и "На карте" в две равные колонки;
- выбранный пин показывается status-плашкой "Пин выбран" и маленькой icon-кнопкой очистки.
- под полем тегов нет поясняющей подписи про `date`; чем меньше helper-текстов под полями, тем лучше для этого UI.

Локальные проверки:
- `npm run lint` и `npx tsc --noEmit` можно гонять в обычном sandbox;
- `npm run build` на этом проекте использует `next/font` + Google Fonts (`Geist`, `Geist Mono`),
  поэтому в Codex sandbox без сети он долго висит и падает на скачивании шрифтов. Не тратить время
  на первый sandbox-build: для production build сразу запускать `npm run build` с разрешенным network/escalated access.

Актуальная палитра: базовые тёплые акценты выровнены по насыщенности (`--app-yellow: #efd47c`,
`--app-coral: #f0a477`), но event-карточки не используют gold/coral как основной язык. Для
событий актуален pink-blue язык без teal/rainbow/holo и без золотого: date badge специально
бледный pastel pink → blue (`#ffd2f1 → #c8f2ff`), а внутренний radial-gradient карточки остается
чуть ярче. Для event-тегов используется более заметный, но прозрачный neon-blue `pillBlue`.

Metro: `--metro-*` — насыщенные цвета линий для точек/свотчей; `--metro-*-pale` — отдельные
пастельные фоны карточек. В Storage metro dot чуть крупнее (`size-2.5`) и с белым ring, чтобы
не сливаться с фоном карточки.
МЦД/МЦК визуально отличаются от обычного метро: точка — цветное кольцо с белым центром, а не
залитый кружок. `metro.ts` знает МЦД-1/2/3/4 и МЦК; `Сколково` распознается как МЦД-1 и получает
оранжевое кольцо + MCD1-pale фон карточки. Для пересадочных станций без явного `МЦД-1`/`МЦК`
приоритет остается за обычной линией метро, чтобы не перекрашивать метро-станции случайно.

Текущий профиль:
- выбор языка через нативный `<select>`, не через две большие панели;
- счетчик импортов показывает оставшиеся импорты;
- пока лимит выключен, backend отдает `remaining: null`, UI показывает `∞`;
- support submit full-width compact button;
- export button full-width compact button.

## Импорт и лимиты

AI-импорт сейчас без лимита:
- `LINK_IMPORT_LIMIT` пустой/не задан;
- `ImportQuota` не списывает попытки, если лимит выключен;
- Profile показывает `∞`.

Когда понадобится закрыть импорт лимитом, выставить:

```bash
LINK_IMPORT_LIMIT="5"
sudo systemctl restart certified-loverboy.service
```

Импорт через приложение:
- `POST /api/date-ideas/from-link`
- та же тройка источников, что и у бота: Yandex Maps link, Instagram reel/post, Telegram post
  (определяется по regex на сервере, тем же кодом, что и webhook);
- Instagram здесь под тем же pilot-гейтом (`instagramImportAllowed`), что и в боте;
- шаринг-блок (Yandex "название / адрес / ссылка", инстаграмная подпись и т.п.) схлопывается
  до голой ссылки в UI при вводе;
- Yandex всегда даёт один draft, Instagram/Telegram — может дать несколько (один пост/рилс
  может упоминать несколько мест) — ответ `{ items: DateIdeaInput[] }`, отрисовывается через
  тот же review sheet, что и file-import;
- source URL социмпорта сохраняется в `PlaceLink`: Telegram post link / публичный channel forward
  добавляют link с label `Telegram`, Instagram reel/post добавляет link с label `Instagram`.
  Это происходит независимо от того, нашлась ли отдельная map-ссылка внутри поста;
- `Location.url` должен быть только map URL. Для Yandex Maps импорта source URL по умолчанию
  становится `Location.url`; для Telegram/Instagram source URL никогда не должен попадать в
  `Location.url`, если это не карта;
- после парсинга открывается review sheet, сохранение идет обычным `POST /api/date-ideas` с `source: "link_in_app"`.

Геокодинг адреса без ссылки на карту (Telegram-пост/Instagram часто просто пишут адрес текстом,
без ссылки на Яндекс.Карты):
- `src/lib/nominatim.ts::geocodeAddress()` — OpenStreetMap Nominatim, бесплатно, без API-ключа;
- вызывается из `parsePostTextMulti()` (`socialImport.ts`) последним фолбэком: если ни `mapUrl`,
  ни голая пара координат в тексте поста не дали пин, а модель извлекла `address` — геокодим этот
  адрес текстом (с явным биасом на Москву/RU, как и остальные текстовые запросы в проекте, см.
  `braveSearch.ts`);
- сознательно НЕ Yandex Geocoder: у бесплатной (и вообще стандартной) лицензии Яндекс.Карт запрет
  на постоянное хранение координат/адресов в своей базе — разрешено только временное кэширование
  (~30 дней), постоянное хранение продаётся отдельно как "расширенная лицензия". У нас координаты
  сохраняются в `Location.lat/lng` навсегда, поэтому лицензионно это не подходит. ODbL-лицензия
  Nominatim/OSM хранение производных данных прямо разрешает;
- лимиты Nominatim usage policy (~1 запрос/сек, обязательный User-Agent) не проблема при нашем
  объёме — вызывается максимум по разу на найденное место в рамках одного импорта.

Импорт через bot:
- прямая ссылка на Yandex Maps;
- forward из Telegram channel;
- голая ссылка на Telegram post;
- вставленный текст поста;
- один пост может дать несколько draft'ов;
- каждый draft подтверждается inline-кнопками approve/reject;
- source URL bare Telegram post / public channel forward / Instagram link добавляется в `PlaceLink`
  по тем же правилам, что в Mini App. Map URL остается в `Location.url`.

`/start` отдельно уведомляет админа (`ADMIN_TG_ID`) с username/именем/id, языком Telegram
и deep-link payload. Если payload нет, это прямой заход: поиск Telegram, профиль бота,
кнопка Start или обычная ссылка без `?start=...`. Для рекламных источников нужно
использовать ссылки вида:

```text
https://t.me/certified7overBot?start=ads_instagram
```

Тогда в уведомлении будет `Источник: ads_instagram`. Отключается флагом:

```bash
BOT_START_NOTIFY_ENABLED="0"
sudo systemctl restart certified-loverboy.service
```

Пользовательский ответ на `/start` содержит inline web_app-кнопку `Открыть приложение`.
URL берётся из `TELEGRAM_WEB_APP_URL`, fallback: `https://vacanator.xyz/`.

## Данные и модель

Основные таблицы:
- `DateIdea` — место пользователя, с `telegramUserId`;
- `Location` — адрес/метро/координаты/map URL, несколько на одно место;
- `PlaceLink` — произвольные ссылки: Instagram, сайт, бронирование, исходный пост;
- `PendingImport` — bot draft до approve/reject;
- `ImportQuota` — учет попыток импорта, активен только при `LINK_IMPORT_LIMIT`;
- `UserSettings` — язык пользователя;
- `SupportMessage` — durable copy support-сообщений;
- `AnalyticsEvent` — self-hosted продуктовая аналитика.

Важное решение по ссылкам:
- `Location.url` — только ссылка на карту/локацию;
- обычные ссылки не должны попадать в `Location.url`;
- non-map links идут в `PlaceLink`;
- legacy markdown `Ссылка:` тоже разводится по этой логике.

## Аналитика

Текущий pipeline self-hosted, без внешнего сервиса.

Один вход:
- `src/lib/analytics.ts::trackEvent()`

Sinks:
- SQLite `AnalyticsEvent`;
- JSONL file;
- Telegram DM stream админу.

`trackEvent()` целиком пропускает вызов (ни один sink не срабатывает), если `telegramUserId ===
ADMIN_TG_ID` — свои собственные действия (тестирование, тыканье в приложение) не должны
засорять аналитику и не должны прилетать себе же в личку. Аналитика — только про действия
остальных пользователей.

На проде сейчас включено:

```bash
ANALYTICS_ENABLED="1"
ANALYTICS_DB_ENABLED="1"
ANALYTICS_FILE_ENABLED="1"
ANALYTICS_LOG_PATH="./data/analytics-events.jsonl"
ANALYTICS_TELEGRAM_ENABLED="1"
BOT_START_NOTIFY_ENABLED="1"
TELEGRAM_WEB_APP_URL="https://vacanator.xyz/"
```

Файл на сервере:

```bash
/srv/web/app/certified-loverboy/app/data/analytics-events.jsonl
```

Как поставить аналитику на паузу:

```bash
cd /srv/web/app/certified-loverboy/app
sudo sed -i 's/^ANALYTICS_ENABLED=.*/ANALYTICS_ENABLED="0"/' .env
sudo systemctl restart certified-loverboy.service
```

Как выключить только поток в личку:

```bash
cd /srv/web/app/certified-loverboy/app
sudo sed -i 's/^ANALYTICS_TELEGRAM_ENABLED=.*/ANALYTICS_TELEGRAM_ENABLED="0"/' .env
sudo systemctl restart certified-loverboy.service
```

Как выключить только JSONL:

```bash
cd /srv/web/app/certified-loverboy/app
sudo sed -i 's/^ANALYTICS_FILE_ENABLED=.*/ANALYTICS_FILE_ENABLED="0"/' .env
sudo systemctl restart certified-loverboy.service
```

Что покрыто analytics events:
- app open;
- screen views;
- tab navigation;
- filters/sort;
- add panel and add mode;
- place form actions: add/remove location/link, picker, submit/cancel/validation fail;
- place list/detail/create/update/delete;
- link import start/parsed/failed with reason;
- file import UI path, even though file import is hidden by feature flag;
- export token/download;
- support start/submit;
- language changed;
- quota viewed;
- bot commands;
- `/usage`;
- `/start` with start payload;
- bot import flows;
- pending draft created;
- approve/reject/stale callback;
- ignored bot messages.

Privacy/current logging policy:
- analytics logs metadata, not full support text;
- analytics logs text length, not pasted post/support body;
- analytics logs ids, source, counts, host, reason, not full descriptions;
- real support text stays in `SupportMessage`;
- real place content stays in `DateIdea`/`Location`/`PlaceLink`.

## `/usage`

Bot command `/usage` restored and admin-only:
- allowed only for `ADMIN_TG_ID`;
- reads cached HTML report from `data/usage-report-latest.html`;
- does not run `journalctl` from the Next process.

Reason: web app runs as `loverboy`, and direct journal reads from that process can return
empty/zero usage because of permissions. The systemd monitor runs as root and updates the cache.

Usage monitor:
- script: `scripts/usageReport.mjs`
- systemd service template: `certified-loverboy-usage-monitor@.service`
- hourly timer: alerts and cache refresh;
- daily timer: daily report and cache refresh.

Current daily report includes:
- Workers AI neurons/tokens/failures;
- Brave Search quota if present;
- service/disk/memory health;
- active users for last 24h;
- bot starts;
- places created by source;
- top analytics events for last 24h.

## Support

Support exists in two surfaces:
- bot `/support <text>`;
- Profile tab support form.

Both call shared `submitSupportMessage()`:
- writes durable row to `SupportMessage`;
- forwards message to `ADMIN_TG_ID` in Telegram.

Analytics only logs `support_submitted` with surface/username/textLength, not full support text.

## Export

Export is in Profile tab:
- button calls `/api/export/token`;
- token carries `telegramId`;
- `/api/export?token=...` returns zip scoped to that user;
- zip includes `PlaceLink` and writes links back into markdown.

Analytics logs:
- `export_token_created`;
- `export_downloaded` with count and bytes.

## Deployment

Normal deploy:

```bash
ssh -o BatchMode=yes root@2.26.91.146
sudo bash /srv/web/app/certified-loverboy/app/scripts/deploy.sh
```

Deploy script behavior:
- `npm ci` only if dependencies changed;
- `prisma migrate deploy` only if new migrations exist;
- `prisma generate` only if schema changed;
- `next build` and service restart when there is something to deploy;
- prints service active status and HTTPS check.

Last successful checks before new-server migration:
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- server deploy build;
- `certified-loverboy.service` active;
- HTTPS returned `200`;
- Telegram webhook switched to `https://vacanator.xyz/api/telegram/webhook`;
- Telegram webhook was forced to `ip_address=2.26.91.146`; `pending_update_count` returned to `0`;
- JSONL file received analytics events.

## Backups and restore

SQLite database:

```bash
/srv/web/app/certified-loverboy/app/data/app.db
```

Backups:
- script: `scripts/backupDb.mjs`;
- timer: `certified-loverboy-backup.timer`;
- path: `data/backups/app-<timestamp>.db`;
- keeps last 30 local snapshots;
- this protects against bad migrations/deletes, not full VPS loss.

Restore procedure is in `docs/RESTORE.md`.

## Known Operational Notes

- `prisma migrate dev` can fail on shadow DB replay because of historical migration ordering; prefer hand-written migration + `prisma migrate deploy`. Confirmed again during the 2026-07-27 migration: a fresh `prisma migrate deploy` from an empty DB fails on `20260721032000_add_swipe_description` (duplicate column) because an earlier migration (`20260721003832_deck_default_visible`) already redefines the table with that column baked in. Fix: `npx prisma migrate resolve --applied 20260721032000_add_swipe_description`, then re-run `migrate deploy`.
- `npm run build` may fail if an interrupted build left `.next/turbopack`; remove that directory and rebuild.
- New server has no VPN stack — port `443` is free and used directly by nginx for this app (no more `:8443` workaround).
- `pre fill data .zip` is local untracked data and should not be accidentally committed.
- Telegram BotFather command menu should include:
  - `start - Что я умею`
  - `support - Написать в поддержку`
  - `usage - Usage-отчёт (admin)`

## Instagram import (pilot)

Bot understands a bare reel/post link (`instagram.com/reel|reels|p|tv/...`) as its own import
source, alongside Yandex Maps / Telegram post links:
- downloads the audio track via `yt-dlp` (system binary, not npm — see docs/RESTORE.md), best-
  effort scrapes the caption too, transcribes the audio with Workers AI Whisper
  (`CLOUDFLARE_WHISPER_MODEL`), then feeds transcript+caption through the same multi-place
  extraction pipeline as Telegram posts (`parsePostTextMulti`);
- gated by `instagramImportAllowed()` (`src/lib/instagramFeature.ts`, shared between the bot
  webhook and the in-app Link tab): always on for `ADMIN_TG_ID`, everyone else needs
  `INSTAGRAM_IMPORT_ENABLED="1"`;
- shares the same `ImportQuota`/`LINK_IMPORT_LIMIT` as other bot imports;
- `instagram_import_gated` analytics event fires when a non-pilot user tries it, to gauge demand
  before flipping the flag;
- known limitation: catches spoken narration only, not text burned into the video frame; success
  rate against Instagram's anti-scraping measures is unverified until tested live on the server.
- also reachable from the Mini App's own "+" → Link tab (`/api/date-ideas/from-link`), not just
  the bot -- same detection, same pilot gate, same quota. Telegram post links work there too,
  via `fetchTelegramPostText()` + `parsePostTextMulti()`, same as the bot's post-link handler.
  `findInstagramLink`/`findTelegramPostLink` live in `src/lib/coords.ts` (pure regex, no heavy
  deps) so the client-side link-input field can clean pasted text without pulling in
  `socialImport.ts`'s server-only `yt-dlp`/AI dependencies; `socialImport.ts` re-exports both for
  existing server-side importers.

## Timed events (pilot)

A place can optionally be a one-time dated event (concert, show, tournament...) instead of a
plain evergreen place -- no separate entity, just nullable columns on `DateIdea`:
- `eventStartsAt` / `eventEndsAt` (`DateTime?`, both null for an ordinary place). A time of
  exactly midnight means "no time known" (not literally midnight) -- accepted simplification
  for a personal tracker, see `formatEventWhen()` in `src/lib/i18n.ts`.
- `reminderAt` / `reminderSentAt` (`DateTime?`) power one-shot Telegram reminders for dated
  events. `reminderAt` is user-selected, `reminderSentAt` is written by the server timer after
  delivery so the same reminder does not repeat. Editing a reminder to a different instant resets
  `reminderSentAt` to null.
- gated by `eventsFeatureEnabled()` (`src/lib/eventsFeature.ts`): always on for `ADMIN_TG_ID`,
  everyone else needs `EVENTS_FEATURE_ENABLED="1"`. Gate is checked at every write path (manual
  form via `/api/date-ideas(/[id])`, bot approve-callback creation) and at parse time (the
  multi-place LLM prompt only offers the event schema fields when the requesting chat is
  allowed, so a non-pilot user's extracted fields are always null rather than just discarded).
- manual entry: `DateIdeaForm` shows a "When" section (native date+time inputs, start required
  before end can be entered) only when `features.events` comes back true from `/api/me`. The
  date/time controls use a compact adaptive grid, not fixed `grid-cols-2`: they stack on narrow
  edit forms and the time field stays fixed-width on wider phones. Reminder is a separate card
  below the date section: toggle + native `<select>` with five preset offsets (`15m`, `1h`,
  `6h`, `1d`, `2d`) from `eventStartsAt`; event time is required for reminders and past
  reminders are rejected client-side.
- import: `cloudflareAi.ts`'s multi-place prompt asks for `eventStartDate/Time` +
  `eventEndDate/Time` (separate YYYY-MM-DD / HH:MM strings, today's date injected so relative
  dates like "завтра"/"в эту пятницу" resolve correctly) only for a permanent-venue post is
  explicitly told NOT to fill them just because a date is mentioned in passing (a promo
  deadline, opening year, hours). `socialImport.ts` combines the raw strings into ISO instants.
  Scoped to Telegram-post/Instagram parsing only -- the Yandex Maps link path never asks for
  event fields (a map listing describes a permanent venue, not a one-time occurrence).
- UI: Ideas Storage pins any place with a future `eventStartsAt` to the top of the list (soonest
  first), ahead of whatever sort is selected -- a past event just falls back into normal sort,
  same as a plain place. Card and place-detail screen show a "When" badge
  (`CalendarClock` icon + `formatEventWhen()`) when set. Storage event cards use a translucent
  glass surface with an internal centered radial-gradient light source clipped inside the rounded
  card; there is no left-side event stripe or external glow bleeding outside the card. Future
  event cards also show a compact countdown to the right of the date badge: more than 24 hours
  uses days+hours, less than 24 hours uses hours+minutes.
- delivery: `scripts/sendReminders.mjs` reads due rows (`reminderAt <= now`,
  `reminderSentAt is null`), sends an HTML Telegram message to `telegramUserId` with title,
  event date, reminder time, first location, price and short description, plus an inline Web App
  button to `/place/<id>`, then writes `reminderSentAt`. Systemd unit/timer live in `deploy/`;
  `scripts/deploy.sh` installs/enables `certified-loverboy-reminders.timer` after a deploy.
  `REMINDERS_ENABLED=0` disables sending without code changes; `REMINDERS_BATCH_LIMIT` defaults
  to 50 due reminders per run.
- Prod verified 2026-07-28: `EVENTS_FEATURE_ENABLED` is absent/false in `.env`; DB rows with
  `eventStartsAt is not null` belong only to `ADMIN_TG_ID=504196424` (1 row at verification).

## Open Risks / Follow-Ups

- Telegram analytics stream is intentionally noisy while user count is low. If it gets too noisy, disable `ANALYTICS_TELEGRAM_ENABLED` and rely on SQLite/JSONL.
- Start notifications stay separate from analytics stream, so `BOT_START_NOTIFY_ENABLED=1` can remain on even if `ANALYTICS_TELEGRAM_ENABLED=0`.
- JSONL is local to the VPS. If long-term retention matters, add rotation/offsite upload later.
- Backups are local to the same VPS. Offsite backups are still not implemented.
- Import limit is currently unlimited. Flip `LINK_IMPORT_LIMIT` when the product should enforce a cap.
- File import UI is hidden by `SHOW_FILE_IMPORT=false`, but code path remains.
- Monetization/subscription via Telegram Stars is not implemented yet.
- Instagram import is a pilot behind `INSTAGRAM_IMPORT_ENABLED` — needs live testing on the
  server (yt-dlp/ffmpeg installed, real reel links) before opening it up beyond `ADMIN_TG_ID`.
- Timed events is a pilot behind `EVENTS_FEATURE_ENABLED` — needs live testing (manual entry +
  bot import against real event posts, plus reminder delivery from the systemd timer) before
  opening it up beyond `ADMIN_TG_ID`.
