#!/usr/bin/env node

import path from "node:path";
import dotenv from "dotenv";
import Database from "better-sqlite3";

const appDirectory = process.env.CLB_APP_DIRECTORY ?? process.cwd();
const envPath = process.env.CLB_ENV_FILE ?? path.join(appDirectory, ".env");
const dryRun = process.env.CLB_REMINDERS_DRY_RUN === "1";

dotenv.config({ path: envPath, quiet: true });

function envFlag(name, defaultValue) {
  const value = process.env[name];
  if (value === undefined || value === "") return defaultValue;
  return !["0", "false", "off", "no"].includes(value.toLowerCase());
}

function databasePathFromUrl(rawUrl) {
  const raw = rawUrl || "file:./data/app.db";
  if (!raw.startsWith("file:")) return raw;

  const withoutScheme = raw.slice("file:".length).split("?")[0];
  const decoded = decodeURIComponent(withoutScheme);
  return path.isAbsolute(decoded) ? decoded : path.resolve(appDirectory, decoded);
}

function parseDbDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  if (typeof value !== "string" || !value.trim()) return null;

  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return new Date(Number(trimmed));
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed) ? `${trimmed}Z` : trimmed;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function compactText(value, maxLength = 420) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}…`;
}

function formatDateTime(lang, value) {
  const date = parseDbDate(value);
  if (!date) return null;

  return new Intl.DateTimeFormat(lang === "en" ? "en-US" : "ru-RU", {
    timeZone: "Europe/Moscow",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function appUrlForPlace(placeId) {
  const base = process.env.TELEGRAM_WEB_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://vacanator.xyz/";
  return new URL(`/place/${placeId}`, base).toString();
}

function reminderMessage(row) {
  const lang = row.language === "en" ? "en" : "ru";
  const eventWhen = formatDateTime(lang, row.eventStartsAt);
  const reminderWhen = formatDateTime(lang, row.reminderAt);
  const description = compactText(row.description);
  const where = [row.address, row.metro ? `${lang === "en" ? "Metro" : "Метро"} ${row.metro}` : null].filter(Boolean).join("\n");

  if (lang === "en") {
    return [
      "<b>⏰ Reminder</b>",
      "",
      `<b>${escapeHtml(row.title)}</b>`,
      eventWhen ? `When: <code>${escapeHtml(eventWhen)}</code>` : null,
      reminderWhen ? `Reminder time: <code>${escapeHtml(reminderWhen)}</code>` : null,
      where ? `Where: ${escapeHtml(where)}` : null,
      row.priceNote ? `Price: ${escapeHtml(row.priceNote)}` : null,
      description ? "" : null,
      description ? escapeHtml(description) : null,
    ].filter(Boolean).join("\n");
  }

  return [
    "<b>⏰ Напоминание</b>",
    "",
    `<b>${escapeHtml(row.title)}</b>`,
    eventWhen ? `Когда: <code>${escapeHtml(eventWhen)}</code>` : null,
    reminderWhen ? `Напомнить: <code>${escapeHtml(reminderWhen)}</code>` : null,
    where ? `Где: ${escapeHtml(where)}` : null,
    row.priceNote ? `Цена: ${escapeHtml(row.priceNote)}` : null,
    description ? "" : null,
    description ? escapeHtml(description) : null,
  ].filter(Boolean).join("\n");
}

class TelegramError extends Error {
  constructor(status, detail) {
    super(`Telegram sendMessage failed: ${status} ${detail}`);
    this.status = status;
  }
}

async function sendTelegramReminder(row) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is required to send reminders.");

  const lang = row.language === "en" ? "en" : "ru";
  const body = {
    chat_id: row.telegramUserId,
    text: reminderMessage(row),
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [[{ text: lang === "en" ? "Open event" : "Открыть событие", web_app: { url: appUrlForPlace(row.id) } }]],
    },
  };

  if (dryRun) {
    console.log(JSON.stringify(body, null, 2));
    return;
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new TelegramError(response.status, detail);
  }
}

if (!envFlag("REMINDERS_ENABLED", true)) {
  console.log("[reminders] disabled by REMINDERS_ENABLED=0");
  process.exit(0);
}

const db = new Database(databasePathFromUrl(process.env.DATABASE_URL));
const now = new Date();
const adminId = process.env.ADMIN_TG_ID || null;
const analyticsEnabled = envFlag("ANALYTICS_ENABLED", true) && envFlag("ANALYTICS_DB_ENABLED", true);

const rows = db.prepare(`
  SELECT
    DateIdea.id,
    DateIdea.telegramUserId,
    DateIdea.title,
    DateIdea.description,
    DateIdea.priceNote,
    DateIdea.eventStartsAt,
    DateIdea.reminderAt,
    FirstLocation.address,
    FirstLocation.metro,
    UserSettings.language
  FROM DateIdea
  LEFT JOIN Location AS FirstLocation ON FirstLocation.id = (
    SELECT id FROM Location WHERE Location.dateIdeaId = DateIdea.id ORDER BY rowid LIMIT 1
  )
  LEFT JOIN UserSettings ON UserSettings.telegramUserId = DateIdea.telegramUserId
  WHERE DateIdea.reminderAt IS NOT NULL
    AND DateIdea.reminderSentAt IS NULL
  ORDER BY DateIdea.reminderAt ASC
`).all();

const dueRows = rows.filter((row) => {
  const reminderAt = parseDbDate(row.reminderAt);
  return reminderAt != null && reminderAt.getTime() <= now.getTime();
});

const batchLimit = Number(process.env.REMINDERS_BATCH_LIMIT || 50);
const dueBatch = dueRows.slice(0, Number.isFinite(batchLimit) && batchLimit > 0 ? batchLimit : 50);
const markSent = db.prepare(`UPDATE DateIdea SET reminderSentAt = ? WHERE id = ? AND reminderSentAt IS NULL`);
const insertAnalytics = db.prepare(`
  INSERT INTO AnalyticsEvent (id, name, telegramUserId, username, properties, createdAt)
  VALUES (?, ?, ?, NULL, ?, CURRENT_TIMESTAMP)
`);

function writeAnalytics(name, telegramUserId, properties) {
  if (!analyticsEnabled || !telegramUserId || telegramUserId === adminId) return;
  try {
    insertAnalytics.run(
      `rem_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      name,
      telegramUserId,
      JSON.stringify(properties)
    );
  } catch (error) {
    console.error(`[reminders] analytics insert failed: ${error instanceof Error ? error.message : error}`);
  }
}

let failedCount = 0;

for (const row of dueBatch) {
  try {
    await sendTelegramReminder(row);
    markSent.run(new Date().toISOString(), row.id);
    writeAnalytics("reminder_sent", row.telegramUserId, { placeId: row.id, reminderAt: row.reminderAt });
    console.log(`[reminders] sent placeId=${row.id} user=${row.telegramUserId}`);
  } catch (error) {
    const status = error instanceof TelegramError ? error.status : null;
    writeAnalytics("reminder_failed", row.telegramUserId, { placeId: row.id, reminderAt: row.reminderAt, status });

    if (status != null && status >= 400 && status < 500 && status !== 429) {
      markSent.run(new Date().toISOString(), row.id);
      console.error(`[reminders] permanent telegram failure placeId=${row.id} status=${status}; marked processed`);
      continue;
    }

    failedCount += 1;
    console.error(`[reminders] failed placeId=${row.id}: ${error instanceof Error ? error.message : error}`);
  }
}

console.log(`[reminders] due=${dueRows.length} processed=${dueBatch.length} failed=${failedCount}`);
if (failedCount > 0) process.exitCode = 1;
