"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, Plus, X, Link as LinkIcon, Check, CalendarClock } from "lucide-react";
import type { DateIdeaInput, LocationInput, PlaceLinkInput } from "@/lib/types";
import { parseMapsLink, isYandexMapsUrl, findYandexMapsLink } from "@/lib/coords";
import { apiFetch } from "@/lib/apiClient";
import { input, label as labelClass, buttonPrimary, buttonSecondary, buttonGhost, iconButton } from "@/lib/ui";
import { trackClientEvent } from "@/lib/clientAnalytics";
import { useLang, useT } from "@/hooks/useLang";
import { useAuth } from "@/hooks/useAuth";
import { locationsCountLabel, locationOrdinalLabel } from "@/lib/i18n";

/** Splits an ISO instant into the local "yyyy-mm-dd" / "HH:mm" strings the native date/time
 *  inputs want. A time of exactly midnight is treated as "no time entered" (matches the
 *  create-side convention: unknown time is stored as midnight). */
function splitEventIso(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = d.getHours() === 0 && d.getMinutes() === 0 ? "" : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { date, time };
}

/** Combines the local date/time inputs back into a single ISO instant -- no date means no
 *  event at all; a date with no time defaults to midnight (unknown time, not literal midnight). */
function combineEventIso(date: string, time: string): string | null {
  if (!date) return null;
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time ? time.split(":").map(Number) : [0, 0];
  const d = new Date(year, month - 1, day, hours || 0, minutes || 0);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), { ssr: false });

const eventDateTimeGrid = "grid min-w-0 grid-cols-1 gap-2 min-[380px]:grid-cols-[minmax(0,1fr)_7.75rem]";
const eventDateTimeField = "flex min-w-0 flex-col gap-1";
const eventNativeInput =
  "w-full min-w-0 max-w-full appearance-none rounded-xl border border-[var(--app-outline)]/15 bg-[var(--app-surface)] px-3 py-2 text-[14px] leading-tight text-[var(--app-ink)] outline-none transition [color-scheme:light] focus:border-[var(--app-ink)] focus:ring-2 focus:ring-[var(--app-yellow)]";
const eventTimeInput = `${eventNativeInput} max-w-[7.75rem]`;

type LocationForm = {
  address: string;
  metro: string;
  lat: number | null;
  lng: number | null;
  mapsLink: string;
  /** Invalid domain (not Yandex Maps) -- blocks submit until fixed. */
  mapsLinkError: string | null;
  /** Valid Yandex Maps link but no coordinates could be read from it -- informational only. */
  mapsLinkHint: string | null;
  /** A pre-existing, non-map `url` carried over from an older record (e.g. Instagram) --
   *  never shown in the maps-link field, migrated into the idea's `links` list on save. */
  staleUrl: string | null;
};

const EMPTY_LOCATION: LocationForm = {
  address: "",
  metro: "",
  lat: null,
  lng: null,
  mapsLink: "",
  mapsLinkError: null,
  mapsLinkHint: null,
  staleUrl: null,
};

function toLocationForm(loc: LocationInput): LocationForm {
  const isMapLink = loc.url.trim() && isYandexMapsUrl(loc.url);
  return {
    address: loc.address,
    metro: loc.metro,
    lat: loc.lat,
    lng: loc.lng,
    mapsLink: isMapLink ? loc.url : "",
    mapsLinkError: null,
    mapsLinkHint: null,
    staleUrl: !isMapLink && loc.url.trim() ? loc.url.trim() : null,
  };
}

/** Best-effort label for a link migrated out of the old single `location.url` slot. */
function guessLinkLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").includes("instagram.com") ? "Instagram" : "";
  } catch {
    return "";
  }
}

