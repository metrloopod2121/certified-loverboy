"use client";

import { useEffect, useState } from "react";
import { PartyPopper, MessageCircleHeart } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";
import type { MatchWithIdea } from "@/lib/types";
import { card, pill, pageHeading, mutedText } from "@/lib/ui";

export default function MatchesScreen() {
  const [matches, setMatches] = useState<MatchWithIdea[] | null>(null);

  useEffect(() => {
    apiFetch("/api/matches").then(setMatches);
  }, []);

  if (!matches) return <div className="p-8 text-center text-sm opacity-60">Загрузка…</div>;

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
        <MessageCircleHeart className="text-[var(--tg-hint)]" size={36} strokeWidth={1.5} />
        <p className={mutedText}>Мэтчей пока нет.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 max-w-2xl mx-auto p-4 pb-6">
      <h1 className={pageHeading}>Мэтчи</h1>
      {matches.map((m) => (
        <div key={m.id} className={`${card} flex flex-col gap-1.5`}>
          <h2 className="flex items-start gap-1.5 text-[16px] font-semibold">
            <PartyPopper className="text-[var(--tg-button)]" size={18} />
            {m.dateIdea.title}
          </h2>
          {(m.dateIdea.address || m.dateIdea.metro) && (
            <p className={mutedText}>
              {[m.dateIdea.address, m.dateIdea.metro && `м. ${m.dateIdea.metro}`].filter(Boolean).join(" · ")}
            </p>
          )}
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
