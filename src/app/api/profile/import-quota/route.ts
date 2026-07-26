import { NextResponse } from "next/server";
import { requireAuth, isAuthUser } from "@/lib/apiAuth";
import { getImportQuotaStatus } from "@/lib/importQuota";

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  const quota = await getImportQuotaStatus(auth.telegramId);
  return NextResponse.json({ remaining: quota.remaining });
}
