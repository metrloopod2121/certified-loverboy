"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import DateIdeaForm from "@/components/DateIdeaForm";
import type { DateIdeaInput } from "@/lib/types";
import type { ParsedDateIdea } from "@/lib/parseDateMarkdown";
import { priceTier } from "@/lib/priceTier";
import { card, pill, mutedText, buttonPrimary, buttonSecondary, buttonGhost, iconButton, hashtag } from "@/lib/ui";

export type ReviewItem = { id: string; parsed: ParsedDateIdea };

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
          <h2 className="text-[17px] font-semibold">
            Found {items.length} {items.length === 1 ? "place" : "places"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
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
                <h3 className="text-[18px] font-semibold leading-[1.1]">{item.parsed.title || "Untitled"}</h3>
                {item.parsed.locations[0]?.address && <p className={mutedText}>{item.parsed.locations[0].address}</p>}
                {item.parsed.priceNote && (
                  <p className="text-[14px] font-semibold">{priceTier(item.parsed.priceNote) ?? item.parsed.priceNote}</p>
                )}
                {item.parsed.description && <p className="text-[14px] leading-snug">{item.parsed.description}</p>}
                {item.parsed.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.parsed.tags.map((tag) => (
                      <span key={tag} className={pill}>{hashtag(tag)}</span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => quickAdd(item)}
                    disabled={savingId === item.id}
                    className={`${buttonPrimary} disabled:opacity-50`}
                  >
                    <Plus size={16} />
                    {savingId === item.id ? "Adding…" : "Add"}
                  </button>
                  <button type="button" onClick={() => setEditingId(item.id)} className={buttonSecondary}>
                    <Pencil size={16} />
                    Edit
                  </button>
                  <button type="button" onClick={() => onSkip(item.id)} className={buttonGhost}>
                    <Trash2 size={16} />
                    Delete
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
