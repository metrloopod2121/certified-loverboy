"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import type { MatchWithIdea } from "@/lib/types";

export default function MatchesScreen() {
  const [matches, setMatches] = useState<MatchWithIdea[] | null>(null);

  useEffect(() => {
    apiFetch("/api/matches").then(setMatches);
  }, []);

  if (!matches) return <div className="p-6 text-center text-sm opacity-60">Загрузка…</div>;

  if (matches.length === 0) {
    return <div className="p-6 text-center text-sm opacity-60">Мэтчей пока нет.</div>;
  }

  return (
    <div className="p-4 flex flex-col gap-3 max-w-2xl mx-auto">
      <h1 className="text-lg font-semibold">Мэтчи</h1>
      {matches.map((m) => (
        <div key={m.id} className="border rounded-lg p-3 flex flex-col gap-1">
          <h2 className="font-medium">🎉 {m.dateIdea.title}</h2>
          {(m.dateIdea.address || m.dateIdea.metro) && (
            <p className="text-sm opacity-70">
              {[m.dateIdea.address, m.dateIdea.metro && `м. ${m.dateIdea.metro}`].filter(Boolean).join(" · ")}
            </p>
          )}
          {m.dateIdea.tags.length > 0 && (
            <p className="text-xs opacity-60">{m.dateIdea.tags.map((t) => t.tag.name).join(", ")}</p>
          )}
        </div>
      ))}
    </div>
  );
}
