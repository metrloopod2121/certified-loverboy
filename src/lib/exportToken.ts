import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_SECONDS = 120;

function sign(exp: number, secret: string): string {
  return createHmac("sha256", secret).update(`export:${exp}`).digest("hex");
}

/** Short-lived signed token so /api/export can be reached by plain navigation or
 *  Telegram.WebApp.downloadFile — neither can attach the usual x-telegram-init-data header. */
export function mintExportToken(): string | null {
  const secret = process.env.TELEGRAM_BOT_TOKEN;
  if (!secret) return null;
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  return `${exp}.${sign(exp, secret)}`;
}

export function verifyExportToken(token: string | null): boolean {
  if (!token) return false;
  const secret = process.env.TELEGRAM_BOT_TOKEN;
  if (!secret) return false;

  const [expRaw, sig] = token.split(".");
  const exp = Number(expRaw);
  if (!exp || !sig) return false;
  if (Math.floor(Date.now() / 1000) > exp) return false;

  const expected = Buffer.from(sign(exp, secret));
  const actual = Buffer.from(sig);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
