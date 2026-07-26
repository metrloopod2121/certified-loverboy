#!/usr/bin/env node
// Reads [usage] lines from the systemd journal (Cloudflare AI / Brave Search calls),
// plus basic service/disk/memory health, and reports it to Telegram — either as
// hourly threshold alerts, or a daily digest. Automated via
// deploy/certified-loverboy-usage-monitor@.service (see docs/RESTORE.md / README).

import { execFile as execFileCallback } from "node:child_process";
import { readFile, mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import dotenv from "dotenv";
import Database from "better-sqlite3";

const execFile = promisify(execFileCallback);
const mode = process.argv.find((argument) => argument.startsWith("--mode="))?.split("=")[1] ?? "hourly";

if (!["hourly", "daily"].includes(mode)) {
  throw new Error("Usage: node scripts/usageReport.mjs --mode=hourly|daily");
}

const appDirectory = process.env.CLB_APP_DIRECTORY ?? process.cwd();
const envPath = process.env.CLB_ENV_FILE ?? path.join(appDirectory, ".env");
const statePath = process.env.CLB_USAGE_MONITOR_STATE ?? "/var/lib/certified-loverboy-usage-monitor/state.json";
const journalFixturePath = process.env.CLB_USAGE_MONITOR_JOURNAL_FILE;
const dryRun = process.env.CLB_USAGE_MONITOR_DRY_RUN === "1";

dotenv.config({ path: envPath, quiet: true });

const moscowDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Moscow",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const numberFormatter = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });
const moscowTimestampFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Europe/Moscow",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});
const moscowResetFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Europe/Moscow",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

function formatNumber(value) {
  return numberFormatter.format(value ?? 0);
}

function formatPercent(value) {
  return `${numberFormatter.format(value)}%`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatBytes(value) {
  if (!Number.isFinite(value) || value < 0) return "n/a";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let amount = value;
  let index = 0;

  while (amount >= 1024 && index < units.length - 1) {
    amount /= 1024;
    index += 1;
  }

  return `${numberFormatter.format(amount)} ${units[index]}`;
}

function asNumber(value) {
  if (value === undefined || value === null || value === "?" || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

// Cloudflare Workers AI resets its daily free allocation at 00:00 UTC.
function cloudflareDayStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function nextCloudflareReset(now = new Date()) {
  const start = cloudflareDayStart(now);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

async function command(binary, args) {
  try {
    const { stdout } = await execFile(binary, args, {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout.trim();
  } catch (error) {
    const detail = error.stderr?.trim() || error.message;
    console.error(`[usage-monitor] ${binary} failed: ${detail}`);
    return "";
  }
}

async function loadJournal() {
  if (journalFixturePath) return readFile(journalFixturePath, "utf8");
  return command("journalctl", [
    "-u",
    "certified-loverboy.service",
    "--since",
    cloudflareDayStart().toISOString(),
    "--no-pager",
    "-o",
    "cat",
  ]);
}

function parseUsage(journal) {
  const usage = {
    cloudflareAi: { requests: 0, failures: 0, neurons: 0, tokens: 0 },
    braveSearch: { requests: 0, failures: 0, remaining: null, limit: null },
  };

  for (const line of journal.split("\n")) {
    const cloudflareSuccess = line.match(/\[usage\] cloudflare-ai neurons=([^\s]+) tokens=([^\s]+)/);
    if (cloudflareSuccess) {
      usage.cloudflareAi.requests += 1;
      usage.cloudflareAi.neurons += asNumber(cloudflareSuccess[1]) ?? 0;
      usage.cloudflareAi.tokens += asNumber(cloudflareSuccess[2]) ?? 0;
      continue;
    }

    if (/\[usage\] cloudflare-ai request failed status=\d+/.test(line)) {
      usage.cloudflareAi.failures += 1;
      continue;
    }

    const braveSearch = line.match(/\[usage\] brave-search status=(\d+) remaining=([^\s]+) limit=([^\s]+)/);
    if (braveSearch) {
      const status = Number(braveSearch[1]);
      usage.braveSearch.requests += 1;
      if (status < 200 || status >= 300) usage.braveSearch.failures += 1;
      usage.braveSearch.remaining = asNumber(braveSearch[2]);
      usage.braveSearch.limit = asNumber(braveSearch[3]);
    }
  }

  return usage;
}

function parseSystemdProperties(output) {
  const values = Object.fromEntries(
    output
      .split("\n")
      .map((line) => line.split("=", 2))
      .filter(([key, value]) => key && value !== undefined),
  );

  return {
    memoryCurrent: asNumber(values.MemoryCurrent),
    memoryMax: asNumber(values.MemoryMax),
    restartCount: asNumber(values.NRestarts) ?? 0,
  };
}

function parseDisk(output) {
  const columns = output.split("\n").at(-1)?.trim().split(/\s+/) ?? [];
  const totalKilobytes = asNumber(columns[1]);
  const usedKilobytes = asNumber(columns[2]);

  if (!totalKilobytes || usedKilobytes === null) return { usedPercent: null, freeBytes: null };
  return {
    usedPercent: (usedKilobytes / totalKilobytes) * 100,
    freeBytes: (totalKilobytes - usedKilobytes) * 1024,
  };
}

async function collectHealth() {
  const [serviceStatus, serviceProperties, disk] = await Promise.all([
    command("systemctl", ["is-active", "certified-loverboy.service"]),
    command("systemctl", [
      "show",
      "certified-loverboy.service",
      "--property=MemoryCurrent",
      "--property=MemoryMax",
      "--property=NRestarts",
    ]),
    command("df", ["-Pk", "/"]),
  ]);

  return {
    serviceStatus: serviceStatus || "unknown",
    ...parseSystemdProperties(serviceProperties),
    ...parseDisk(disk),
  };
}

function resolveDatabasePath() {
  const raw = process.env.DATABASE_URL ?? "file:./data/app.db";
  const relative = raw.replace(/^file:/, "");
  return path.isAbsolute(relative) ? relative : path.join(appDirectory, relative);
}

// Product analytics (AnalyticsEvent rows written by src/lib/analytics.ts) -- read straight
// off the app's own SQLite file rather than through the app process, same as backupDb.mjs.
function collectAnalytics() {
  const empty = { placesBySource: [], botStarts: 0 };
  try {
    const db = new Database(resolveDatabasePath(), { readonly: true, fileMustExist: true });
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const placesBySource = db
      .prepare(
        `SELECT COALESCE(json_extract(properties, '$.source'), 'unknown') AS source, COUNT(*) AS count
         FROM AnalyticsEvent
         WHERE name = 'place_created' AND createdAt >= ?
         GROUP BY source
         ORDER BY count DESC`,
      )
      .all(since);

    const botStarts = db
      .prepare(`SELECT COUNT(*) AS count FROM AnalyticsEvent WHERE name = 'bot_start' AND createdAt >= ?`)
      .get(since).count;

    db.close();
    return { placesBySource, botStarts };
  } catch (error) {
    console.error(`[usage-monitor] analytics query failed: ${error.message}`);
    return empty;
  }
}

async function readState() {
  try {
    return JSON.parse(await readFile(statePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return { alerts: {} };
    throw error;
  }
}

async function saveState(state) {
  await mkdir(path.dirname(statePath), { recursive: true, mode: 0o700 });
  const temporaryPath = `${statePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  await rename(temporaryPath, statePath);
}

function alertKey(name) {
  return `${name}:${moscowDateFormatter.format(new Date())}`;
}

function collectAlerts(state, usage, health, cloudflareDailyLimit) {
  const alerts = [];
  state.alerts ??= {};

  const oncePerDay = (name, text) => {
    const key = alertKey(name);
    if (state.alerts[key]) return;
    state.alerts[key] = true;
    alerts.push(text);
  };

  if (health.serviceStatus !== "active") {
    if (state.lastServiceStatus !== health.serviceStatus) {
      alerts.push(`API: <b>${escapeHtml(health.serviceStatus)}</b>.`);
    }
  }
  state.lastServiceStatus = health.serviceStatus;

  if (health.usedPercent !== null && health.usedPercent >= 90) {
    oncePerDay("disk-90", `Диск VPS заполнен на <b>${formatPercent(health.usedPercent)}</b>.`);
  } else if (health.usedPercent !== null && health.usedPercent >= 80) {
    oncePerDay("disk-80", `Диск VPS заполнен на <b>${formatPercent(health.usedPercent)}</b>.`);
  }

  if (health.memoryCurrent !== null && health.memoryMax && health.memoryMax > 0) {
    const memoryPercent = (health.memoryCurrent / health.memoryMax) * 100;
    if (memoryPercent >= 90) {
      oncePerDay("memory-90", `Приложение использует <b>${formatPercent(memoryPercent)}</b> лимита памяти.`);
    } else if (memoryPercent >= 80) {
      oncePerDay("memory-80", `Приложение использует <b>${formatPercent(memoryPercent)}</b> лимита памяти.`);
    }
  }

  if (cloudflareDailyLimit > 0) {
    const cloudflarePercent = (usage.cloudflareAi.neurons / cloudflareDailyLimit) * 100;
    if (cloudflarePercent >= 90) {
      oncePerDay("cloudflare-ai-90", `Workers AI использовал <b>${formatPercent(cloudflarePercent)}</b> дневного лимита.`);
    } else if (cloudflarePercent >= 70) {
      oncePerDay("cloudflare-ai-70", `Workers AI использовал <b>${formatPercent(cloudflarePercent)}</b> дневного лимита.`);
    }
  }

  const { remaining, limit } = usage.braveSearch;
  if (remaining !== null && limit && limit > 0) {
    const remainingPercent = (remaining / limit) * 100;
    if (remainingPercent <= 10) {
      oncePerDay("brave-10", `У Brave Search осталось <b>${formatPercent(remainingPercent)}</b> квоты.`);
    } else if (remainingPercent <= 30) {
      oncePerDay("brave-30", `У Brave Search осталось <b>${formatPercent(remainingPercent)}</b> квоты.`);
    }
  }

  return alerts;
}

function buildAnalyticsSection(analytics) {
  const totalPlaces = analytics.placesBySource.reduce((sum, row) => sum + row.count, 0);
  const bySourceText = analytics.placesBySource.length > 0
    ? analytics.placesBySource.map((row) => `${escapeHtml(row.source)}: ${formatNumber(row.count)}`).join(", ")
    : "нет данных";

  return [
    "",
    "<b>Продукт (последние 24ч)</b>",
    `Стартов бота: <code>${formatNumber(analytics.botStarts)}</code>`,
    `Мест создано: <code>${formatNumber(totalPlaces)}</code> (${bySourceText})`,
  ];
}

function buildDailyReport(usage, health, cloudflareDailyLimit, analytics) {
  const now = new Date();
  const cloudflarePercent = cloudflareDailyLimit > 0 ? (usage.cloudflareAi.neurons / cloudflareDailyLimit) * 100 : null;
  const cloudflareRemaining = cloudflareDailyLimit > 0
    ? Math.max(0, cloudflareDailyLimit - usage.cloudflareAi.neurons)
    : null;
  const cloudflareRemainingPercent = cloudflareDailyLimit > 0
    ? (cloudflareRemaining / cloudflareDailyLimit) * 100
    : null;
  const serviceStatus = health.serviceStatus === "active" ? "работает" : health.serviceStatus;
  const braveQuota = usage.braveSearch.remaining === null || usage.braveSearch.limit === null
    ? "нет данных"
    : `<code>${formatNumber(usage.braveSearch.remaining)} / ${formatNumber(usage.braveSearch.limit)}</code>`;
  const lines = [
    "<b>certified-loverboy / отчёт</b>",
    `<i>${moscowTimestampFormatter.format(now)} МСК</i>`,
    "",
    "<b>Сервисы</b>",
    `<b>Workers AI</b>  <code>${formatNumber(usage.cloudflareAi.neurons)} / ${formatNumber(cloudflareDailyLimit)}</code> нейронов с 00:00 UTC${cloudflarePercent === null ? "" : ` / <b>${formatPercent(cloudflarePercent)}</b>`}`,
    `Осталось: <code>${cloudflareRemaining === null ? "нет данных" : formatNumber(cloudflareRemaining)}</code> нейронов${cloudflareRemainingPercent === null ? "" : ` / <b>${formatPercent(cloudflareRemainingPercent)}</b>`}`,
    `Сброс лимита: <code>${moscowResetFormatter.format(nextCloudflareReset(now))} МСК</code>`,
    `${formatNumber(usage.cloudflareAi.requests)} запросов / ${formatNumber(usage.cloudflareAi.tokens)} токенов / ${formatNumber(usage.cloudflareAi.failures)} ошибок`,
    "",
    `<b>Brave Search</b>  осталось: ${braveQuota}`,
    `${formatNumber(usage.braveSearch.requests)} запросов / ${formatNumber(usage.braveSearch.failures)} ошибок`,
    "",
    "<b>Сервер</b>",
    `API: <b>${escapeHtml(serviceStatus)}</b> / ${formatNumber(health.restartCount)} перезапусков`,
    `Память: <code>${formatBytes(health.memoryCurrent)} / ${formatBytes(health.memoryMax)}</code>`,
    `Диск: <code>${health.usedPercent === null ? "нет данных" : formatPercent(health.usedPercent)}</code> занято / ${formatBytes(health.freeBytes)} свободно`,
    ...buildAnalyticsSection(analytics),
  ];

  return lines.join("\n");
}

function buildAlertMessage(alerts) {
  return [
    "<b>certified-loverboy / внимание</b>",
    `<i>${moscowTimestampFormatter.format(new Date())} МСК</i>`,
    "",
    ...alerts.map((alert) => `• ${alert}`),
  ].join("\n");
}

async function sendTelegramMessage(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.ADMIN_TG_ID;

  if (!token || !chatId) {
    throw new Error("TELEGRAM_BOT_TOKEN and ADMIN_TG_ID are required.");
  }

  if (dryRun) {
    console.log(text);
    return;
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });

  if (!response.ok) {
    throw new Error(`Telegram sendMessage failed with status ${response.status}.`);
  }
}

const [journal, health, state] = await Promise.all([loadJournal(), collectHealth(), readState()]);
const usage = parseUsage(journal);
const cloudflareDailyLimit = asNumber(process.env.CLOUDFLARE_AI_DAILY_FREE_NEURONS) ?? 10_000;

if (mode === "daily") {
  const analytics = collectAnalytics();
  await sendTelegramMessage(buildDailyReport(usage, health, cloudflareDailyLimit, analytics));
} else {
  const alerts = collectAlerts(state, usage, health, cloudflareDailyLimit);
  if (alerts.length > 0) await sendTelegramMessage(buildAlertMessage(alerts));
}

await saveState(state);
