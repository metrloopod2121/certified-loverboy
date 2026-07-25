import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_SECONDS = 120;

function sign(telegramId: string, exp: number, secret: string): string {
  return createHmac("sha256", secret).update(`export:${telegramId}:${exp}`).digest("hex");
}

/** Short-lived signed token so /api/export can be reached by plain navigation or
 *  Telegram.WebApp.downloadFile — neither can attach the usual x-telegram-init-data header.
 *  Carries the requesting user's id so the export stays scoped to their own data. */
export function mintExportToken(telegramId: string): string | null {
  const secret = process.env.TELEGRAM_BOT_TOKEN;
  if (!secret) return null;
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  return `${telegramId}.${exp}.${sign(telegramId, exp, secret)}`;
}

export function verifyExportToken(token: string | null): string | null {
  if (!token) return null;
  const secret = process.env.TELEGRAM_BOT_TOKEN;
  if (!secret) return null;

  const [telegramId, expRaw, sig] = token.split(".");
  const exp = Number(expRaw);
  if (!telegramId || !exp || !sig) return null;
  if (Math.floor(Date.now() / 1000) > exp) return null;

  const expected = Buffer.from(sign(telegramId, exp, secret));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  return telegramId;
}
