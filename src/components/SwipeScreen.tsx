"use client";

import { useEffect, useState } from "react";
import { X, Heart, Inbox } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";
import type { DateIdea } from "@/lib/types";
import { mutedText } from "@/lib/ui";

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function compactAddress(address: string | null) {
  if (!address) return "";
  return normalizeText(address)
    .replace(/^Москва,\s*/i, "")
    .replace(/,\s*\d+\s*этаж.*$/i, "");
}

export default function SwipeScreen() {
  const [stack, setStack] = useState<DateIdea[] | null>(null);
  const [swiping, setSwiping] = useState(false);
  const [exiting, setExiting] = useState<"LIKE" | "PASS" | null>(null);

  useEffect(() => {
    apiFetch("/api/deck").then(setStack);
  }, []);

  async function swipe(direction: "LIKE" | "PASS") {
    if (!stack || stack.length === 0 || swiping) return;
    const current = stack[0];
    setSwiping(true);
    setExiting(direction);
    try {
      await apiFetch("/api/swipe", {
        method: "POST",
        body: JSON.stringify({ dateIdeaId: current.id, direction }),
      });
    } finally {
      setTimeout(() => {
        setStack((s) => s?.slice(1) ?? null);
        setExiting(null);
        setSwiping(false);
      }, 200);
    }
  }

  if (!stack) return <div className="p-8 text-center text-sm opacity-60">Загрузка…</div>;

  if (stack.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
        <Inbox className="text-[var(--tg-hint)]" size={36} strokeWidth={1.5} />
        <p className={mutedText}>Пока больше нечего смотреть.</p>
      </div>
    );
  }

  const idea = stack[0];
  const location = [idea.metro && `м. ${idea.metro}`, compactAddress(idea.address)]
    .filter(Boolean)
    .join(" · ");
  const swipeDescription = idea.swipeDescription?.trim();

  return (
    <div className="flex flex-col items-center gap-6 max-w-md mx-auto p-4 pt-6">
      <div
        className={`w-full rounded-3xl border border-black/5 bg-[var(--tg-secondary-bg)] p-6 shadow-md dark:border-white/10 min-h-[300px] flex flex-col gap-4 transition-all duration-200 ease-out ${
          exiting === "LIKE"
            ? "translate-x-28 rotate-6 opacity-0"
            : exiting === "PASS"
              ? "-translate-x-28 -rotate-6 opacity-0"
              : "translate-x-0 rotate-0 opacity-100"
        }`}
      >
        <div className="flex flex-col gap-2">
          <h2 className="text-[22px] font-semibold leading-tight">{idea.title}</h2>
          {location && <p className={mutedText}>{location}</p>}
        </div>

        {idea.priceNote && (
          <p className="text-[14px] font-medium text-[var(--tg-button)]">
            {idea.priceNote}
          </p>
        )}

        {swipeDescription && (
          <p className="whitespace-pre-wrap text-[15px] leading-snug">
            {swipeDescription}
          </p>
        )}

        {idea.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {idea.tags
              .slice(0, 4)
              .map((t) => (
                <span key={t.tag.id} className="text-[12px] text-[var(--tg-hint)]">#{t.tag.name}</span>
              ))}
          </div>
        )}
      </div>

      <div className="flex gap-8">
        <button
          onClick={() => swipe("PASS")}
          disabled={swiping}
          aria-label="Не то"
          className="w-16 h-16 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center active:scale-90 transition disabled:opacity-50"
        >
          <X size={28} className="text-[var(--tg-text)]" />
        </button>
        <button
          onClick={() => swipe("LIKE")}
          disabled={swiping}
          aria-label="Нравится"
          className="w-16 h-16 rounded-full bg-[var(--tg-button)] text-[var(--tg-button-text)] flex items-center justify-center active:scale-90 transition disabled:opacity-50 shadow-lg shadow-[var(--tg-button)]/30"
        >
          <Heart size={28} fill="currentColor" />
        </button>
      </div>

      <p className={mutedText}>Осталось: {stack.length}</p>
    </div>
  );
}
