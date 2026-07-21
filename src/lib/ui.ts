export const card =
  "rounded-[22px] border border-[var(--app-outline)]/10 bg-[var(--app-surface)] p-4 shadow-[0_2px_0_rgba(28,26,23,0.08)]";

export const input =
  "w-full rounded-xl border border-[var(--app-outline)]/15 bg-[var(--app-surface)] px-3.5 py-2.5 text-[15px] leading-tight text-[var(--app-ink)] outline-none focus:border-[var(--app-ink)] focus:ring-2 focus:ring-[var(--app-yellow)] placeholder:text-[var(--app-muted)] transition";

export const label = "text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--app-muted)]";

export const buttonPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-[var(--app-ink)] px-5 py-2.5 min-h-11 text-[15px] font-semibold text-[var(--app-canvas)] disabled:opacity-50 active:scale-[0.98] transition";

export const buttonSecondary =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-[var(--app-outline)]/20 bg-[var(--app-surface)] px-5 py-2.5 min-h-11 text-[15px] font-semibold text-[var(--app-ink)] active:scale-[0.98] transition";

export const buttonGhost =
  "inline-flex items-center justify-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-semibold text-[var(--app-ink)] active:opacity-60 transition";

export const pill =
  "inline-flex items-center rounded-full bg-white/65 px-2.5 py-1 text-[12px] font-semibold text-[var(--app-ink)] ring-1 ring-[var(--app-outline)]/10";

export const select =
  "rounded-full border border-[var(--app-outline)]/15 bg-[var(--app-surface)] px-3.5 py-2 text-[13px] font-semibold text-[var(--app-ink)] outline-none focus:border-[var(--app-ink)] transition";

export const pillToggle =
  "rounded-full border px-3 py-1.5 text-[13px] font-semibold transition active:scale-95";
export const pillToggleActive = "border-[var(--app-ink)] bg-[var(--app-ink)] text-[var(--app-canvas)]";
export const pillToggleInactive =
  "border-[var(--app-outline)]/15 text-[var(--app-ink)] bg-[var(--app-surface)]";

export const iconButton =
  "inline-flex size-9 items-center justify-center rounded-full transition active:scale-90";

export const pageHeading = "text-[30px] font-semibold leading-[0.95]";

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
