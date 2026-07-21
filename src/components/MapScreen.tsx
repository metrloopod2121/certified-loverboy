"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/apiClient";
import type { DateIdea } from "@/lib/types";
import { mutedText } from "@/lib/ui";
import MultiSelectFilter from "@/components/MultiSelectFilter";

const LeafletMap = dynamic(() => import("@/components/LeafletMap"), { ssr: false });

export default function MapScreen() {
  const [ideas, setIdeas] = useState<DateIdea[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [metroFilters, setMetroFilters] = useState<string[]>([]);
  const [openFilter, setOpenFilter] = useState<"tags" | "metro" | null>(null);

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
    if (metroFilters.length > 0) {
      result = result.filter((i) => i.metro && metroFilters.includes(i.metro));
    }
    return result;
  }, [withCoords, tagFilters, metroFilters]);

  return (
    <div className="flex flex-col h-full">
      <div className="relative z-10 flex gap-2 p-3 border-b border-black/5 dark:border-white/10 bg-[var(--tg-bg)]">
        <MultiSelectFilter
          label="Теги"
          options={allTags}
          selected={tagFilters}
          onChange={setTagFilters}
          open={openFilter === "tags"}
          onOpenChange={(v) => setOpenFilter(v ? "tags" : null)}
        />
        <MultiSelectFilter
          label="Метро"
          options={allMetro}
          selected={metroFilters}
          onChange={setMetroFilters}
          open={openFilter === "metro"}
          onOpenChange={(v) => setOpenFilter(v ? "metro" : null)}
        />
      </div>

      {error && <p className="p-4 text-[14px] text-red-500">{error}</p>}

      {ideas && withCoords.length === 0 && (
        <p className={`p-4 ${mutedText}`}>
          Ни у одной свиданки нет координат — открой её в «Хранилище» → «Правка» и впиши координаты, тогда она появится тут.
        </p>
      )}

      <div className="relative z-0 h-[75dvh]">
        {ideas && !error && <LeafletMap ideas={filtered} />}
        {!ideas && !error && <p className={`p-4 ${mutedText}`}>Загрузка…</p>}
      </div>
    </div>
  );
}
