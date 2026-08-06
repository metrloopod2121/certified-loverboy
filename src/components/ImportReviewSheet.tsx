"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X, Link as LinkIcon } from "lucide-react";
import DateIdeaForm from "@/components/DateIdeaForm";
import type { DateIdeaInput } from "@/lib/types";
import { priceTier } from "@/lib/priceTier";
import { card, pill, pillBlue, eventBadgeColors, mutedText, buttonPrimary, iconButton, hashtag } from "@/lib/ui";
import { useLang, useT } from "@/hooks/useLang";
import { foundPlacesText, formatEventWhen } from "@/lib/i18n";

// Full DateIdeaInput, not just the markdown-import subset -- link imports (Yandex/Instagram/
// Telegram) can carry event fields too, so every producer of a ReviewItem fills them in
// (null when the source never produces event data, e.g. plain markdown files).
export type ReviewItem = { id: string; parsed: DateIdeaInput };

function linkHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function compactLinkText(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const path = `${parsed.pathname}${parsed.search}`.replace(/\/$/u, "");
    return path ? `${host}${path}` : host;
  } catch {
    return url;
  }
}

function linkTitle(link: DateIdeaInput["links"][number]): string {
  return link.label.trim() || linkHostname(link.url);
}

function linkSubtitle(link: DateIdeaInput["links"][number]): string | null {
  const compact = compactLinkText(link.url);
  return compact === linkTitle(link) ? null : compact;
}

/** Bottom sheet shown right after a successful import parse — one card per found place, with
 *  Add / Edit / Delete per card, instead of dropping a bare form into the page flow where it's
 *  easy to miss. Mirrors the review sheet pattern already used on the iOS app. */
export default function ImportReviewSheet({
  items,
  onAdd,
  onSkip,
  onClose,
}: {
  items: ReviewItem[];
  onAdd: (id: string, input: DateIdeaInput) => Promise<void>;
  onSkip: (id: string) => void;
  onClose: () => void;
}) {
  const { lang } = useLang();
  const t = useT();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  if (items.length === 0) return null;

  async function quickAdd(item: ReviewItem) {
    setSavingId(item.id);
    try {
      await onAdd(item.id, item.parsed);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/30" onClick={onClose}>
      <div
        className="panel-appear flex max-h-[85vh] flex-col gap-4 rounded-t-[28px] bg-[var(--app-canvas)] p-5 shadow-[0_-8px_30px_rgba(28,26,23,0.2)]"
        style={{ paddingBottom: "calc(var(--safe-bottom) + 20px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center justify-center">
          <h2 className="text-[17px] font-semibold">{foundPlacesText(lang, items.length)}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("closeAria")}
            className={`${iconButton} absolute right-0 size-8 bg-[var(--app-overlay)] text-[var(--app-ink)]`}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto">
          {items.map((item) =>
            editingId === item.id ? (
              <DateIdeaForm
                key={item.id}
                initial={item.parsed}
                onSubmit={(input) => onAdd(item.id, input)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div key={item.id} className={`${card} flex flex-col gap-2.5`}>
                {item.parsed.eventStartsAt && (
                  <div className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold ${eventBadgeColors}`}>
                    {formatEventWhen(lang, item.parsed.eventStartsAt, item.parsed.eventEndsAt)}
                  </div>
                )}
                <h3 className="text-[18px] font-semibold leading-[1.1]">{item.parsed.title || t("untitled")}</h3>
                {item.parsed.locations[0]?.address && <p className={mutedText}>{item.parsed.locations[0].address}</p>}
                {item.parsed.priceNote && (
                  <p className="text-[14px] font-semibold">{priceTier(item.parsed.priceNote) ?? item.parsed.priceNote}</p>
                )}
                {item.parsed.description && <p className="text-[14px] leading-snug">{item.parsed.description}</p>}
                {item.parsed.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.parsed.tags.map((tag) => (
                      <span key={tag} className={item.parsed.eventStartsAt ? pillBlue : pill}>{hashtag(tag)}</span>
                    ))}
                  </div>
                )}
                {item.parsed.links.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {item.parsed.links.map((link) => {
                      const subtitle = linkSubtitle(link);
                      return (
                        <a
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex min-w-0 items-center gap-2 rounded-2xl bg-[var(--app-subtle-overlay)] px-3 py-2 text-[var(--app-ink)] transition active:scale-[0.99] active:bg-[var(--app-overlay)]"
                        >
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--app-surface)] text-[var(--app-ink)] ring-1 ring-[var(--app-outline)]/10">
                            <LinkIcon size={15} strokeWidth={2.3} />
                          </span>
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="truncate text-[13px] font-semibold leading-tight">{linkTitle(link)}</span>
                            {subtitle && <span className="truncate text-[11px] font-medium leading-tight text-[var(--app-muted)]">{subtitle}</span>}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onSkip(item.id)}
                    aria-label={t("deleteAria")}
                    className={`${iconButton} size-11 shrink-0 border border-red-500/20 bg-red-500/10 text-red-600`}
                  >
                    <Trash2 size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(item.id)}
                    aria-label={t("editAria")}
                    className={`${iconButton} size-11 shrink-0 border border-[var(--app-outline)]/20 bg-[var(--app-surface)] text-[var(--app-ink)]`}
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => quickAdd(item)}
                    disabled={savingId === item.id}
                    className={`${buttonPrimary} min-w-0 flex-1 px-4 disabled:opacity-50`}
                  >
                    <Plus size={17} className="shrink-0" />
                    <span className="truncate">{savingId === item.id ? t("addingBtn") : t("add")}</span>
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
