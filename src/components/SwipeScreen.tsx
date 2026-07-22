"use client";

import { useEffect, useState } from "react";
import { X, Heart, Inbox } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";
import type { DateIdea } from "@/lib/types";
import { mutedText, pastelTone, pill } from "@/lib/ui";
import IdeaTypeFilter from "@/components/IdeaTypeFilter";
import { useIdeaTypeFilter } from "@/components/IdeaTypeFilterProvider";

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
  const [deckFilter, setDeckFilter] = useState<string | null>(null);
  const [swiping, setSwiping] = useState(false);
  const [exiting, setExiting] = useState<"LIKE" | "PASS" | null>(null);
  const { filter: typeFilter } = useIdeaTypeFilter();

  useEffect(() => {
    const path = typeFilter === "ALL" ? "/api/deck" : `/api/deck?type=${typeFilter}`;
    apiFetch(path).then((ideas) => {
      setStack(ideas);
      setDeckFilter(typeFilter);
    });
  }, [typeFilter]);

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

  if (!stack || deckFilter !== typeFilter) return <div className={`p-8 text-center ${mutedText}`}>Загрузка…</div>;

  if (stack.length === 0) {
    return (
      <div className="flex min-h-[calc(100dvh-82px)] flex-col gap-4 p-4 pt-6">
        <h1 className="text-[22px] font-semibold leading-none">Swipe</h1>
        <IdeaTypeFilter fullWidth />
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <Inbox className="text-[var(--tg-hint)]" size={36} strokeWidth={1.5} />
          <p className={mutedText}>Пока больше нечего смотреть.</p>
        </div>
      </div>
    );
  }

  const idea = stack[0];
  const firstLocation = idea.locations[0];
  const location = firstLocation
    ? [firstLocation.metro && `м. ${firstLocation.metro}`, compactAddress(firstLocation.address)]
        .filter(Boolean)
        .join(" · ")
    : "";
  const extraLocations = idea.locations.length - 1;
  const swipeDescription = idea.swipeDescription?.trim();

  return (
    <div className="flex flex-col items-center gap-5 max-w-md mx-auto p-4 pt-6">
      <div className="flex w-full items-end justify-between px-1">
        <div>
          <h1 className="text-[22px] font-semibold leading-none">Swipe</h1>
        </div>
        <span className="rounded-full bg-[var(--app-ink)] px-3 py-1.5 text-[12px] font-semibold text-[var(--app-canvas)]">{stack.length}</span>
      </div>
      <IdeaTypeFilter fullWidth />
      <div
        className={`w-full rounded-[28px] border border-[var(--app-outline)]/10 ${pastelTone(idea.id)} p-6 shadow-[0_4px_0_rgba(28,26,23,0.12)] min-h-[330px] flex flex-col gap-4 transition-all duration-200 ease-out ${
          exiting === "LIKE"
            ? "translate-x-28 rotate-6 opacity-0"
            : exiting === "PASS"
              ? "-translate-x-28 -rotate-6 opacity-0"
              : "translate-x-0 rotate-0 opacity-100"
        }`}
      >
        <div className="flex flex-col gap-2">
          <h2 className="text-[28px] font-semibold leading-[0.98]">{idea.title}</h2>
          {location && (
            <p className={mutedText}>
              {location}
              {extraLocations > 0 && ` · ещё ${extraLocations} мест`}
            </p>
          )}
        </div>

        {idea.priceNote && (
          <p className="text-[14px] font-semibold">
            {idea.priceNote}
          </p>
        )}

        {swipeDescription && (
          <p className="whitespace-pre-wrap text-[16px] leading-snug">
            {swipeDescription}
          </p>
        )}

        {idea.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {idea.tags
              .slice(0, 4)
              .map((t) => (
                <span key={t.tag.id} className={pill}>#{t.tag.name}</span>
              ))}
          </div>
        )}
      </div>

      <div className="flex gap-6">
        <button
          onClick={() => swipe("PASS")}
          disabled={swiping}
          aria-label="Не то"
          className="flex size-16 items-center justify-center rounded-full border border-[var(--app-outline)]/15 bg-[var(--app-surface)] text-[var(--app-ink)] shadow-[0_2px_0_rgba(28,26,23,0.1)] active:scale-90 transition disabled:opacity-50"
        >
          <X size={28} />
        </button>
        <button
          onClick={() => swipe("LIKE")}
          disabled={swiping}
          aria-label="Нравится"
          className="flex size-16 items-center justify-center rounded-full bg-[var(--app-ink)] text-[var(--app-yellow)] shadow-[0_3px_0_rgba(28,26,23,0.2)] active:scale-90 transition disabled:opacity-50"
        >
          <Heart size={28} fill="currentColor" />
        </button>
      </div>

      <p className={mutedText}>В колоде ещё {stack.length}</p>
    </div>
  );
}
