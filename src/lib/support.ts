import { prisma } from "@/lib/db";
import { sendTelegramMessage } from "@/lib/telegram";

/** Logs a support message (durable copy, in case the Telegram DM to the admin is missed) and
 *  forwards it to ADMIN_TG_ID -- shared by the bot's /support command and the in-app Support
 *  form on the Profile tab, so a message sent either way lands the same place. */
export async function submitSupportMessage(telegramUserId: string, username: string | null, text: string) {
  await prisma.supportMessage.create({ data: { telegramUserId, username, text } });

  const adminId = process.env.ADMIN_TG_ID;
  if (adminId) {
    await sendTelegramMessage(adminId, `🆘 Support от ${username ?? `id ${telegramUserId}`}:\n${text}`);
  }
}