export default function DateIdeaForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<DateIdeaInput>;
  onSubmit: (input: DateIdeaInput) => Promise<void>;
  onCancel: () => void;
}) {
  const { lang } = useLang();
  const t = useT();
  const auth = useAuth();
  const eventsEnabled = auth.status === "authorized" && auth.features.events;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priceNote, setPriceNote] = useState(initial?.priceNote ?? "");
  const [tags, setTags] = useState(initial?.tags?.join(", ") ?? "");
  const initialEventStart = splitEventIso(initial?.eventStartsAt ?? null);
  const initialEventEnd = splitEventIso(initial?.eventEndsAt ?? null);
  const [eventStartDate, setEventStartDate] = useState(initialEventStart.date);
  const [eventStartTime, setEventStartTime] = useState(initialEventStart.time);
  const [eventEndDate, setEventEndDate] = useState(initialEventEnd.date);
  const [eventEndTime, setEventEndTime] = useState(initialEventEnd.time);
  const [locations, setLocations] = useState<LocationForm[]>(
    initial?.locations?.length ? initial.locations.map(toLocationForm) : [EMPTY_LOCATION]
  );
  const [links, setLinks] = useState<PlaceLinkInput[]>(initial?.links ?? []);
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const [resolvingIndex, setResolvingIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formMode = initial ? "edit" : "create";

  function updateLocation(index: number, patch: Partial<LocationForm>) {
    setLocations((prev) => prev.map((loc, i) => (i === index ? { ...loc, ...patch } : loc)));
  }

  function clearEventFields() {
    setEventStartDate("");
    setEventStartTime("");
    setEventEndDate("");
    setEventEndTime("");
    trackClientEvent("place_form_event_cleared", { mode: formMode });
  }

  // A shared Yandex Maps link often carries "Title\nAddress\nhttps://..." as one block, not a
  // bare URL -- collapse it down to just the link the moment one is found, instead of leaving
  // the extra words sitting in the field (same fix as the Storage screen's link-import box).
  function handleMapsLinkTextChange(index: number, value: string) {
    const extracted = findYandexMapsLink(value);
    const cleaned = extracted && extracted !== value.trim() ? extracted : value;
    updateLocation(index, { mapsLink: cleaned, mapsLinkError: null, mapsLinkHint: null });
  }

  /** Validates the current maps-link text and derives lat/lng from it -- preserves any
   *  already-known lat/lng when the link doesn't itself carry coordinates, rather than blanking
   *  out a good pin just because a link couldn't be read. */
  function resolveMapsLink(loc: LocationForm): LocationForm {
    const value = loc.mapsLink.trim();
    if (!value) return { ...loc, mapsLinkError: null, mapsLinkHint: null };
    if (!isYandexMapsUrl(value)) {
      return { ...loc, mapsLinkError: t("onlyYandexError"), mapsLinkHint: null };
    }
    const coords = parseMapsLink(value);
    return {
      ...loc,
      mapsLinkError: null,
      mapsLinkHint: coords ? null : t("noCoordsHint"),
      lat: coords?.lat ?? loc.lat,
      lng: coords?.lng ?? loc.lng,
    };
  }

  /** Parsing the link is now an explicit action (a button) instead of firing on every keystroke
   *  -- typing/pasting used to trigger an immediate, confusing "invalid link" error before the
   *  user even finished pasting. A share link to an org page (.../org/<slug>/<id>?si=...) --
   *  the common case when copying straight from the Yandex Maps app -- carries no lat/lng in its
   *  own URL, only the page itself has the pin (and the address/metro text), so a local-only
   *  regex parse can't resolve any of it; this falls back to a server fetch + AI read of the
   *  actual page when that happens, filling in address/metro too if they're still blank. */
  async function applyMapsLink(index: number) {
    const current = locations[index];
    const afterLocalCheck = resolveMapsLink(current);

    if (afterLocalCheck.mapsLinkError || !afterLocalCheck.mapsLinkHint) {
      // Invalid domain, empty field, or the URL itself already carried the coordinates.
      updateLocation(index, afterLocalCheck);
      trackClientEvent("place_form_maps_link_applied", {
        mode: formMode,
        index,
        result: afterLocalCheck.mapsLinkError ? "invalid_domain" : "local_coords",
      });
      return;
    }

    updateLocation(index, { mapsLinkError: null, mapsLinkHint: null });
    setResolvingIndex(index);
    try {
      const resolved = await apiFetch("/api/date-ideas/resolve-map-link", {
        method: "POST",
        body: JSON.stringify({ url: current.mapsLink.trim() }),
      });

      const patch: Partial<LocationForm> = {};
      if (typeof resolved?.lat === "number" && typeof resolved?.lng === "number") {
        patch.lat = resolved.lat;
        patch.lng = resolved.lng;
      }
      // Only fills in what the user hasn't already typed themselves -- never overwrites.
      if (resolved?.address && !current.address.trim()) patch.address = resolved.address;
      if (resolved?.metro && !current.metro.trim()) patch.metro = resolved.metro;

      if (Object.keys(patch).length === 0) {
        updateLocation(index, { mapsLinkHint: t("noCoordsHint") });
        trackClientEvent("place_form_maps_link_applied", { mode: formMode, index, result: "no_data" });
      } else {
        updateLocation(index, patch);
        trackClientEvent("place_form_maps_link_applied", { mode: formMode, index, result: "server_data" });
      }
    } catch (err) {
      updateLocation(index, { mapsLinkHint: err instanceof Error ? err.message : t("noCoordsHint") });
      trackClientEvent("place_form_maps_link_applied", { mode: formMode, index, result: "fetch_failed" });
    } finally {
      setResolvingIndex(null);
    }
  }

  function pickOnMap(index: number, lat: number, lng: number) {
    updateLocation(index, { lat, lng });
    trackClientEvent("place_form_location_pin_selected", { mode: formMode, index });
  }

  function clearLocationPin(index: number) {
    updateLocation(index, { lat: null, lng: null });
    trackClientEvent("place_form_location_pin_cleared", { mode: formMode, index });
  }

  function addLocation() {
    setLocations((prev) => [...prev, EMPTY_LOCATION]);
    trackClientEvent("place_form_location_added", { mode: formMode });
  }

  function removeLocation(index: number) {
    setLocations((prev) => prev.filter((_, i) => i !== index));
    if (pickerFor === index) setPickerFor(null);
    trackClientEvent("place_form_location_removed", { mode: formMode, index });
  }

  function updateLink(index: number, patch: Partial<PlaceLinkInput>) {
    setLinks((prev) => prev.map((link, i) => (i === index ? { ...link, ...patch } : link)));
  }

  function addLink() {
    setLinks((prev) => [...prev, { label: "", url: "" }]);
    trackClientEvent("place_form_link_added", { mode: formMode });
  }

  function removeLink(index: number) {
    setLinks((prev) => prev.filter((_, i) => i !== index));
    trackClientEvent("place_form_link_removed", { mode: formMode, index });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    trackClientEvent("place_form_submit_attempted", { mode: formMode });

    // Re-resolves every maps link at submit time too (idempotent if "Get location from link"
    // was already clicked) so a pasted-but-never-applied link still gets validated instead of
    // silently saving whatever text is sitting in the field.
    const checkedLocations = locations.map(resolveMapsLink);
    const blockingError = checkedLocations.find((loc) => loc.mapsLinkError)?.mapsLinkError;
    if (blockingError) {
      setLocations(checkedLocations);
      setError(blockingError);
      trackClientEvent("place_form_validation_failed", { mode: formMode, reason: "maps_link" });
      return;
    }

    const resolvedLocations: LocationInput[] = [];
    // Carries a non-map `url` inherited from an older record over to the idea-level links list
    // instead of dropping it, since it's no longer allowed to live in location.url.
    const migratedLinks: PlaceLinkInput[] = [];
    for (const loc of checkedLocations) {
      const isEmpty = !loc.address.trim() && !loc.metro.trim() && !loc.mapsLink.trim() && loc.lat == null && loc.lng == null && !loc.staleUrl;
      if (isEmpty) continue;

      resolvedLocations.push({
        address: loc.address,
        metro: loc.metro,
        lat: loc.lat,
        lng: loc.lng,
        url: loc.mapsLink.trim(),
      });

      if (loc.staleUrl) migratedLinks.push({ label: guessLinkLabel(loc.staleUrl), url: loc.staleUrl });
    }

    const resolvedLinks = [...links, ...migratedLinks].filter((link) => link.url.trim());
    const seenLinkUrls = new Set<string>();
    const dedupedLinks = resolvedLinks.filter((link) => {
      if (seenLinkUrls.has(link.url)) return false;
      seenLinkUrls.add(link.url);
      return true;
    });

    // An end time with no end date given assumes the same calendar day as the start.
    const effectiveEndDate = eventEndDate || (eventEndTime ? eventStartDate : "");
    const eventStartsAt = combineEventIso(eventStartDate, eventStartTime);
    const eventEndsAt = combineEventIso(effectiveEndDate, eventEndTime);

    setSaving(true);
    try {
      await onSubmit({
        title,
        description,
        priceNote,
        eventStartsAt,
        eventEndsAt,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        locations: resolvedLocations,
        links: dedupedLinks,
      });
      trackClientEvent("place_form_submitted", { mode: formMode, hasEvent: eventStartsAt != null });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("couldntSave"));
      trackClientEvent("place_form_submit_failed", { mode: formMode, reason: err instanceof Error ? err.message : "unknown" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="panel-appear flex flex-col gap-3 rounded-[22px] border border-[var(--app-outline)]/10 bg-[var(--app-mint)] p-4 shadow-[0_2px_0_rgba(28,26,23,0.08)]"
    >
      <div>
        <h2 className="text-[20px] font-semibold leading-none">{t("placeDetails")}</h2>
      </div>
      <div className="flex flex-col gap-1">
        <span className={labelClass}>{t("titleLabel")}</span>
        <input required placeholder={t("titlePlaceholder")} value={title} onChange={(e) => setTitle(e.target.value)} className={input} />
      </div>

      {eventsEnabled && (
        <div className="flex flex-col gap-2 rounded-2xl bg-[var(--app-subtle-overlay)] p-3">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--app-muted)]">
            <CalendarClock size={14} />
            {t("eventSectionLabel")}
          </span>
          <span className="text-[12px] leading-snug text-[var(--app-muted)]">{t("eventSectionHint")}</span>

          <div className="flex flex-col gap-1">
            <span className={labelClass}>{t("eventStartLabel")}</span>
            <div className={eventDateTimeGrid}>
              <div className={eventDateTimeField}>
                <span className="text-[11px] font-medium text-[var(--app-muted)]">{t("eventDateFieldLabel")}</span>
                <input
                  type="date"
                  value={eventStartDate}
                  onChange={(e) => setEventStartDate(e.target.value)}
                  className={eventNativeInput}
                />
              </div>
              <div className={eventDateTimeField}>
                <span className="text-[11px] font-medium text-[var(--app-muted)]">{t("eventTimeFieldLabel")}</span>
                <input
                  type="time"
                  value={eventStartTime}
                  onChange={(e) => setEventStartTime(e.target.value)}
                  className={eventTimeInput}
                />
              </div>
            </div>
          </div>

          {eventStartDate && (
            <div className="flex flex-col gap-1">
              <span className={labelClass}>{t("eventEndLabel")}</span>
              <div className={eventDateTimeGrid}>
                <div className={eventDateTimeField}>
                  <span className="text-[11px] font-medium text-[var(--app-muted)]">{t("eventDateFieldLabel")}</span>
                  <input
                    type="date"
                    value={eventEndDate}
                    onChange={(e) => setEventEndDate(e.target.value)}
                    className={eventNativeInput}
                  />
                </div>
                <div className={eventDateTimeField}>
                  <span className="text-[11px] font-medium text-[var(--app-muted)]">{t("eventTimeFieldLabel")}</span>
                  <input
                    type="time"
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                    className={eventTimeInput}
                  />
                </div>
              </div>
            </div>
          )}

          {(eventStartDate || eventEndDate) && (
            <button type="button" onClick={clearEventFields} className={`${buttonGhost} self-start`}>
              <X size={14} />
              {t("eventClearBtn")}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <span className={labelClass}>{locationsCountLabel(lang, locations.length)}</span>
        {locations.map((loc, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-2xl bg-[var(--app-subtle-overlay)] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[var(--app-muted)]">{locationOrdinalLabel(lang, index + 1)}</span>
              {locations.length > 0 && (
                <button
                  type="button"
                  onClick={() => removeLocation(index)}
                  aria-label={t("removeLocationAria")}
                  className={`${iconButton} size-7 bg-black/5 text-[var(--app-ink)]`}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder={t("addressPlaceholder")}
                value={loc.address}
                onChange={(e) => updateLocation(index, { address: e.target.value })}
                className={input}
              />
              <input
                placeholder={t("metroPlaceholder")}
                value={loc.metro}
                onChange={(e) => updateLocation(index, { metro: e.target.value })}
                className={input}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <input
                placeholder={t("mapsLinkPlaceholder")}
                value={loc.mapsLink}
                onChange={(e) => handleMapsLinkTextChange(index, e.target.value)}
                className={input}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => applyMapsLink(index)}
                  disabled={!loc.mapsLink.trim() || resolvingIndex === index}
                  className={`${buttonGhost} disabled:opacity-50`}
                >
                  <LinkIcon size={16} />
                  {resolvingIndex === index ? t("reading") : t("getLocationFromLink")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = pickerFor === index ? null : index;
                    setPickerFor(next);
                    trackClientEvent("place_form_map_picker_toggled", { mode: formMode, index, open: next === index });
                  }}
                  className={buttonGhost}
                >
                  <MapPin size={16} />
                  {t("chooseOnMap")}
                </button>
              </div>
              {loc.mapsLinkError && <span className="text-[12px] font-medium text-red-500">{loc.mapsLinkError}</span>}
              {!loc.mapsLinkError && loc.mapsLinkHint && (
                <span className="text-[12px] text-[var(--app-muted)]">{loc.mapsLinkHint}</span>
              )}
            </div>

            {pickerFor === index && <LocationPicker lat={loc.lat} lng={loc.lng} onPick={(lat, lng) => pickOnMap(index, lat, lng)} />}

            {loc.lat != null && loc.lng != null && (
              <div className="flex items-center justify-between rounded-xl bg-[var(--app-mint)]/50 px-3 py-2">
                <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--app-ink)]">
                  <Check size={14} />
                  {t("locationSelected")}
                </span>
                <button type="button" onClick={() => clearLocationPin(index)} className={buttonGhost}>
                  <X size={14} />
                  {t("clear")}
                </button>
              </div>
            )}
          </div>
        ))}
        <button type="button" onClick={addLocation} className={`${buttonSecondary} self-start`}>
          <Plus size={16} />
          {t("addLocationBtn")}
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <span className={labelClass}>{t("linksLabel")}</span>
        {links.map((link, index) => (
          <div key={index} className="flex items-center gap-2 rounded-2xl bg-[var(--app-subtle-overlay)] p-3">
            <div className="flex flex-1 flex-col gap-2">
              <input
                placeholder={t("linkLabelPlaceholder")}
                value={link.label}
                onChange={(e) => updateLink(index, { label: e.target.value })}
                className={input}
              />
              <input
                placeholder={t("urlPlaceholder")}
                value={link.url}
                onChange={(e) => updateLink(index, { url: e.target.value })}
                className={input}
              />
            </div>
            <button
              type="button"
              onClick={() => removeLink(index)}
              aria-label={t("removeLinkAria")}
              className={`${iconButton} size-7 shrink-0 bg-black/5 text-[var(--app-ink)]`}
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <button type="button" onClick={addLink} className={`${buttonSecondary} self-start`}>
          <LinkIcon size={16} />
          {t("addLinkBtn")}
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <span className={labelClass}>{t("tagsLabel")}</span>
        <input placeholder={t("tagsPlaceholder")} value={tags} onChange={(e) => setTags(e.target.value)} className={input} />
        <span className="text-[12px] leading-snug text-[var(--app-muted)]">{t("tagsHint")}</span>
      </div>

      <div className="flex flex-col gap-1">
        <span className={labelClass}>{t("priceLabel")}</span>
        <input placeholder={t("pricePlaceholder")} value={priceNote} onChange={(e) => setPriceNote(e.target.value)} className={input} />
      </div>

      <div className="flex flex-col gap-1">
        <span className={labelClass}>{t("descriptionLabel")}</span>
        <textarea
          placeholder={t("descriptionPlaceholder")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={input}
          rows={3}
        />
      </div>

      {error && <p className="rounded-xl bg-[var(--app-overlay)] px-3 py-2 text-[13px] font-medium text-red-500">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving} className={buttonPrimary}>
          {saving ? t("savingBtn") : t("saveBtn")}
        </button>
        <button
          type="button"
          onClick={() => {
            trackClientEvent("place_form_cancelled", { mode: formMode });
            onCancel();
          }}
          className={buttonSecondary}
        >
          {t("cancelBtn")}
        </button>
      </div>
    </form>
  );
}
