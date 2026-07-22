import { NextResponse } from "next/server";
import { forwardTelegramMessage } from "@/lib/telegram";

type TelegramMessage = {
  message_id: number;
  chat: { id: number };
  from?: { id: number };
};

type TelegramUpdate = {
  message?: TelegramMessage;
};

/** Receives partner messages from Telegram and forwards them unchanged to the owner. */
export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update = (await request.json()) as TelegramUpdate;
  const message = update.message;
  const ownerId = process.env.OWNER_TG_ID;
  const partnerId = process.env.PARTNER_TG_ID;

  if (!message || !ownerId || !partnerId || String(message.from?.id) !== partnerId) {
    return NextResponse.json({ ok: true });
  }

  await forwardTelegramMessage(ownerId, String(message.chat.id), message.message_id);
  return NextResponse.json({ ok: true });
}
