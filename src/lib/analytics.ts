import { prisma } from "@/lib/db";
import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";
import { sendTelegramMessage } from "@/lib/telegram";

type AnalyticsProperties = Record<string, unknown>;

const MAX_STRING_LENGTH = 300;
const MAX_ARRAY_LENGTH = 20;
const MAX_OBJECT_KEYS = 30;

function envFlag(name: string, defaultValue: boolean): boolean {
  const value = process.env[name];
  if (value === undefined || value === "") return defaultValue;
  return !["0", "false", "off", "no"].includes(value.toLowerCase());
}

function analyticsEnabled() {
  return envFlag("ANALYTICS_ENABLED", true);
}

function analyticsDbEnabled() {
  return envFlag("ANALYTICS_DB_ENABLED", true);
}

function analyticsFileEnabled() {
  return envFlag("ANALYTICS_FILE_ENABLED", false);
}

function analyticsTelegramEnabled() {
  return envFlag("ANALYTICS_TELEGRAM_ENABLED", false);
}

function analyticsFilePath() {
  return process.env.ANALYTICS_LOG_PATH || path.join(process.cwd(), "data/analytics-events.jsonl");
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}...` : value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return depth >= 2 ? `[${value.length} items]` : value.slice(0, MAX_ARRAY_LENGTH).map((item) => sanitizeValue(item, depth + 1));
  if (typeof value === "object") {
    if (depth >= 2) return "[object]";
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, MAX_OBJECT_KEYS)
        .map(([key, item]) => [key, sanitizeValue(item, depth + 1)])
    );
  }
  return String(value);
}

function sanitizeProperties(properties?: AnalyticsProperties): AnalyticsProperties | undefined {
  return properties ? (sanitizeValue(properties) as AnalyticsProperties) : undefined;
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function appendAnalyticsFile(event: {
  ts: string;
  name: string;
  telegramUserId: string | null;
  username: string | null;
  properties?: AnalyticsProperties;
}) {
  const filePath = analyticsFilePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await appendFile(filePath, `${JSON.stringify(event)}\n`, { encoding: "utf8" });
}

async function notifyAnalyticsTelegram(event: {
  ts: string;
  name: string;
  telegramUserId: string | null;
  username: string | null;
  properties?: AnalyticsProperties;
}) {
  const adminId = process.env.ADMIN_TG_ID;
  if (!adminId) return;

  const who = event.username
    ? `@${escapeHtml(event.username)} (${escapeHtml(event.telegramUserId ?? "?")})`
    : escapeHtml(event.telegramUserId ?? "anonymous");
  const properties = event.properties ? `\n<pre>${escapeHtml(JSON.stringify(event.properties, null, 2))}</pre>` : "";
  await sendTelegramMessage(
    adminId,
    [
      "<b>analytics</b>",
      `<code>${escapeHtml(event.name)}</code>`,
      `user: ${who}`,
      `<i>${escapeHtml(event.ts)}</i>${properties}`,
    ].join("\n"),
    { parseMode: "HTML", disableWebPagePreview: true }
  );
}

async function runSink(name: string, eventName: string, callback: () => Promise<void>) {
  try {
    await callback();
  } catch (err) {
    console.log(`[analytics] ${name} sink failed event=${eventName}: ${err instanceof Error ? err.message : err}`);
  }
}

/** Minimal self-hosted event log -- one row per call. Never throws: a hiccup writing an
 *  analytics row must not fail the real user-facing action it's attached to.
 *  `username` is the Telegram @handle (without @), when known at the call site -- denormalized
 *  onto the row so "who did this" is readable without joining against live user state. */
export async function trackEvent(
  name: string,
  telegramUserId: string | null,
  properties?: AnalyticsProperties,
  username?: string | null
): Promise<void> {
  if (!analyticsEnabled()) return;

  const safeProperties = sanitizeProperties(properties);
  const event = {
    ts: new Date().toISOString(),
    name,
    telegramUserId,
    username: username ?? null,
    properties: safeProperties,
  };

  if (analyticsDbEnabled()) {
    await runSink("db", name, async () => {
      await prisma.analyticsEvent.create({
        data: {
          name,
          telegramUserId,
          username: username ?? null,
          properties: safeProperties ? JSON.stringify(safeProperties) : null,
        },
      });
    });
  }

  if (analyticsFileEnabled()) {
    await runSink("file", name, async () => {
      await appendAnalyticsFile(event);
    });
  }

  if (analyticsTelegramEnabled()) {
    await runSink("telegram", name, async () => {
      await notifyAnalyticsTelegram(event);
    });
  }
}
