# Восстановление базы из бэкапа

Снимки лежат прямо на сервере в `data/backups/app-<timestamp>.db` — консистентный
онлайн-снимок (через `better-sqlite3` backup API, не сырой `cp`), делается раз в
сутки по таймеру `certified-loverboy-backup.timer`, хранится последние 30 штук.

**Важно:** это защита от плохой миграции / случайного удаления данных — снимки
живут на том же диске, что и прод-база. От потери самого VPS целиком это не
защищает (нет копии за пределами сервера). Если это тоже нужно — можно добавить
шаг выгрузки снимка куда-то ещё, отдельным заходом.

## Проверить, что бэкапы вообще делаются

```bash
sudo -u loverboy bash -c 'cd /srv/web/app/certified-loverboy/app && node scripts/backupDb.mjs status'
```

## Откатиться на снимок

```bash
sudo systemctl stop certified-loverboy

cd /srv/web/app/certified-loverboy/app
cp data/app.db "data/app.db.before-restore-$(date +%Y%m%d%H%M%S)"   # на всякий случай
ls -lt data/backups/ | head                                          # выбрать снимок
cp data/backups/app-<TIMESTAMP>.db data/app.db

sudo systemctl start certified-loverboy
curl -sk -o /dev/null -w 'https check: %{http_code}\n' https://127.0.0.1:8443/
```

## Разовая установка таймеров на сервере

Юниты лежат в `deploy/`, но systemd не подхватывает их из репозитория сам —
один раз скопировать и включить (бэкап + мониторинг расхода Cloudflare/Brave квоты):

```bash
sudo cp deploy/certified-loverboy-backup.service deploy/certified-loverboy-backup.timer \
        deploy/certified-loverboy-usage-monitor@.service \
        deploy/certified-loverboy-usage-monitor-hourly.timer \
        deploy/certified-loverboy-usage-monitor-daily.timer \
        /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now certified-loverboy-backup.timer
sudo systemctl enable --now certified-loverboy-usage-monitor-hourly.timer
sudo systemctl enable --now certified-loverboy-usage-monitor-daily.timer
```

Мониторингу нужен `ADMIN_TG_ID` в `.env` приложения — туда шлются алерты и суточный отчёт.

Проверить, что таймеры встали: `systemctl list-timers | grep certified-loverboy`.

## Аналитика: файл, личка, пауза

Продуктовая аналитика пишет события в SQLite `AnalyticsEvent`. На проде также можно держать
JSONL-файл для последующего анализа нейросетью:

```bash
/srv/web/app/certified-loverboy/app/data/analytics-events.jsonl
```

Актуальные флаги в `.env`:

```bash
ANALYTICS_ENABLED="1"             # общий kill-switch
ANALYTICS_DB_ENABLED="1"          # SQLite AnalyticsEvent
ANALYTICS_FILE_ENABLED="1"        # JSONL
ANALYTICS_LOG_PATH="./data/analytics-events.jsonl"
ANALYTICS_TELEGRAM_ENABLED="1"    # каждое событие в личку ADMIN_TG_ID
```

Выключить всё без деплоя:

```bash
cd /srv/web/app/certified-loverboy/app
sudo sed -i 's/^ANALYTICS_ENABLED=.*/ANALYTICS_ENABLED="0"/' .env
sudo systemctl restart certified-loverboy.service
```

Выключить только личку:

```bash
cd /srv/web/app/certified-loverboy/app
sudo sed -i 's/^ANALYTICS_TELEGRAM_ENABLED=.*/ANALYTICS_TELEGRAM_ENABLED="0"/' .env
sudo systemctl restart certified-loverboy.service
```

Проверить последние события:

```bash
tail -n 50 /srv/web/app/certified-loverboy/app/data/analytics-events.jsonl
```

## Bot start notifications

Каждый `/start` отправляет админу отдельное уведомление с username/именем/id и
deep-link payload (`/start <payload>`). Это отдельно от общего analytics stream.

Отключить только эти уведомления:

```bash
cd /srv/web/app/certified-loverboy/app
sudo sed -i 's/^BOT_START_NOTIFY_ENABLED=.*/BOT_START_NOTIFY_ENABLED="0"/' .env
sudo systemctl restart certified-loverboy.service
```
