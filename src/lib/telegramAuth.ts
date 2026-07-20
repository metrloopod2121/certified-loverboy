import { createHmac } from "crypto";

export type TelegramUser = {
  id: number;
  first_name?: string;
  username?: string;
};

export type AuthUser = {
  telegramId: string;
  role: "OWNER" | "PARTNER";
  user: TelegramUser;
};

const INIT_DATA_MAX_AGE_SECONDS = 24 * 60 * 60;

/** Validates Telegram Mini App initData per https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app */
function validateInitData(initData: string, botToken: string): URLSearchParams | null {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (computedHash !== hash) return null;

  const authDate = Number(params.get("auth_date"));
  if (!authDate || Date.now() / 1000 - authDate > INIT_DATA_MAX_AGE_SECONDS) return null;

  return params;
}

function roleForTelegramId(telegramId: string): "OWNER" | "PARTNER" | null {
  if (telegramId === process.env.OWNER_TG_ID) return "OWNER";
  if (telegramId === process.env.PARTNER_TG_ID) return "PARTNER";
  return null;
}

/** Reads the raw initData string sent by the client (see src/lib/telegramWebApp.ts) and returns the authenticated user, or null. */
export function authenticate(initDataRaw: string | null): AuthUser | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!initDataRaw || !botToken) return null;

  const params = validateInitData(initDataRaw, botToken);
  if (!params) return null;

  const userJson = params.get("user");
  if (!userJson) return null;

  const user = JSON.parse(userJson) as TelegramUser;
  const telegramId = String(user.id);
  const role = roleForTelegramId(telegramId);
  if (!role) return null;

  return { telegramId, role, user };
}

export function authenticateRequest(request: Request): AuthUser | null {
  return authenticate(request.headers.get("x-telegram-init-data"));
}
