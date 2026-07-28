function envFlag(name: string, defaultValue: boolean): boolean {
  const value = process.env[name];
  if (value === undefined || value === "") return defaultValue;
  return !["0", "false", "off", "no"].includes(value.toLowerCase());
}

/** Pilot gate for the timed-event fields (eventStartsAt/eventEndsAt) -- always on for the
 *  admin's own account so it can be tested against real imports first, everyone else needs
 *  EVENTS_FEATURE_ENABLED="1" once the pilot looks good. Mirrors instagramImportAllowed() in
 *  the webhook route. */
export function eventsFeatureEnabled(telegramUserId: string): boolean {
  const adminId = process.env.ADMIN_TG_ID;
  if (adminId && telegramUserId === adminId) return true;
  return envFlag("EVENTS_FEATURE_ENABLED", false);
}
