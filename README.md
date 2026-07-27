# certified-loverboy

Telegram Mini App для личной базы мест (свиданки, кафе, активности и т.д.) — своя база
на каждый Telegram-аккаунт. Место добавляется вручную, файлом-импортом или через бота:
кинь ссылку на Яндекс.Карты / пост из канала / текст поста — бот распознает место через
LLM и предложит добавить.

- Стек: Next.js (App Router) + Prisma/SQLite + Leaflet (OpenStreetMap)
- Auth: без пароля, через Telegram `initData` — любой Telegram-пользователь получает свой
  изолированный аккаунт (данные скоупятся по telegram id, ничего не расшарено между людьми)
- Бот: @certified7overBot

## Разработка

```bash
npm install
npx prisma migrate dev   # или migrate deploy, если только применяешь готовые миграции
npm run dev
```

Требует `.env` (см. `.env.example`): `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`,
`TELEGRAM_WEBHOOK_SECRET`, `ADMIN_TG_ID`.

Локальный дебаг вне Telegram: `?debug_init=<валидный initData>` в URL (см. `src/lib/apiClient.ts`).

## Импорт через бота

AI-парсинг ссылки/поста сейчас без лимита. Счётчик и будущий лимит живут в
`src/lib/importQuota.ts`: пока `LINK_IMPORT_LIMIT` не задан, в профиле показывается `∞`.
Бот понимает: прямую ссылку на Яндекс.Карты, форвард поста из канала, голую ссылку на
telegram-пост, или просто вставленный текст поста. `/support <текст>` — сообщение уходит
и в БД (`SupportMessage`), и админу в личку (`ADMIN_TG_ID`), чтобы ничего не потерялось.
Каждый `/start` отдельно уведомляет `ADMIN_TG_ID` с ником/именем/id пользователя и
deep-link payload (`?start=...`), если `BOT_START_NOTIFY_ENABLED` не выключен. Если payload
пустой, это прямой заход: поиск Telegram, профиль бота, кнопка Start или обычная ссылка
без `?start=...`. Ответ на `/start` содержит inline-кнопку Mini App, чтобы пользователь
мог открыть приложение прямо из сообщения.

## Аналитика

Все ключевые действия пользователя пишутся в `AnalyticsEvent`: просмотры экранов, навигация,
фильтры, импорт, CRUD мест, экспорт, support, язык, quota, bot-команды, approve/reject.
`ANALYTICS_ENABLED=0` ставит всё на паузу. По умолчанию включена SQLite-запись
(`ANALYTICS_DB_ENABLED=1`); JSONL-файл для выгрузки в LLM включается через
`ANALYTICS_FILE_ENABLED=1` и лежит в `ANALYTICS_LOG_PATH` (default:
`./data/analytics-events.jsonl`). Личные Telegram-сообщения по каждому analytics-событию
включаются отдельным флагом `ANALYTICS_TELEGRAM_ENABLED=1`; на проде этот stream включён,
пока объём пользователей небольшой.

## Публичный бот в BotFather

Чтобы бот был приятно находим и понятен новому человеку:

```
/setdescription   — короткое описание (что делает бот)
/setabouttext     — текст в профиле бота
/setuserpic       — аватарка
/setcommands      — start - Что я умею
                    support - Написать в поддержку
                    usage - Usage-отчёт (admin)
```

## Деплой

Прод — VPS (`2.26.91.146`), сервис `certified-loverboy.service`, порт 3101, за nginx на `https://vacanator.xyz/` (порт 443 напрямую, сервер чистый, без VPN). Старый сервер `31.76.0.133` для этого проекта больше не используется — не деплоить туда.

Обычный деплой одной командой на сервере:

```bash
sudo bash /srv/web/app/certified-loverboy/app/scripts/deploy.sh
```

Скрипт сам решает, что нужно: `npm ci` — только если менялся `package.json`/lock, `prisma migrate deploy` — только если появилась новая миграция, `prisma generate` — только если менялась `schema.prisma`. Сборка и рестарт сервиса — всегда, если вообще было что пуллить.

**После деплоя миграции `20260725120000_multi_tenant_drop_swipes`** — разово прогнать бэкфилл, иначе все существующие места станут никому не видны:

```bash
sudo -u loverboy bash -c 'cd /srv/web/app/certified-loverboy/app && node scripts/backfillOwnerTelegramId.mjs <твой_telegram_id>'
```

Что важно про сервер:
- Порт **443 — не трогать**, там VPN (Amnezia Xray, docker). Наше HTTPS — на **8443**.
- Владелец файлов приложения — пользователь `loverboy`, не root.
- SQLite-база: `data/app.db`. Автобэкап — раз в сутки, см. `docs/RESTORE.md` (там же — разовая установка systemd-таймера).
- Мониторинг расхода Cloudflare/Brave квоты + здоровья сервиса — `scripts/usageReport.mjs`, таймеры `deploy/certified-loverboy-usage-monitor-*.timer` (тоже разовая установка, см. `docs/RESTORE.md`-соседние юниты в `deploy/`).
- `/usage` в боте доступен только `ADMIN_TG_ID` и отправляет последний cached usage-отчёт из `data/usage-report-latest.html` (файл обновляется hourly/daily monitor'ом).

Текущий operational snapshot — `docs/PROJECT_STATE.md`.
Подробности изменений — `docs/CHANGELOG.md`.
