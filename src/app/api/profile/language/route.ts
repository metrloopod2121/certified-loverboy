import { NextResponse } from "next/server";
import { requireAuth, isAuthUser } from "@/lib/apiAuth";
import { getUserLanguage, setUserLanguage } from "@/lib/userSettings";
import { isLang } from "@/lib/i18n";

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  const language = await getUserLanguage(auth.telegramId);
  return NextResponse.json({ language });
}

export async function PATCH(request: Request) {
  const auth = requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  const body = await request.json();
  if (!isLang(body?.language)) {
    return NextResponse.json({ error: "Invalid language" }, { status: 400 });
  }

  await setUserLanguage(auth.telegramId, body.language);
  return NextResponse.json({ language: body.language });
}
