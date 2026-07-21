"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    apiFetch("/api/deck").then(setStack);
  }, []);

  async function swipe(direction: "LIKE" | "PASS") {
    if (!stack || stack.length === 0 || swiping) return;
    const current = stack[0];
    setSwiping(true);
    try {
      await apiFetch("/api/swipe", {
        method: "POST",
        body: JSON.stringify({ dateIdeaId: current.id, direction }),
      });
      setStack(stack.slice(1));
    } finally {
      setSwiping(false);
    }
  }

  if (!stack) return <div className="p-8 text-center text-sm opacity-60">Загрузка…</div>;

  if (stack.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
        <span className="text-4xl">🤷</span>
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
      <div className="w-full rounded-3xl border border-black/5 bg-[var(--tg-secondary-bg)] p-6 shadow-md dark:border-white/10 min-h-[300px] flex flex-col gap-4">
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
          className="w-16 h-16 rounded-full bg-black/5 dark:bg-white/10 text-3xl flex items-center justify-center active:scale-90 transition disabled:opacity-50"
        >
          ✕
        </button>
        <button
          onClick={() => swipe("LIKE")}
          disabled={swiping}
          aria-label="Нравится"
          className="w-16 h-16 rounded-full bg-[var(--tg-button)] text-[var(--tg-button-text)] text-3xl flex items-center justify-center active:scale-90 transition disabled:opacity-50 shadow-lg shadow-[var(--tg-button)]/30"
        >
          ❤
        </button>
      </div>

      <p className={mutedText}>Осталось: {stack.length}</p>
    </div>
  );
}
