import { prisma } from "@/lib/db";
import { DEFAULT_LANG, t, type Lang } from "@/lib/i18n";

const FREE_IMPORT_LIMIT = 5;

export type QuotaResult = { ok: true; remaining: number } | { ok: false };

/** Meters AI-powered link/post imports per Telegram user -- a handful free before a paid
 *  plan exists. Consumes one unit per *attempt*, checked right before the AI call, since even
 *  a failed parse still burns Cloudflare/Brave quota. */
export async function tryConsumeImportQuota(telegramUserId: string): Promise<QuotaResult> {
  const quota = await prisma.importQuota.upsert({
    where: { telegramUserId },
    update: {},
    create: { telegramUserId },
  });

  if (quota.usedCount >= FREE_IMPORT_LIMIT) return { ok: false };

  const updated = await prisma.importQuota.update({
    where: { telegramUserId },
    data: { usedCount: { increment: 1 } },
  });

  return { ok: true, remaining: FREE_IMPORT_LIMIT - updated.usedCount };
}

export function quotaExhaustedMessage(lang: Lang = DEFAULT_LANG): string {
  return t(lang, "quotaExhausted");
}
