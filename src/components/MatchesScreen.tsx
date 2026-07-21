"use client";

import { useEffect, useState } from "react";
import { Heart, PartyPopper, MessageCircleHeart } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";
import type { MatchWithIdea } from "@/lib/types";
import { card, pill, pageHeading, mutedText, pastelTone } from "@/lib/ui";
import IdeaTypeFilter from "@/components/IdeaTypeFilter";
import { useIdeaTypeFilter } from "@/components/IdeaTypeFilterProvider";

export default function MatchesScreen() {
  const [matches, setMatches] = useState<MatchWithIdea[] | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { filter: typeFilter } = useIdeaTypeFilter();

  useEffect(() => {
    apiFetch("/api/matches").then(setMatches);
  }, []);

  async function toggleFavorite(match: MatchWithIdea) {
    if (updatingId) return;

    const isFavorite = !match.isFavorite;
    setUpdatingId(match.id);
    setMatches((current) => current?.map((item) => item.id === match.id ? { ...item, isFavorite } : item) ?? null);

    try {
      await apiFetch(`/api/matches/${match.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isFavorite }),
      });
    } catch {
      setMatches((current) => current?.map((item) => item.id === match.id ? { ...item, isFavorite: !isFavorite } : item) ?? null);
    } finally {
      setUpdatingId(null);
    }
  }

  if (!matches) return <div className="p-8 text-center text-sm opacity-60">Загрузка…</div>;

  const filteredMatches = typeFilter === "ALL" ? matches : matches.filter((match) => match.dateIdea.type === typeFilter);

  if (filteredMatches.length === 0) {
    return (
      <div className="flex min-h-[calc(100dvh-92px)] flex-col gap-4 p-4 pt-6">
        <h1 className={pageHeading}>Мэтчи</h1>
        <IdeaTypeFilter fullWidth />
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <MessageCircleHeart className="text-[var(--tg-hint)]" size={36} strokeWidth={1.5} />
          <p className={mutedText}>Мэтчей пока нет.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto p-4 pt-6 pb-6">
      <div>
        <h1 className={pageHeading}>Мэтчи</h1>
      </div>
      <IdeaTypeFilter fullWidth />
      {filteredMatches.map((m) => (
        <div key={m.id} className={`${card} ${pastelTone(m.dateIdea.id)} flex flex-col gap-2`}>
          <div className="flex items-start justify-between gap-3">
            <h2 className="flex items-start gap-2 text-[19px] font-semibold leading-[1.05]">
              <PartyPopper className="mt-0.5 shrink-0" size={19} />
              {m.dateIdea.title}
            </h2>
            <button
              type="button"
              onClick={() => toggleFavorite(m)}
              disabled={updatingId === m.id}
              aria-label={m.isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
              title={m.isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--app-overlay)] text-[var(--app-ink)] ring-1 ring-[var(--app-outline)]/10 transition active:scale-90 disabled:opacity-50"
            >
              <Heart size={18} fill={m.isFavorite ? "currentColor" : "none"} className={m.isFavorite ? "text-[var(--app-coral)]" : ""} />
            </button>
          </div>
          {m.dateIdea.locations.map((loc) => (
            <p key={loc.id} className={mutedText}>
              {[loc.address, loc.metro && `м. ${loc.metro}`].filter(Boolean).join(" · ")}
            </p>
          ))}
          {m.dateIdea.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {m.dateIdea.tags.map((t) => (
                <span key={t.tag.id} className={pill}>{t.tag.name}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
