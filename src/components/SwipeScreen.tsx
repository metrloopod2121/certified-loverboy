"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import type { DateIdea } from "@/lib/types";
import { pill, mutedText } from "@/lib/ui";

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

  return (
    <div className="flex flex-col items-center gap-6 max-w-md mx-auto p-4 pt-6">
      <div className="w-full rounded-3xl border border-black/5 bg-[var(--tg-secondary-bg)] p-6 shadow-md dark:border-white/10 min-h-[260px] flex flex-col gap-3">
        <h2 className="text-[22px] font-semibold leading-tight">{idea.title}</h2>
        {(idea.address || idea.metro) && (
          <p className={mutedText}>
            {[idea.address, idea.metro && `м. ${idea.metro}`].filter(Boolean).join(" · ")}
          </p>
        )}
        {idea.priceNote && (
          <p className="text-[14px] font-medium text-[var(--tg-button)]">{idea.priceNote}</p>
        )}
        {idea.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {idea.tags.map((t) => (
              <span key={t.tag.id} className={pill}>{t.tag.name}</span>
            ))}
          </div>
        )}
        {idea.description && (
          <p className="text-[14px] whitespace-pre-wrap mt-1">{idea.description}</p>
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
