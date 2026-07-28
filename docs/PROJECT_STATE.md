# Project State

Актуальный снимок состояния проекта на 2026-07-27. Этот файл нужен как "память"
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
- HTTPS: `https://vacanator.xyz/` (порт 443 напрямую, без `:8443` — сервер свободен от VPN)
- bot: `@certified7overBot`
- latest deployed commit: `33bf1ea Add start mini app button`

**Старый сервер `31.76.0.133` больше не используется для этого проекта — НЕ деплоить туда.**
Сервис там пока оставлен выключенным/остановленным как временный откат, домен на него больше
не резолвится. На нём по-прежнему живёт VPN-стек и отдельный проект `moPlaces`
(`moplaces.vacanator.xyz`) — их не трогать.

Локально рабочее дерево после последнего деплоя чистое, кроме untracked
`pre fill data .zip`; этот zip не относится к текущим изменениям и не трогался.

## Текущий UI

В Mini App три основных таба:
- Ideas Storage (`/`) — список мест, фильтры tags/metro, сортировки, добавление места вручную или через ссылку (Yandex Maps / Instagram reel-post / Telegram post).
- Map (`/map`) — карта мест с координатами, фильтры tags/metro.
- Profile (`/profile`) — язык, инфо о боте, счетчик импортов по ссылке, support, export.

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
- после парсинга открывается review sheet, сохранение идет обычным `POST /api/date-ideas` с `source: "link_in_app"`.

Импорт через bot:
- прямая ссылка на Yandex Maps;
- forward из Telegram channel;
- голая ссылка на Telegram post;
- вставленный текст поста;
- один пост может дать несколько draft'ов;
- каждый draft подтверждается inline-кнопками approve/reject.

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

Last successful checks before analytics deploy:
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- server deploy build;
- `certified-loverboy.service` active;
- HTTPS returned `200`;
- production webhook `/usage` probe returned `{ "ok": true }`;
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
plain evergreen place -- no separate entity, just two nullable columns on `DateIdea`:
- `eventStartsAt` / `eventEndsAt` (`DateTime?`, both null for an ordinary place). A time of
  exactly midnight means "no time known" (not literally midnight) -- accepted simplification
  for a personal tracker, see `formatEventWhen()` in `src/lib/i18n.ts`.
- gated by `eventsFeatureEnabled()` (`src/lib/eventsFeature.ts`): always on for `ADMIN_TG_ID`,
  everyone else needs `EVENTS_FEATURE_ENABLED="1"`. Gate is checked at every write path (manual
  form via `/api/date-ideas(/[id])`, bot approve-callback creation) and at parse time (the
  multi-place LLM prompt only offers the event schema fields when the requesting chat is
  allowed, so a non-pilot user's extracted fields are always null rather than just discarded).
- manual entry: `DateIdeaForm` shows a "When" section (native date+time inputs, start required
  before end can be entered) only when `features.events` comes back true from `/api/me`.
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
  (`CalendarClock` icon + `formatEventWhen()`) when set.

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
  bot import against real event posts) before opening it up beyond `ADMIN_TG_ID`.
