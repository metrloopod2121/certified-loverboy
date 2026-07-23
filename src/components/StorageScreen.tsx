"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Pencil, Trash2, Plus, X, Link as LinkIcon, Upload, Download, PencilLine, FileUp, Navigation, MapPin } from "lucide-react";
import { apiFetch, downloadFile } from "@/lib/apiClient";
import { dateIdeaToInput, type DateIdea, type DateIdeaInput } from "@/lib/types";
import DateIdeaForm from "@/components/DateIdeaForm";
import MultiSelectFilter from "@/components/MultiSelectFilter";
import { parseDateMarkdown, type ParsedDateIdea } from "@/lib/parseDateMarkdown";
import { parseCoordinates, parseMapsLink } from "@/lib/coords";
import { distanceKm, formatDistanceKm, type LatLng } from "@/lib/geo";
import { priceTier } from "@/lib/priceTier";
import {
  card,
  input,
  select,
  pill,
  iconButton,
  pageHeading,
  mutedText,
  pastelTone,
  buttonSecondary,
  buttonGhost,
  pillToggle,
  pillToggleActive,
  pillToggleInactive,
} from "@/lib/ui";
import { metroPastelTone, metroStations, metroLineTone } from "@/lib/metro";

type Sort = "newest" | "title" | "nearby";

const sortOptions: { value: Sort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "title", label: "Title" },
  { value: "nearby", label: "Nearby" },
];

const LOCATION_STORAGE_KEY = "certified-loverboy:user-location";

function loadSavedLocation(): LatLng | null {
  if (typeof window === "undefined") return null;
  const saved = window.localStorage.getItem(LOCATION_STORAGE_KEY);
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved);
    if (typeof parsed.lat === "number" && typeof parsed.lng === "number") return parsed;
  } catch {
    return null;
  }
  return null;
}

type PendingImport = {
  id: string;
  source: string;
  parsed: ParsedDateIdea;
};

let nextImportId = 0;

