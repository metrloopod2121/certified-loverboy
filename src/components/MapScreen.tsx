"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/apiClient";
import type { DateIdea } from "@/lib/types";
import { mutedText } from "@/lib/ui";
import MultiSelectFilter from "@/components/MultiSelectFilter";
import { metroStations, metroLineTone } from "@/lib/metro";
import type { MapMarker } from "@/components/LeafletMap";

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
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load"));
  }, []);

  const allMarkers = useMemo<MapMarker[]>(() => {
    return (ideas ?? []).flatMap((idea) =>
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
  }, [ideas]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    allMarkers.forEach((m) => m.tags.forEach((t) => set.add(t)));
    return [...set].sort();
  }, [allMarkers]);

  const allMetro = useMemo(() => {
    const set = new Set<string>();
    allMarkers.forEach((marker) => metroStations(marker.metro).forEach((station) => set.add(station)));
    return [...set].sort();
  }, [allMarkers]);

  const filtered = useMemo(() => {
    let result = allMarkers;
    if (tagFilters.length > 0) {
      result = result.filter((m) => m.tags.some((t) => tagFilters.includes(t)));
    }
    if (metroFilters.length > 0) {
      result = result.filter((marker) => metroStations(marker.metro).some((station) => metroFilters.includes(station)));
    }
    return result;
  }, [allMarkers, tagFilters, metroFilters]);

  return (
    <div
      className="relative h-[100dvh] -mb-[82px] overflow-hidden"
      style={{ marginTop: "calc(-1 * (var(--safe-top) + var(--content-top-gap)))" }}
    >
      <div className="absolute inset-0 z-0">
        <LeafletMap markers={filtered} />
      </div>

      <div
        className="relative z-10 flex flex-col gap-2 p-4"
        style={{ paddingTop: "calc(var(--safe-top) + var(--content-top-gap))" }}
      >
        <div className="relative z-20 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <MultiSelectFilter label="Tags" options={allTags} selected={tagFilters} onChange={setTagFilters} open={openFilter === "tags"} onOpenChange={(v) => setOpenFilter(v ? "tags" : null)} fullWidth />
            <MultiSelectFilter label="Metro" options={allMetro} selected={metroFilters} onChange={setMetroFilters} open={openFilter === "metro"} onOpenChange={(v) => setOpenFilter(v ? "metro" : null)} dotColor={metroLineTone} fullWidth />
          </div>
        </div>

        {error && <p className="rounded-[18px] border border-[var(--app-outline)]/10 bg-[var(--app-coral)]/90 p-3 text-[14px] font-medium text-[var(--app-ink)] shadow-[0_4px_16px_rgba(28,26,23,0.12)] backdrop-blur-xl">{error}</p>}

        {ideas && allMarkers.length === 0 && (
          <p className={`rounded-[18px] border border-[var(--app-outline)]/10 bg-[var(--app-lilac)]/90 p-3 shadow-[0_4px_16px_rgba(28,26,23,0.12)] backdrop-blur-xl ${mutedText}`}>
            None of the ideas have coordinates yet — open one on the Ideas screen, tap Edit, and add coordinates so it shows up here.
          </p>
        )}
      </div>
    </div>
  );
}
