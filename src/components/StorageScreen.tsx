"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, X, Link as LinkIcon, Upload, PencilLine, FileUp, Navigation, MapPin, CalendarClock, Map as MapIcon } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";
import { type DateIdea, type DateIdeaInput } from "@/lib/types";
import DateIdeaForm from "@/components/DateIdeaForm";
import ImportReviewSheet, { type ReviewItem } from "@/components/ImportReviewSheet";
import MultiSelectFilter from "@/components/MultiSelectFilter";
import { parseDateMarkdown } from "@/lib/parseDateMarkdown";
import { parseCoordinates, parseMapsLink, findYandexMapsLink, findInstagramLink, findTelegramPostLink } from "@/lib/coords";
import { distanceKm, formatDistanceKm, type LatLng } from "@/lib/geo";
import { priceTier } from "@/lib/priceTier";
import {
  card,
  input,
  select,
  pill,
  pillBlue,
  eventBadgeColors,
  eventCountdownBadge,
  eventCardGlow,
  iconButton,
  pageHeading,
  mutedText,
  pastelTone,
  buttonSecondary,
  buttonGhost,
  pillToggle,
  pillToggleActive,
  pillToggleInactive,
  hashtag,
} from "@/lib/ui";
import { metroPastelTone, metroStations, metroLineTone, sortStationsByLine } from "@/lib/metro";
import { useLang, useT } from "@/hooks/useLang";
import { trackClientEvent } from "@/lib/clientAnalytics";
import { awayText, formatEventCountdown, formatEventWhen, loadingPhrases, type StringKey } from "@/lib/i18n";
import BlobLoader from "@/components/BlobLoader";
import LoadingCaptions from "@/components/LoadingCaptions";

type Sort = "newest" | "title" | "nearby";

