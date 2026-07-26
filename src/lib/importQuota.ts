import { prisma } from "@/lib/db";
import { DEFAULT_LANG, t, type Lang } from "@/lib/i18n";

function importLimit(): number | null {
  const raw = process.env.LINK_IMPORT_LIMIT;
  if (!raw) return null;

  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

export type ImportQuotaStatus = {
  usedCount: number;
  limit: number | null;
  /** `null` means imports are currently unlimited. */
  remaining: number | null;
};

export type QuotaResult = { ok: true; remaining: number | null } | { ok: false };

export async function getImportQuotaStatus(telegramUserId: string): Promise<ImportQuotaStatus> {
  const limit = importLimit();
  const quota = await prisma.importQuota.findUnique({ where: { telegramUserId } });
  const usedCount = quota?.usedCount ?? 0;

  return {
    usedCount,
    limit,
    remaining: limit === null ? null : Math.max(0, limit - usedCount),
  };
}

/** Meters AI-powered link/post imports per Telegram user when LINK_IMPORT_LIMIT is set.
 *  Unset means unlimited. When enabled, consumes one unit per *attempt*, checked right before
 *  the AI call, since even a failed parse still burns Cloudflare/Brave quota. */
export async function tryConsumeImportQuota(telegramUserId: string): Promise<QuotaResult> {
  const limit = importLimit();
  if (limit === null) return { ok: true, remaining: null };

  const quota = await prisma.importQuota.upsert({
    where: { telegramUserId },
    update: {},
    create: { telegramUserId },
  });

  if (quota.usedCount >= limit) return { ok: false };

  const updated = await prisma.importQuota.update({
    where: { telegramUserId },
    data: { usedCount: { increment: 1 } },
  });

  return { ok: true, remaining: Math.max(0, limit - updated.usedCount) };
}

export function quotaExhaustedMessage(lang: Lang = DEFAULT_LANG): string {
  return t(lang, "quotaExhausted");
}
