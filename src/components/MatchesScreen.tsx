"use client";

import { useEffect, useState } from "react";
import { PartyPopper, MessageCircleHeart } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";
import type { MatchWithIdea } from "@/lib/types";
import { card, pill, pageHeading, mutedText, pastelTone } from "@/lib/ui";

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
    <div className="flex flex-col gap-4 max-w-2xl mx-auto p-4 pb-6">
      <div>
        <h1 className={pageHeading}>Мэтчи</h1>
      </div>
      {matches.map((m) => (
        <div key={m.id} className={`${card} ${pastelTone(m.dateIdea.id)} flex flex-col gap-2`}>
          <h2 className="flex items-start gap-2 text-[19px] font-semibold leading-[1.05]">
            <PartyPopper className="mt-0.5 shrink-0" size={19} />
            {m.dateIdea.title}
          </h2>
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
