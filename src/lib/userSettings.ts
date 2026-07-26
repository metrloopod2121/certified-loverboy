import { prisma } from "@/lib/db";
import { DEFAULT_LANG, isLang, type Lang } from "@/lib/i18n";

export async function getUserLanguage(telegramUserId: string): Promise<Lang> {
  const settings = await prisma.userSettings.findUnique({ where: { telegramUserId } });
  return settings && isLang(settings.language) ? settings.language : DEFAULT_LANG;
}

export async function setUserLanguage(telegramUserId: string, language: Lang): Promise<void> {
  await prisma.userSettings.upsert({
    where: { telegramUserId },
    update: { language },
    create: { telegramUserId, language },
  });
}
