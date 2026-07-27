import { NextResponse } from "next/server";
import { requireAuth, isAuthUser } from "@/lib/apiAuth";
import { getImportQuotaStatus } from "@/lib/importQuota";
import { trackEvent } from "@/lib/analytics";

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (!isAuthUser(auth)) return auth;

  const quota = await getImportQuotaStatus(auth.telegramId);
  await trackEvent(
    "import_quota_viewed",
    auth.telegramId,
    { remaining: quota.remaining, limit: quota.limit },
    auth.user.username
  );
  return NextResponse.json({ remaining: quota.remaining });
}
