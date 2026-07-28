export const card =
  "rounded-[22px] border border-[var(--app-outline)]/10 bg-[var(--app-surface)] p-4 shadow-[0_2px_0_rgba(28,26,23,0.08)]";

export const input =
  "w-full rounded-xl border border-[var(--app-outline)]/15 bg-[var(--app-surface)] px-3.5 py-2.5 text-[15px] leading-tight text-[var(--app-ink)] outline-none focus:border-[var(--app-ink)] focus:ring-2 focus:ring-[var(--app-yellow)] placeholder:text-[var(--app-muted)]/55 transition";

export const label = "text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--app-muted)]";

export const buttonPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-[var(--app-ink)] px-5 py-2.5 min-h-11 text-[15px] font-semibold text-[var(--app-canvas)] disabled:opacity-50 active:scale-[0.98] transition";

export const buttonSecondary =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-[var(--app-outline)]/20 bg-[var(--app-surface)] px-5 py-2.5 min-h-11 text-[15px] font-semibold text-[var(--app-ink)] active:scale-[0.98] transition";

export const buttonGhost =
  "inline-flex items-center justify-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-semibold text-[var(--app-ink)] active:opacity-60 transition";

export const pill =
  "inline-flex items-center rounded-full bg-[var(--app-pink)]/25 px-2.5 py-1 text-[12px] font-bold text-[var(--app-ink)] ring-1 ring-[var(--app-outline)]/10";

/** Tag color for a one-time dated event -- blue instead of the default pink, so tags read as
 *  "this one's an event" at a glance too, not just the date badge. */
export const pillBlue =
  "inline-flex items-center rounded-full bg-[var(--app-blue)]/55 px-2.5 py-1 text-[12px] font-bold text-[var(--app-ink)] ring-1 ring-[var(--app-outline)]/10";

/** Shared "this is a one-time event" visual language -- a holo pink/violet/teal gradient with a
 *  soft matching glow, used for the date badge (Storage card, place detail, import review) and
 *  the card's contour glow. Colors are pushed brighter than the rest of the pastel palette on
 *  purpose: an event should read as brighter/louder than an evergreen place, not just differently
 *  tinted. Sizing/layout (padding, text size, gap) stays with each caller since it varies. */
export const eventBadgeColors =
  "bg-gradient-to-r from-[#ff8fd6] via-[#a78bfa] to-[#5fd8c8] text-white shadow-[0_4px_14px_rgba(167,139,250,0.45)] ring-1 ring-white/40";

/** Event card surface in the Storage list -- translucent glass with the light source clipped
 *  inside the rounded card, so the glow spreads toward the edges without bleeding outside. */
export const eventCardGlow =
  "relative isolate overflow-hidden !border-white/55 !bg-[radial-gradient(ellipse_at_50%_45%,rgba(255,143,214,0.46)_0%,rgba(167,139,250,0.32)_32%,rgba(95,216,200,0.18)_58%,rgba(255,255,255,0.58)_100%)] backdrop-blur-md";

/** Prefixes a tag name with "#" (no-op if it already has one), and strips whitespace so it
 *  reads as a single hashtag word. */
export function hashtag(name: string): string {
  const value = name.trim().replace(/\s+/g, "");
  return value.startsWith("#") ? value : `#${value}`;
}

export const select =
  "inline-flex h-9 items-center justify-center rounded-full border border-[var(--app-outline)]/15 bg-[var(--app-surface)] px-3 py-1.5 text-[13px] font-semibold text-[var(--app-ink)] outline-none focus:border-[var(--app-ink)] transition";

export const pillToggle =
  "rounded-full border px-3 py-1.5 text-[13px] font-semibold transition active:scale-95";
export const pillToggleActive = "border-[var(--app-ink)] bg-[var(--app-ink)] text-[var(--app-canvas)]";
export const pillToggleInactive =
  "border-[var(--app-outline)]/15 text-[var(--app-ink)] bg-[var(--app-surface)]";

export const iconButton =
  "inline-flex size-9 items-center justify-center rounded-full transition active:scale-90";

export const pageHeading = "text-[22px] font-semibold leading-none";

export const mutedText = "text-[13px] leading-snug text-[var(--app-muted)]";

export const pastelTones = [
  "bg-[var(--app-yellow)]",
  "bg-[var(--app-mint)]",
  "bg-[var(--app-pink)]",
  "bg-[var(--app-blue)]",
  "bg-[var(--app-lilac)]",
  "bg-[var(--app-coral)]",
] as const;

export function pastelTone(key: string) {
  let value = 0;
  for (let index = 0; index < key.length; index += 1) value = (value * 31 + key.charCodeAt(index)) >>> 0;
  return pastelTones[value % pastelTones.length];
}
