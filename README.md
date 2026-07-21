# certified-loverboy

Telegram Mini App для сбора идей свиданий (Москва) и совместного выбора через свайп — на двоих: владелец и партнёрша.

- Стек: Next.js (App Router) + Prisma/SQLite + Leaflet (OpenStreetMap)
- Auth: без пароля, через Telegram `initData`, роль по telegram user id (`OWNER_TG_ID` / `PARTNER_TG_ID` в `.env`)
- Бот: @certified7overBot

## Разработка

```bash
npm install
npx prisma migrate dev   # или migrate deploy, если только применяешь готовые миграции
npm run dev
```

Требует `.env` (см. `.env.example`): `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `OWNER_TG_ID`, `PARTNER_TG_ID`.

Локальный дебаг вне Telegram: `?debug_init=<валидный initData>` в URL (см. `src/lib/apiClient.ts`).

## Деплой

Прод — VPS Latvia (`31.76.0.133`), сервис `certified-loverboy.service`, порт 3101, за nginx на `https://vacanator.xyz:8443/` (порт 443 занят VPN-стеком на этом сервере, туда не лезем).

Обычный деплой одной командой на сервере:

```bash
sudo bash /srv/web/app/certified-loverboy/app/scripts/deploy.sh
```

Скрипт сам решает, что нужно: `npm ci` — только если менялся `package.json`/lock, `prisma migrate deploy` — только если появилась новая миграция, `prisma generate` — только если менялась `schema.prisma`. Сборка и рестарт сервиса — всегда, если вообще было что пуллить.

Что важно про сервер:
- Порт **443 — не трогать**, там VPN (Amnezia Xray, docker). Наше HTTPS — на **8443**.
- Владелец файлов приложения — пользователь `loverboy`, не root.
- SQLite-база: `data/app.db` — перед структурными миграциями стоит бэкапить (`cp data/app.db data/app.db.bak-$(date +%Y%m%d%H%M%S)`).

Подробности изменений — `docs/CHANGELOG.md`.
