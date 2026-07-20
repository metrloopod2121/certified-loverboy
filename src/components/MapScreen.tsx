"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/apiClient";
import type { DateIdea } from "@/lib/types";

const LeafletMap = dynamic(() => import("@/components/LeafletMap"), { ssr: false });

export default function MapScreen() {
  const [ideas, setIdeas] = useState<DateIdea[] | null>(null);
  const [tagFilter, setTagFilter] = useState("");
  const [metroFilter, setMetroFilter] = useState("");

  useEffect(() => {
    apiFetch("/api/date-ideas").then(setIdeas);
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
    if (tagFilter) result = result.filter((i) => i.tags.some((t) => t.tag.name === tagFilter));
    if (metroFilter) result = result.filter((i) => i.metro === metroFilter);
    return result;
  }, [withCoords, tagFilter, metroFilter]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 p-3 text-sm border-b">
        <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Все теги</option>
          {allTags.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select value={metroFilter} onChange={(e) => setMetroFilter(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Всё метро</option>
          {allMetro.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      <div className="flex-1 min-h-[400px]">
        {ideas && <LeafletMap ideas={filtered} />}
      </div>
    </div>
  );
}
