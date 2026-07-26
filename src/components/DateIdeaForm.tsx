"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, Plus, X, Link as LinkIcon, Check } from "lucide-react";
import type { DateIdeaInput, LocationInput, PlaceLinkInput } from "@/lib/types";
import { parseMapsLink, isYandexMapsUrl } from "@/lib/coords";
import { input, label as labelClass, buttonPrimary, buttonSecondary, buttonGhost, iconButton } from "@/lib/ui";
import { useLang, useT } from "@/hooks/useLang";
import { locationsCountLabel, locationOrdinalLabel } from "@/lib/i18n";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), { ssr: false });

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
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priceNote, setPriceNote] = useState(initial?.priceNote ?? "");
  const [tags, setTags] = useState(initial?.tags?.join(", ") ?? "");
  const [locations, setLocations] = useState<LocationForm[]>(
    initial?.locations?.length ? initial.locations.map(toLocationForm) : [EMPTY_LOCATION]
  );
  const [links, setLinks] = useState<PlaceLinkInput[]>(initial?.links ?? []);
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateLocation(index: number, patch: Partial<LocationForm>) {
    setLocations((prev) => prev.map((loc, i) => (i === index ? { ...loc, ...patch } : loc)));
  }

  function handleMapsLinkChange(index: number, value: string) {
    // Preserves any already-known lat/lng when the new link doesn't itself carry coordinates,
    // rather than blanking out a good pin just because a link couldn't be read.
    setLocations((prev) =>
      prev.map((loc, i) => {
        if (i !== index) return loc;
        if (!value.trim()) return { ...loc, mapsLink: "", mapsLinkError: null, mapsLinkHint: null };
        if (!isYandexMapsUrl(value)) {
          return { ...loc, mapsLink: value, mapsLinkError: t("onlyYandexError"), mapsLinkHint: null };
        }
        const coords = parseMapsLink(value);
        return {
          ...loc,
          mapsLink: value,
          mapsLinkError: null,
          mapsLinkHint: coords ? null : t("noCoordsHint"),
          lat: coords?.lat ?? loc.lat,
          lng: coords?.lng ?? loc.lng,
        };
      })
    );
  }

  function pickOnMap(index: number, lat: number, lng: number) {
    updateLocation(index, { lat, lng });
  }

  function clearLocationPin(index: number) {
    updateLocation(index, { lat: null, lng: null });
  }

  function addLocation() {
    setLocations((prev) => [...prev, EMPTY_LOCATION]);
  }

  function removeLocation(index: number) {
    setLocations((prev) => prev.filter((_, i) => i !== index));
    if (pickerFor === index) setPickerFor(null);
  }

  function updateLink(index: number, patch: Partial<PlaceLinkInput>) {
    setLinks((prev) => prev.map((link, i) => (i === index ? { ...link, ...patch } : link)));
  }

  function addLink() {
    setLinks((prev) => [...prev, { label: "", url: "" }]);
  }

  function removeLink(index: number) {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const blockingError = locations.find((loc) => loc.mapsLinkError)?.mapsLinkError;
    if (blockingError) {
      setError(blockingError);
      return;
    }

    const resolvedLocations: LocationInput[] = [];
    // Carries a non-map `url` inherited from an older record over to the idea-level links list
    // instead of dropping it, since it's no longer allowed to live in location.url.
    const migratedLinks: PlaceLinkInput[] = [];
    for (const loc of locations) {
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

    setSaving(true);
    try {
      await onSubmit({
        title,
        description,
        priceNote,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        locations: resolvedLocations,
        links: dedupedLinks,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("couldntSave"));
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

            <div className="flex flex-col gap-1">
              <div className="flex gap-2">
                <input
                  placeholder={t("mapsLinkPlaceholder")}
                  value={loc.mapsLink}
                  onChange={(e) => handleMapsLinkChange(index, e.target.value)}
                  className={input}
                />
                <button
                  type="button"
                  onClick={() => setPickerFor(pickerFor === index ? null : index)}
                  className={`${buttonGhost} shrink-0`}
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
        <button type="button" onClick={onCancel} className={buttonSecondary}>
          {t("cancelBtn")}
        </button>
      </div>
    </form>
  );
}
