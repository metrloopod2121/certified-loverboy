"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/apiClient";
import type { DateIdea } from "@/lib/types";
import { select, mutedText, pillToggle, pillToggleActive, pillToggleInactive } from "@/lib/ui";

const LeafletMap = dynamic(() => import("@/components/LeafletMap"), { ssr: false });

export default function MapScreen() {
  const [ideas, setIdeas] = useState<DateIdea[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [metroFilter, setMetroFilter] = useState("");

  useEffect(() => {
    apiFetch("/api/date-ideas")
      .then(setIdeas)
      .catch((err) => setError(err instanceof Error ? err.message : "Не удалось загрузить"));
  }, []);

  const withCoords = useMemo(
    () => (ideas ?? []).filter((i) => i.lat != null && i.lng != null),
    [ideas]
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    withCoords.forEach((idea) => idea.tags.forEach((t) => set.add(t.tag.name)));
    return [...set].sort();
  }, [withCoords]);

  const allMetro = useMemo(() => {
    const set = new Set<string>();
    withCoords.forEach((idea) => idea.metro && set.add(idea.metro));
    return [...set].sort();
  }, [withCoords]);

  const filtered = useMemo(() => {
    let result = withCoords;
    if (tagFilters.length > 0) {
      result = result.filter((i) => i.tags.some((t) => tagFilters.includes(t.tag.name)));
    }
    if (metroFilter) result = result.filter((i) => i.metro === metroFilter);
    return result;
  }, [withCoords, tagFilters, metroFilter]);

  function toggleTagFilter(tag: string) {
    setTagFilters((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-2 p-3 border-b border-black/5 dark:border-white/10">
        {allTags.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => toggleTagFilter(t)}
                className={`${pillToggle} shrink-0 ${tagFilters.includes(t) ? pillToggleActive : pillToggleInactive}`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
        <select value={metroFilter} onChange={(e) => setMetroFilter(e.target.value)} className={`${select} self-start`}>
          <option value="">Всё метро</option>
          {allMetro.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {error && <p className="p-4 text-[14px] text-red-500">{error}</p>}

      {ideas && withCoords.length === 0 && (
        <p className={`p-4 ${mutedText}`}>
          Ни у одной свиданки нет координат — открой её в «Хранилище» → «Правка» и впиши координаты, тогда она появится тут.
        </p>
      )}

      <div className="h-[75dvh]">
        {ideas && !error && <LeafletMap ideas={filtered} />}
        {!ideas && !error && <p className={`p-4 ${mutedText}`}>Загрузка…</p>}
      </div>
    </div>
  );
}
