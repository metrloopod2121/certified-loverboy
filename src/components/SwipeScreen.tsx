"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import type { DateIdea } from "@/lib/types";

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

  if (!stack) return <div className="p-6 text-center text-sm opacity-60">Загрузка…</div>;

  if (stack.length === 0) {
    return <div className="p-6 text-center text-sm opacity-60">Пока больше нечего смотреть.</div>;
  }

  const idea = stack[0];

  return (
    <div className="p-4 flex flex-col items-center gap-4 max-w-md mx-auto">
      <div className="border rounded-xl p-5 w-full flex flex-col gap-2">
        <h2 className="text-xl font-semibold">{idea.title}</h2>
        {(idea.address || idea.metro) && (
          <p className="text-sm opacity-70">
            {[idea.address, idea.metro && `м. ${idea.metro}`].filter(Boolean).join(" · ")}
          </p>
        )}
        {idea.priceNote && <p className="text-sm">{idea.priceNote}</p>}
        {idea.tags.length > 0 && (
          <p className="text-xs opacity-60">{idea.tags.map((t) => t.tag.name).join(", ")}</p>
        )}
        {idea.description && <p className="text-sm mt-2 whitespace-pre-wrap">{idea.description}</p>}
      </div>

      <div className="flex gap-6">
        <button
          onClick={() => swipe("PASS")}
          disabled={swiping}
          className="w-16 h-16 rounded-full border text-2xl flex items-center justify-center"
        >
          ❌
        </button>
        <button
          onClick={() => swipe("LIKE")}
          disabled={swiping}
          className="w-16 h-16 rounded-full border text-2xl flex items-center justify-center"
        >
          ❤️
        </button>
      </div>

      <p className="text-xs opacity-50">Осталось: {stack.length}</p>
    </div>
  );
}