const sortOptions: { value: Sort; labelKey: StringKey }[] = [
  { value: "newest", labelKey: "sortNewest" },
  { value: "title", labelKey: "sortTitle" },
  { value: "nearby", labelKey: "sortNearby" },
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

type PendingImport = ReviewItem & {
  source: string;
  /** Which "add" flow produced this draft — tagged onto the place_created analytics event
   *  once it's actually saved. */
  origin: "file_import" | "link_in_app";
};

let nextImportId = 0;

// Temporarily hidden for the public launch (link import covers the common case) — the
// underlying file-import code stays intact behind this, flip back on when needed. Export moved
// to the Profile tab.
const SHOW_FILE_IMPORT = false;

export default function StorageScreen() {
  const { lang } = useLang();
  const t = useT();
  const router = useRouter();
  const [ideas, setIdeas] = useState<DateIdea[] | null>(null);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [metroFilters, setMetroFilters] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>("newest");
  const [addMode, setAddMode] = useState<"none" | "manual" | "import" | "link">("none");
  const [importItems, setImportItems] = useState<PendingImport[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [linkInput, setLinkInput] = useState("");
  const [linkImporting, setLinkImporting] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [openFilter, setOpenFilter] = useState<"tags" | "metro" | "sort" | null>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const sortLabel = t(sortOptions.find((option) => option.value === sort)?.labelKey ?? "sortDefaultLabel");
  const [userLocation, setUserLocation] = useState<LatLng | null>(() => loadSavedLocation());
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [locatingMe, setLocatingMe] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [manualLocationInput, setManualLocationInput] = useState("");

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

  useEffect(() => {
    const updateCurrentTime = () => setCurrentTimeMs(Date.now());
    const frame = window.requestAnimationFrame(updateCurrentTime);
    const timer = window.setInterval(updateCurrentTime, 60_000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(timer);
    };
  }, []);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    ideas?.forEach((idea) => idea.tags.forEach((t) => set.add(t.tag.name)));
    return [...set].sort();
  }, [ideas]);

  const allMetro = useMemo(() => {
    const set = new Set<string>();
    ideas?.forEach((idea) => idea.locations.forEach((loc) => metroStations(loc.metro).forEach((station) => set.add(station))));
    return sortStationsByLine([...set]);
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
    // Upcoming events float to the top regardless of the chosen sort, soonest first -- a past
    // event (already happened) just falls back into the regular sort, same as a plain place.
    const upcomingStartsAt = (idea: DateIdea) =>
      idea.eventStartsAt && new Date(idea.eventStartsAt).getTime() >= currentTimeMs ? new Date(idea.eventStartsAt).getTime() : null;
    result = [...result].sort((a, b) => {
      const aEvent = upcomingStartsAt(a);
      const bEvent = upcomingStartsAt(b);
      if (aEvent != null && bEvent != null) return aEvent - bEvent;
      if (aEvent != null || bEvent != null) return aEvent != null ? -1 : 1;
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "nearby") return (distanceById.get(a.id) ?? Infinity) - (distanceById.get(b.id) ?? Infinity);
      return b.createdAt.localeCompare(a.createdAt);
    });
    return result;
  }, [ideas, tagFilters, metroFilters, sort, distanceById, currentTimeMs]);

  function updateTagFilters(next: string[]) {
    setTagFilters(next);
    trackClientEvent("storage_filter_changed", { type: "tags", count: next.length });
  }

  function updateMetroFilters(next: string[]) {
    setMetroFilters(next);
    trackClientEvent("storage_filter_changed", { type: "metro", count: next.length });
  }

  function selectAddMode(mode: "manual" | "import" | "link") {
    setAddMode(mode);
    trackClientEvent("storage_add_mode_selected", { mode });
  }

  function collapseAddFlow() {
    setAddMode("none");
    setLinkInput("");
    setLinkError(null);
  }

  function openPlace(id: string) {
    trackClientEvent("storage_place_opened", { placeId: id });
    router.push(`/place/${id}`);
  }

  // A place can have several locations -- just pick the first with a pin, same "good enough"
  // choice the Map tab itself makes no attempt to disambiguate further.
  function showOnMap(idea: DateIdea) {
    const location = idea.locations.find((loc) => loc.lat != null && loc.lng != null);
    if (!location) return;
    trackClientEvent("storage_place_map_opened", { placeId: idea.id });
    router.push(`/map?focus=${encodeURIComponent(location.id)}`);
  }

  function saveLocation(loc: LatLng, source: "browser" | "manual") {
    setUserLocation(loc);
    setLocationError(null);
    window.localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(loc));
    trackClientEvent("geo_location_saved", { source });
  }

  function clearLocation() {
    setUserLocation(null);
    window.localStorage.removeItem(LOCATION_STORAGE_KEY);
    trackClientEvent("geo_location_cleared");
  }

  function useMyLocation() {
    trackClientEvent("geo_location_requested");
    if (!navigator.geolocation) {
      setLocationError(t("geoNotSupported"));
      trackClientEvent("geo_location_failed", { reason: "unsupported" });
      return;
    }
    setLocatingMe(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        saveLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }, "browser");
        setLocatingMe(false);
      },
      (err) => {
        setLocationError(err.message || t("geoFailed"));
        trackClientEvent("geo_location_failed", { reason: err.code, message: err.message || "unknown" });
        setLocatingMe(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function applyManualLocation() {
    const parsed = parseCoordinates(manualLocationInput) ?? parseMapsLink(manualLocationInput);
    if (!parsed) {
      setLocationError(t("manualLocationInvalid"));
      trackClientEvent("geo_location_failed", { reason: "manual_parse_failed" });
      return;
    }
    saveLocation(parsed, "manual");
    setManualLocationInput("");
  }

  function toggleAddPanel() {
    setAddMode((m) => {
      const next = m === "none" ? "manual" : "none";
      trackClientEvent(next === "none" ? "storage_add_panel_closed" : "storage_add_panel_opened", { mode: next });
      return next;
    });
    setImportItems([]);
    setLinkInput("");
    setLinkError(null);
  }

  async function createIdea(input: DateIdeaInput) {
    await apiFetch("/api/date-ideas", { method: "POST", body: JSON.stringify({ ...input, source: "manual" }) });
    collapseAddFlow();
    await reload();
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems = await Promise.all(
      Array.from(files).map(async (file) => ({
        id: `f${nextImportId++}`,
        source: file.name,
        origin: "file_import" as const,
        // Markdown files never describe a one-time event -- only link imports do.
        parsed: { ...parseDateMarkdown(await file.text()), eventStartsAt: null, eventEndsAt: null, reminderAt: null },
      }))
    );
    trackClientEvent("storage_file_import_selected", { filesCount: newItems.length });
    setImportItems((prev) => [...prev, ...newItems]);
    collapseAddFlow();
    e.target.value = "";
  }

  function dismissImportItem(id: string) {
    const item = importItems.find((candidate) => candidate.id === id);
    trackClientEvent("storage_import_draft_removed", { origin: item?.origin ?? "unknown" });
    const nextItems = importItems.filter((i) => i.id !== id);
    setImportItems(nextItems);
    if (nextItems.length === 0) collapseAddFlow();
  }

  function closeImportReview() {
    setImportItems([]);
    collapseAddFlow();
  }

  // A share action (Yandex Maps, Instagram, Telegram) often copies a title/caption alongside the
  // URL as one block, not a bare link -- rather than leaving that clutter sitting in the field,
  // collapse it down to just the link the moment one is found, so what's left is only the link.
  function handleLinkInputChange(value: string) {
    const extracted = findYandexMapsLink(value) ?? findInstagramLink(value) ?? findTelegramPostLink(value);
    if (extracted && extracted !== value.trim()) {
      trackClientEvent("storage_link_input_normalized", { rawLength: value.length });
    }
    setLinkInput(extracted && extracted !== value.trim() ? extracted : value);
  }

  async function importFromLink() {
    const url = linkInput.trim();
    if (!url) return;

    setLinkImporting(true);
    setLinkError(null);
    try {
      const { items }: { items: DateIdeaInput[] } = await apiFetch("/api/date-ideas/from-link", {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      const newItems: PendingImport[] = items.map((parsed) => ({
        id: `l${nextImportId++}`,
        source: url,
        origin: "link_in_app",
        parsed,
      }));
      setImportItems((prev) => [...prev, ...newItems]);
      collapseAddFlow();
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : t("couldntParseLink"));
    } finally {
      setLinkImporting(false);
    }
  }

  async function saveImportItem(id: string, input: DateIdeaInput) {
    const origin = importItems.find((item) => item.id === id)?.origin ?? "link_in_app";
    await apiFetch("/api/date-ideas", { method: "POST", body: JSON.stringify({ ...input, source: origin }) });
    dismissImportItem(id);
    collapseAddFlow();
    await reload();
  }

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto p-4 pt-6 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`${pageHeading} whitespace-nowrap`}>{t("storageTitle")}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleAddPanel}
            aria-label={addMode === "none" ? t("addIdea") : t("closeForm")}
            title={addMode === "none" ? t("addIdea") : t("closeForm")}
            className="inline-flex size-12 items-center justify-center rounded-full bg-[var(--app-ink)] text-[var(--app-canvas)] shadow-[0_3px_0_rgba(28,26,23,0.18)] active:scale-90 transition"
          >
            {addMode === "none" ? <Plus size={18} /> : <X size={18} />}
          </button>
        </div>
      </div>

      <div className="relative z-10 flex flex-col gap-2">
        <div className="grid grid-cols-3 gap-2">
          <MultiSelectFilter
            label={t("filterTags")}
            options={allTags}
            selected={tagFilters}
            onChange={updateTagFilters}
            open={openFilter === "tags"}
            onOpenChange={(v) => setOpenFilter(v ? "tags" : null)}
            variant="pills"
            fullWidth
          />
          <MultiSelectFilter
            label={t("filterMetro")}
            options={allMetro}
            selected={metroFilters}
            onChange={updateMetroFilters}
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
                      trackClientEvent("storage_sort_changed", { sort: option.value });
                      setOpenFilter(null);
                    }}
                    className={`w-full rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold leading-none active:bg-black/5 ${
                      sort === option.value ? "bg-[var(--app-yellow)] text-[var(--app-ink)]" : "text-[var(--app-ink)]"
                    }`}
                  >
                    {t(option.labelKey)}
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
                {t("locationSet")}
              </span>
              <button type="button" onClick={clearLocation} className={buttonGhost}>
                {t("change")}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button type="button" onClick={useMyLocation} disabled={locatingMe} className={`${buttonSecondary} w-full`}>
                <Navigation size={16} />
                {locatingMe ? t("locating") : t("useMyLocation")}
              </button>
              <div className="flex gap-2">
                <input
                  placeholder={t("manualLocationPlaceholder")}
                  value={manualLocationInput}
                  onChange={(e) => setManualLocationInput(e.target.value)}
                  className={input}
                />
                <button type="button" onClick={applyManualLocation} className={buttonGhost}>
                  {t("setLocation")}
                </button>
              </div>
            </div>
          )}
          {locationError && <p className="text-[13px] font-medium text-red-500">{locationError}</p>}
        </div>
      )}

      {addMode !== "none" && (
        <div className="panel-appear flex flex-col gap-3">
          <div className="inline-flex w-fit gap-1 self-start rounded-full bg-[var(--app-overlay)] p-1 ring-1 ring-[var(--app-outline)]/10">
            <button
              type="button"
              onClick={() => selectAddMode("manual")}
              className={`${pillToggle} inline-flex items-center gap-1 border-0 ${addMode === "manual" ? pillToggleActive : pillToggleInactive}`}
            >
              <PencilLine size={14} />
              {t("tabManual")}
            </button>
            <button
              type="button"
              onClick={() => selectAddMode("link")}
              className={`${pillToggle} inline-flex items-center gap-1 border-0 ${addMode === "link" ? pillToggleActive : pillToggleInactive}`}
            >
              <LinkIcon size={14} />
              {t("tabLink")}
            </button>
            {SHOW_FILE_IMPORT && (
              <button
                type="button"
                onClick={() => selectAddMode("import")}
                className={`${pillToggle} inline-flex items-center gap-1 border-0 ${addMode === "import" ? pillToggleActive : pillToggleInactive}`}
              >
                <FileUp size={14} />
                {t("tabImportFile")}
              </button>
            )}
          </div>

          {addMode === "manual" && <DateIdeaForm onSubmit={createIdea} onCancel={collapseAddFlow} />}

          {addMode === "link" && (
            <div className="flex flex-col gap-2 rounded-[22px] border border-[var(--app-outline)]/10 bg-[var(--app-yellow)] p-4 shadow-[0_2px_0_rgba(28,26,23,0.08)]">
              <span className={mutedText}>{t("pasteYandexLink")}</span>
              {/* A textarea, not a single-line input: sharing a place from the Yandex Maps app
                  often copies "Title\nAddress\nhttps://..." as one block, not a bare URL — a
                  single-line input can mangle or truncate that on paste. The server pulls the
                  link out of whatever text lands here either way. */}
              <textarea
                placeholder={t("linkPlaceholder")}
                value={linkInput}
                onChange={(e) => handleLinkInputChange(e.target.value)}
                className={input}
                rows={2}
              />
              <button
                type="button"
                onClick={importFromLink}
                disabled={linkImporting || !linkInput.trim()}
                className={`${buttonSecondary} w-full bg-[var(--app-overlay)] disabled:opacity-50`}
              >
                {linkImporting ? t("reading") : t("add")}
              </button>
              {linkError && <p className="text-[13px] font-medium text-red-500">{linkError}</p>}
            </div>
          )}

          {addMode === "import" && (
            <div className="flex flex-col gap-2 rounded-[22px] border border-[var(--app-outline)]/10 bg-[var(--app-yellow)] p-4 shadow-[0_2px_0_rgba(28,26,23,0.08)]">
              <span className={mutedText}>{t("filesHint")}</span>
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
                {t("chooseFiles")}
              </button>
            </div>
          )}

        </div>
      )}

      {!ideas && <p className={mutedText}>{t("loadingEllipsis")}</p>}

      <div className="flex flex-col gap-3">
        {filtered.map((idea) => {
          const eventCountdown = idea.eventStartsAt ? formatEventCountdown(lang, idea.eventStartsAt, currentTimeMs) : null;

          return (
            <div
              key={idea.id}
              role="button"
              tabIndex={0}
              onClick={() => openPlace(idea.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") openPlace(idea.id);
              }}
              className={`${card} ${
                idea.eventStartsAt
                  ? eventCardGlow
                  : metroPastelTone(idea.locations[0]?.metro) ?? pastelTone(idea.id)
              } flex cursor-pointer flex-col gap-2.5 transition active:scale-[0.99]`}
            >
              {idea.eventStartsAt && (
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className={`inline-flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold ${eventBadgeColors}`}>
                    <CalendarClock className="shrink-0" size={13} />
                    <span className="truncate">{formatEventWhen(lang, idea.eventStartsAt, idea.eventEndsAt)}</span>
                  </div>
                  {eventCountdown && <div className={eventCountdownBadge}>{eventCountdown}</div>}
                </div>
              )}
              <div className="flex justify-between items-center gap-2">
                <h2 className="flex items-center gap-1.5 text-[19px] font-semibold leading-[1.05]">
                  <span>{idea.title}</span>
                </h2>
                {idea.locations.some((loc) => loc.lat != null && loc.lng != null) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      showOnMap(idea);
                    }}
                    aria-label={t("showOnMapAria")}
                    className={`${iconButton} bg-[var(--app-overlay)] text-[var(--app-ink)] ring-1 ring-[var(--app-outline)]/10`}
                  >
                    <MapIcon size={16} />
                  </button>
                )}
              </div>
              {idea.locations.length > 0 && (
                <div className="flex flex-col gap-1">
                  {idea.locations.map((loc) => {
                    const stations = metroStations(loc.metro);
                    return (
                      <div key={loc.id} className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                        {stations.map((station) => (
                          <span
                            key={station}
                            className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--app-ink)]"
                          >
                            <span className={`size-2.5 shrink-0 rounded-full shadow-[0_0_8px_rgba(28,26,23,0.12)] ring-1 ring-white/70 ${metroLineTone(station) ?? "bg-[var(--app-muted)]"}`} />
                            {station}
                          </span>
                        ))}
                        {loc.address ? (
                          <p className={mutedText}>{loc.address}</p>
                        ) : stations.length === 0 ? (
                          <p className={mutedText}>{t("noAddress")}</p>
                        ) : null}
                        {loc.url && (
                          <a
                            href={loc.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[var(--app-ink)]"
                          >
                            <LinkIcon size={12} />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {sort === "nearby" && userLocation && (
                <p className={mutedText}>
                  <MapPin className="mr-1 inline align-text-bottom" size={12} />
                  {distanceById.has(idea.id) ? awayText(lang, formatDistanceKm(distanceById.get(idea.id)!)) : t("noCoordinates")}
                </p>
              )}
              {idea.priceNote && <p className="text-[14px] font-semibold">{priceTier(idea.priceNote) ?? idea.priceNote}</p>}
              {idea.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {idea.tags.map((t) => (
                    <span key={t.tag.id} className={idea.eventStartsAt ? pillBlue : pill}>{hashtag(t.tag.name)}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {ideas && filtered.length === 0 && (
          <p className={`${card} ${mutedText}`}>{t("nothingYet")}</p>
        )}
      </div>

      {linkImporting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-[var(--app-canvas)]/90 backdrop-blur-sm">
          <BlobLoader size={104} />
          <p className="text-[15px] font-semibold text-[var(--app-ink)]">{t("readingLinkOverlay")}</p>
          <LoadingCaptions key={lang} phrases={loadingPhrases(lang)} />
        </div>
      )}

      <ImportReviewSheet
        items={importItems}
        onAdd={saveImportItem}
        onSkip={dismissImportItem}
        onClose={closeImportReview}
      />
    </div>
  );
}
