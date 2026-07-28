function envFlag(name: string, defaultValue: boolean): boolean {
  const value = process.env[name];
  if (value === undefined || value === "") return defaultValue;
  return !["0", "false", "off", "no"].includes(value.toLowerCase());
}

/** Pilot gate for Instagram reel/post import -- always on for the admin's own account (that's
 *  the point of testing it there first), otherwise behind an explicit flag flipped once the
 *  pilot looks good. Instagram scraping is inherently less reliable than the Yandex/Telegram
 *  sources (login walls, silent reels have no transcript at all), so this ships gated rather
 *  than open to everyone. Shared by the bot webhook and the in-app Link tab. Mirrors
 *  eventsFeatureEnabled() in eventsFeature.ts. */
export function instagramImportAllowed(telegramUserId: string): boolean {
  const adminId = process.env.ADMIN_TG_ID;
  if (adminId && telegramUserId === adminId) return true;
  return envFlag("INSTAGRAM_IMPORT_ENABLED", false);
}
