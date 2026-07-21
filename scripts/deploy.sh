#!/usr/bin/env bash
# Smart deploy for certified-loverboy on the Latvia server.
# Run as root: sudo bash scripts/deploy.sh
#
# Pulls latest main, then only runs the steps the actual diff needs:
# npm ci only if package.json/package-lock.json changed, prisma generate
# only if schema.prisma changed, migrate deploy only if a new migration
# folder was added. Always rebuilds and restarts if there was anything
# to pull (Next.js build has no cheaper incremental path in production).

set -euo pipefail

APP_DIR="/srv/web/app/certified-loverboy/app"
SERVICE="certified-loverboy"
RUN_AS="sudo -u loverboy bash -c"

cd "$APP_DIR"

OLD_HEAD=$($RUN_AS "cd $APP_DIR && git rev-parse HEAD")
$RUN_AS "cd $APP_DIR && git fetch origin"
$RUN_AS "cd $APP_DIR && git pull --ff-only"
NEW_HEAD=$($RUN_AS "cd $APP_DIR && git rev-parse HEAD")

if [ "$OLD_HEAD" = "$NEW_HEAD" ]; then
  echo "Nothing new to deploy (already at $NEW_HEAD)."
  exit 0
fi

echo "Deploying $OLD_HEAD -> $NEW_HEAD"
CHANGED=$($RUN_AS "cd $APP_DIR && git diff --name-only $OLD_HEAD $NEW_HEAD")

if echo "$CHANGED" | grep -qE '^(package\.json|package-lock\.json)$'; then
  echo "-> package.json changed, running npm ci"
  $RUN_AS "cd $APP_DIR && npm ci"
else
  echo "-> no dependency changes, skipping npm ci"
fi

if echo "$CHANGED" | grep -q '^prisma/migrations/'; then
  echo "-> new migration(s) detected, running prisma migrate deploy"
  $RUN_AS "cd $APP_DIR && npx prisma migrate deploy"
else
  echo "-> no new migrations, skipping migrate deploy"
fi

if echo "$CHANGED" | grep -q '^prisma/schema\.prisma$'; then
  echo "-> schema.prisma changed, running prisma generate"
  $RUN_AS "cd $APP_DIR && npx prisma generate"
else
  echo "-> schema unchanged, skipping prisma generate"
fi

echo "-> building"
$RUN_AS "cd $APP_DIR && npm run build"

echo "-> restarting $SERVICE"
systemctl restart "$SERVICE"
sleep 2
systemctl is-active "$SERVICE"

curl -sk -o /dev/null -w 'https check: %{http_code}\n' https://127.0.0.1:8443/
