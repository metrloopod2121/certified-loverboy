"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/apiClient";
import type { DateIdea } from "@/lib/types";
import { pageHeading, mutedText } from "@/lib/ui";
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
    <div className="flex h-full flex-col gap-3 p-4 pt-3">
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--app-muted)]">В Москве</span>
          <h1 className={`${pageHeading} mt-1`}>Карта идей</h1>
        </div>
        {ideas && <span className="rounded-full bg-[var(--app-ink)] px-3 py-1.5 text-[12px] font-semibold text-[var(--app-canvas)]">{filtered.length}</span>}
      </div>

      <div className="relative z-10 flex flex-wrap gap-2">
        <MultiSelectFilter label="Теги" options={allTags} selected={tagFilters} onChange={setTagFilters} open={openFilter === "tags"} onOpenChange={(v) => setOpenFilter(v ? "tags" : null)} />
        <MultiSelectFilter label="Метро" options={allMetro} selected={metroFilters} onChange={setMetroFilters} open={openFilter === "metro"} onOpenChange={(v) => setOpenFilter(v ? "metro" : null)} />
      </div>

      {error && <p className="rounded-xl bg-[var(--app-coral)] p-3 text-[14px] font-medium text-[var(--app-ink)]">{error}</p>}

      {ideas && withCoords.length === 0 && (
        <p className={`rounded-[22px] bg-[var(--app-lilac)] p-4 ${mutedText}`}>
          Ни у одной свиданки нет координат — открой её в «Хранилище» → «Правка» и впиши координаты, тогда она появится тут.
        </p>
      )}

      <div className="relative z-0 min-h-[62dvh] flex-1 overflow-hidden rounded-[22px] border border-[var(--app-outline)]/10 bg-[var(--app-surface)] shadow-[0_2px_0_rgba(28,26,23,0.08)]">
        {ideas && !error && <LeafletMap ideas={filtered} />}
        {!ideas && !error && <p className={`p-4 ${mutedText}`}>Загрузка…</p>}
      </div>
    </div>
  );
}
