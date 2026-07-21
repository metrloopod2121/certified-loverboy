"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/apiClient";
import type { DateIdea } from "@/lib/types";
import { pageHeading, mutedText } from "@/lib/ui";
import MultiSelectFilter from "@/components/MultiSelectFilter";
import IdeaTypeFilter from "@/components/IdeaTypeFilter";
import { useIdeaTypeFilter } from "@/components/IdeaTypeFilterProvider";
import type { MapMarker } from "@/components/LeafletMap";

const LeafletMap = dynamic(() => import("@/components/LeafletMap"), { ssr: false });

export default function MapScreen() {
  const [ideas, setIdeas] = useState<DateIdea[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [metroFilters, setMetroFilters] = useState<string[]>([]);
  const [openFilter, setOpenFilter] = useState<"tags" | "metro" | null>(null);
  const { filter: typeFilter } = useIdeaTypeFilter();

  useEffect(() => {
    apiFetch("/api/date-ideas")
      .then(setIdeas)
      .catch((err) => setError(err instanceof Error ? err.message : "Не удалось загрузить"));
  }, []);

  const allMarkers = useMemo<MapMarker[]>(() => {
    return (ideas ?? [])
      .filter((idea) => typeFilter === "ALL" || idea.type === typeFilter)
      .flatMap((idea) =>
      idea.locations
        .filter((loc) => loc.lat != null && loc.lng != null)
        .map((loc) => ({
          id: loc.id,
          lat: loc.lat as number,
          lng: loc.lng as number,
          title: idea.title,
          address: loc.address,
          metro: loc.metro,
          url: loc.url,
          priceNote: idea.priceNote,
          tags: idea.tags.map((t) => t.tag.name),
        }))
      );
  }, [ideas, typeFilter]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    allMarkers.forEach((m) => m.tags.forEach((t) => set.add(t)));
    return [...set].sort();
  }, [allMarkers]);

  const allMetro = useMemo(() => {
    const set = new Set<string>();
    allMarkers.forEach((m) => m.metro && set.add(m.metro));
    return [...set].sort();
  }, [allMarkers]);

  const filtered = useMemo(() => {
    let result = allMarkers;
    if (tagFilters.length > 0) {
      result = result.filter((m) => m.tags.some((t) => tagFilters.includes(t)));
    }
    if (metroFilters.length > 0) {
      result = result.filter((m) => m.metro && metroFilters.includes(m.metro));
    }
    return result;
  }, [allMarkers, tagFilters, metroFilters]);

  return (
    <div className="relative h-[100dvh] -mb-[82px] overflow-hidden">
      <div className="absolute inset-0 z-0">
        <LeafletMap markers={filtered} />
      </div>

      <div className="relative z-10 flex flex-col gap-2 p-4 pt-6">
        <div className="flex items-center justify-between rounded-[18px] border border-[var(--app-outline)]/10 bg-[var(--app-surface)]/70 px-3 py-3 shadow-[0_4px_16px_rgba(28,26,23,0.12)] backdrop-blur-xl">
          <h1 className={pageHeading}>Карта идей</h1>
          {ideas && <span className="rounded-full bg-[var(--app-ink)] px-3 py-1.5 text-[12px] font-semibold text-[var(--app-canvas)]">{filtered.length}</span>}
        </div>

        <div className="relative z-20 flex flex-wrap gap-2 rounded-[18px] border border-[var(--app-outline)]/10 bg-[var(--app-surface)]/70 p-2 shadow-[0_4px_16px_rgba(28,26,23,0.12)] backdrop-blur-xl">
          <IdeaTypeFilter fullWidth />
          <MultiSelectFilter label="Теги" options={allTags} selected={tagFilters} onChange={setTagFilters} open={openFilter === "tags"} onOpenChange={(v) => setOpenFilter(v ? "tags" : null)} />
          <MultiSelectFilter label="Метро" options={allMetro} selected={metroFilters} onChange={setMetroFilters} open={openFilter === "metro"} onOpenChange={(v) => setOpenFilter(v ? "metro" : null)} />
        </div>

        {error && <p className="rounded-[18px] border border-[var(--app-outline)]/10 bg-[var(--app-coral)]/90 p-3 text-[14px] font-medium text-[var(--app-ink)] shadow-[0_4px_16px_rgba(28,26,23,0.12)] backdrop-blur-xl">{error}</p>}

        {ideas && allMarkers.length === 0 && (
          <p className={`rounded-[18px] border border-[var(--app-outline)]/10 bg-[var(--app-lilac)]/90 p-3 shadow-[0_4px_16px_rgba(28,26,23,0.12)] backdrop-blur-xl ${mutedText}`}>
            Ни у одной записи нет координат — открой её в «Хранилище» → «Правка» и впиши координаты, тогда она появится тут.
          </p>
        )}
      </div>
    </div>
  );
}
