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