export default function StorageScreen({ readOnly = false }: { readOnly?: boolean }) {
  const [ideas, setIdeas] = useState<DateIdea[] | null>(null);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [metroFilters, setMetroFilters] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>("newest");
  const [addMode, setAddMode] = useState<"none" | "manual" | "import">("none");
  const [importItems, setImportItems] = useState<PendingImport[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<DateIdea | null>(null);
  const [openFilter, setOpenFilter] = useState<"tags" | "metro" | "sort" | null>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const sortLabel = sortOptions.find((option) => option.value === sort)?.label ?? "Sort";
  const [userLocation, setUserLocation] = useState<LatLng | null>(() => loadSavedLocation());
  const [locatingMe, setLocatingMe] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [manualLocationInput, setManualLocationInput] = useState("");
  const [exporting, setExporting] = useState(false);

  async function reload() {
    const data = await apiFetch("/api/date-ideas");
    setIdeas(data);
  }

  useEffect(() => {
    let cancelled = false;

    apiFetch("/api/date-ideas").then((data) => {
      if (!cancelled) setIdeas(data);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (openFilter !== "sort") return;

    function onClickOutside(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setOpenFilter(null);
    }

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [openFilter]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    ideas?.forEach((idea) => idea.tags.forEach((t) => set.add(t.tag.name)));
    return [...set].sort();
  }, [ideas]);

  const allMetro = useMemo(() => {
    const set = new Set<string>();
    ideas?.forEach((idea) => idea.locations.forEach((loc) => metroStations(loc.metro).forEach((station) => set.add(station))));
    return [...set].sort();
  }, [ideas]);

  const distanceById = useMemo(() => {
    const map = new Map<string, number>();
    if (!ideas || !userLocation) return map;
    for (const idea of ideas) {
      const coords = idea.locations.filter((loc): loc is typeof loc & { lat: number; lng: number } => loc.lat != null && loc.lng != null);
      if (coords.length === 0) continue;
      map.set(idea.id, Math.min(...coords.map((loc) => distanceKm(userLocation, loc))));
    }
    return map;
  }, [ideas, userLocation]);

  const filtered = useMemo(() => {
    if (!ideas) return [];
    let result = ideas;
    if (tagFilters.length > 0) {
      result = result.filter((i) => i.tags.some((t) => tagFilters.includes(t.tag.name)));
    }
    if (metroFilters.length > 0) {
      result = result.filter((idea) => idea.locations.some((loc) => metroStations(loc.metro).some((station) => metroFilters.includes(station))));
    }
    result = [...result].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "nearby") return (distanceById.get(a.id) ?? Infinity) - (distanceById.get(b.id) ?? Infinity);
      return b.createdAt.localeCompare(a.createdAt);
    });
    return result;
  }, [ideas, tagFilters, metroFilters, sort, distanceById]);

  function saveLocation(loc: LatLng) {
    setUserLocation(loc);
    setLocationError(null);
    window.localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(loc));
  }

  function clearLocation() {
    setUserLocation(null);
    window.localStorage.removeItem(LOCATION_STORAGE_KEY);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationError("Geolocation isn't supported here");
      return;
    }
    setLocatingMe(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        saveLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocatingMe(false);
      },
      (err) => {
        setLocationError(err.message || "Couldn't get your location");
        setLocatingMe(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function applyManualLocation() {
    const parsed = parseCoordinates(manualLocationInput) ?? parseMapsLink(manualLocationInput);
    if (!parsed) {
      setLocationError("Enter coordinates like 55.75, 37.61 or a maps link");
      return;
    }
    saveLocation(parsed);
    setManualLocationInput("");
  }

  async function exportAll() {
    setExporting(true);
    try {
      await downloadFile("/api/export", "certified-loverboy-export.zip");
    } finally {
      setExporting(false);
    }
  }

  function toggleAddPanel() {
    setAddMode((m) => (m === "none" ? "manual" : "none"));
    setImportItems([]);
  }

  async function createIdea(input: DateIdeaInput) {
    await apiFetch("/api/date-ideas", { method: "POST", body: JSON.stringify(input) });
    setAddMode("none");
    await reload();
  }

  async function updateIdea(id: string, input: DateIdeaInput) {
    await apiFetch(`/api/date-ideas/${id}`, { method: "PATCH", body: JSON.stringify(input) });
    setEditing(null);
    await reload();
  }

  async function remove(id: string) {
    await apiFetch(`/api/date-ideas/${id}`, { method: "DELETE" });
    await reload();
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems = await Promise.all(
      Array.from(files).map(async (file) => ({
        id: `f${nextImportId++}`,
        source: file.name,
        parsed: parseDateMarkdown(await file.text()),
      }))
    );
    setImportItems((prev) => [...prev, ...newItems]);
    e.target.value = "";
  }

  function dismissImportItem(id: string) {
    setImportItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function saveImportItem(id: string, input: DateIdeaInput) {
    await apiFetch("/api/date-ideas", { method: "POST", body: JSON.stringify(input) });
    dismissImportItem(id);
    await reload();
  }

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto p-4 pt-6 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`${pageHeading} whitespace-nowrap`}>Ideas</h1>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            <button
              onClick={exportAll}
              disabled={exporting}
              aria-label="Export all as files"
              title="Export all as files"
              className={`${iconButton} size-12 bg-[var(--app-overlay)] text-[var(--app-ink)] ring-1 ring-[var(--app-outline)]/10 disabled:opacity-50`}
            >
              <Download size={18} />
            </button>
            <button
              onClick={toggleAddPanel}
              aria-label={addMode === "none" ? "Add idea" : "Close form"}
              title={addMode === "none" ? "Add idea" : "Close form"}
              className="inline-flex size-12 items-center justify-center rounded-full bg-[var(--app-ink)] text-[var(--app-canvas)] shadow-[0_3px_0_rgba(28,26,23,0.18)] active:scale-90 transition"
            >
              {addMode === "none" ? <Plus size={18} /> : <X size={18} />}
            </button>
          </div>
        )}
      </div>

      <div className="relative z-10 flex flex-col gap-2">
        <div className="grid grid-cols-3 gap-2">
          <MultiSelectFilter
            label="Tags"
            options={allTags}
            selected={tagFilters}
            onChange={setTagFilters}
            open={openFilter === "tags"}
            onOpenChange={(v) => setOpenFilter(v ? "tags" : null)}
            fullWidth
          />
          <MultiSelectFilter
            label="Metro"
            options={allMetro}
            selected={metroFilters}
            onChange={setMetroFilters}
            open={openFilter === "metro"}
            onOpenChange={(v) => setOpenFilter(v ? "metro" : null)}
            dotColor={metroLineTone}
            fullWidth
          />
          <div className="relative isolate min-w-0" ref={sortRef}>
            <button
              type="button"
              onClick={() => setOpenFilter(openFilter === "sort" ? null : "sort")}
              className={`${select} w-full min-w-0 gap-1 whitespace-nowrap text-[13px] leading-none`}
            >
              {sortLabel}
              <ChevronDown size={14} />
            </button>
            {openFilter === "sort" && (
              <div className="absolute right-0 z-[100] mt-1 w-44 overflow-hidden rounded-xl border border-[var(--app-outline)]/15 bg-[var(--app-surface)] p-1.5 shadow-[0_8px_20px_rgba(28,26,23,0.16)]">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSort(option.value);
                      setOpenFilter(null);
                    }}
                    className={`w-full rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold leading-none active:bg-black/5 ${
                      sort === option.value ? "bg-[var(--app-yellow)] text-[var(--app-ink)]" : "text-[var(--app-ink)]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {sort === "nearby" && (
        <div className="panel-appear flex flex-col gap-2 rounded-[18px] border border-[var(--app-outline)]/10 bg-[var(--app-overlay)] px-3 py-2.5">
          {userLocation ? (
            <div className="flex items-center justify-between gap-2">
              <span className={mutedText}>
                <MapPin className="mr-1 inline align-text-bottom" size={14} />
                Location set — sorting by distance
              </span>
              <button type="button" onClick={clearLocation} className={buttonGhost}>
                Change
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button type="button" onClick={useMyLocation} disabled={locatingMe} className={`${buttonSecondary} w-full`}>
                <Navigation size={16} />
                {locatingMe ? "Locating…" : "Use my location"}
              </button>
              <div className="flex gap-2">
                <input
                  placeholder="55.75, 37.61 or a maps link"
                  value={manualLocationInput}
                  onChange={(e) => setManualLocationInput(e.target.value)}
                  className={input}
                />
                <button type="button" onClick={applyManualLocation} className={buttonGhost}>
                  Set
                </button>
              </div>
            </div>
          )}
          {locationError && <p className="text-[13px] font-medium text-red-500">{locationError}</p>}
        </div>
      )}

      {!readOnly && addMode !== "none" && (
        <div className="panel-appear flex flex-col gap-3">
          <div className="inline-flex w-fit gap-1 self-start rounded-full bg-[var(--app-overlay)] p-1 ring-1 ring-[var(--app-outline)]/10">
            <button
              type="button"
              onClick={() => setAddMode("manual")}
              className={`${pillToggle} inline-flex items-center gap-1 border-0 ${addMode === "manual" ? pillToggleActive : pillToggleInactive}`}
            >
              <PencilLine size={14} />
              Manual
            </button>
            <button
              type="button"
              onClick={() => setAddMode("import")}
              className={`${pillToggle} inline-flex items-center gap-1 border-0 ${addMode === "import" ? pillToggleActive : pillToggleInactive}`}
            >
              <FileUp size={14} />
              Import file
            </button>
          </div>

          {addMode === "manual" && <DateIdeaForm onSubmit={createIdea} onCancel={() => setAddMode("none")} />}

          {addMode === "import" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 rounded-[22px] border border-[var(--app-outline)]/10 bg-[var(--app-yellow)] p-4 shadow-[0_2px_0_rgba(28,26,23,0.08)]">
                <span className={mutedText}>Files (.md / .txt) — pick several at once if you like</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md,.txt"
                  multiple
                  onChange={handleFiles}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`${buttonSecondary} w-full bg-[var(--app-overlay)]`}
                >
                  <Upload size={18} />
                  Choose files
                </button>
              </div>

              {importItems.length > 0 && (
                <p className={mutedText}>
                  Parsed {importItems.length} {importItems.length === 1 ? "file" : "files"} — review and save each:
                </p>
              )}

              {importItems.map((item) => (
                <div key={item.id} className="panel-appear flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className={mutedText}>{item.source}</span>
                    <button onClick={() => dismissImportItem(item.id)} className={buttonGhost}>Skip</button>
                  </div>
                  <DateIdeaForm
                    initial={item.parsed}
                    onSubmit={(input) => saveImportItem(item.id, input)}
                    onCancel={() => dismissImportItem(item.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!ideas && <p className={mutedText}>Loading…</p>}

      <div className="flex flex-col gap-3">
        {filtered.map((idea) =>
          !readOnly && editing?.id === idea.id ? (
            <DateIdeaForm
              key={idea.id}
              initial={dateIdeaToInput(idea)}
              onSubmit={(input) => updateIdea(idea.id, input)}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <div key={idea.id} className={`${card} ${metroPastelTone(idea.locations[0]?.metro) ?? pastelTone(idea.id)} flex flex-col gap-2.5 transition`}>
              <div className="flex justify-between items-start gap-2">
                <h2 className="flex items-start gap-1.5 text-[19px] font-semibold leading-[1.05]">
                  <span>{idea.title}</span>
                </h2>
                {!readOnly && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => setEditing(idea)}
                      aria-label="Edit"
                      className={`${iconButton} bg-[var(--app-overlay)] text-[var(--app-ink)] ring-1 ring-[var(--app-outline)]/10`}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => remove(idea.id)}
                      aria-label="Delete"
                      className={`${iconButton} bg-[var(--app-overlay)] text-red-500 ring-1 ring-[var(--app-outline)]/10`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              {idea.locations.length > 0 && (
                <div className="flex flex-col gap-1">
                  {idea.locations.map((loc) => (
                    <div key={loc.id} className="flex items-center gap-1.5">
                      <p className={mutedText}>
                        {[loc.address, loc.metro && `M ${loc.metro}`].filter(Boolean).join(" · ") || "No address"}
                      </p>
                      {loc.url && (
                        <a href={loc.url} target="_blank" rel="noreferrer" className="text-[var(--app-ink)]">
                          <LinkIcon size={12} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {sort === "nearby" && userLocation && (
                <p className={mutedText}>
                  <MapPin className="mr-1 inline align-text-bottom" size={12} />
                  {distanceById.has(idea.id) ? `${formatDistanceKm(distanceById.get(idea.id)!)} away` : "No coordinates"}
                </p>
              )}
              {idea.priceNote && <p className="text-[14px] font-semibold">{priceTier(idea.priceNote) ?? idea.priceNote}</p>}
              {idea.swipeDescription && (
                <p className="text-[14px] leading-snug">{idea.swipeDescription}</p>
              )}
              {idea.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {idea.tags.map((t) => (
                    <span key={t.tag.id} className={pill}>{t.tag.name}</span>
                  ))}
                </div>
              )}
            </div>
          )
        )}
        {ideas && filtered.length === 0 && (
          <p className={`${card} ${mutedText}`}>Nothing here yet — add your first idea.</p>
        )}
      </div>
    </div>
  );
}
