import { prisma } from "@/lib/db";

/** Minimal self-hosted event log -- one row per call. Never throws: a hiccup writing an
 *  analytics row must not fail the real user-facing action it's attached to. */
export async function trackEvent(
  name: string,
  telegramUserId: string | null,
  properties?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        name,
        telegramUserId,
        properties: properties ? JSON.stringify(properties) : null,
      },
    });
  } catch (err) {
    console.log(`[analytics] failed to record event=${name}: ${err instanceof Error ? err.message : err}`);
  }
}
