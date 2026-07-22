"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Heart, MapPin, Plus, Utensils, X } from "lucide-react";
import type { DateIdeaInput, DateIdeaType, LocationInput } from "@/lib/types";
import { parseCoordinates, parseMapsLink, formatCoordinates } from "@/lib/coords";
import { input, label as labelClass, buttonPrimary, buttonSecondary, buttonGhost, iconButton, pillToggle, pillToggleActive, pillToggleInactive } from "@/lib/ui";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), { ssr: false });

type LocationForm = {
  address: string;
  metro: string;
  coords: string;
  url: string;
};

const EMPTY_LOCATION: LocationForm = { address: "", metro: "", coords: "", url: "" };

function toLocationForm(loc: LocationInput): LocationForm {
  return { address: loc.address, metro: loc.metro, coords: formatCoordinates(loc.lat, loc.lng), url: loc.url };
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
  const [type, setType] = useState<DateIdeaType>(initial?.type ?? "DATE");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [swipeDescription, setSwipeDescription] = useState(initial?.swipeDescription ?? "");
  const [priceNote, setPriceNote] = useState(initial?.priceNote ?? "");
  const [tags, setTags] = useState(initial?.tags?.join(", ") ?? "");
  const [locations, setLocations] = useState<LocationForm[]>(
    initial?.locations?.length ? initial.locations.map(toLocationForm) : [EMPTY_LOCATION]
  );
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateLocation(index: number, patch: Partial<LocationForm>) {
    setLocations((prev) => prev.map((loc, i) => (i === index ? { ...loc, ...patch } : loc)));
  }

  function handleCoordsChange(index: number, value: string) {
    if (/https?:\/\//.test(value)) {
      const parsed = parseMapsLink(value);
      if (parsed) {
        // Keep the original link too (not just the extracted point) so the popup/list
        // can still take you to the actual venue page, not just a bare map pin.
        setLocations((prev) =>
          prev.map((loc, i) =>
            i === index
              ? { ...loc, coords: formatCoordinates(parsed.lat, parsed.lng), url: loc.url.trim() ? loc.url : value }
              : loc
          )
        );
        return;
      }
    }
    updateLocation(index, { coords: value });
  }

  function addLocation() {
    setLocations((prev) => [...prev, EMPTY_LOCATION]);
  }

  function removeLocation(index: number) {
    setLocations((prev) => prev.filter((_, i) => i !== index));
    if (pickerFor === index) setPickerFor(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const resolvedLocations: LocationInput[] = [];
    for (const loc of locations) {
      const isEmpty = !loc.address.trim() && !loc.metro.trim() && !loc.coords.trim() && !loc.url.trim();
      if (isEmpty) continue;

      const parsedCoords = loc.coords.trim()
        ? parseCoordinates(loc.coords) ?? parseMapsLink(loc.coords)
        : null;
      if (loc.coords.trim() && !parsedCoords) {
        setError("Enter coordinates like 55.75, 37.61 or a Yandex/Google Maps link");
        return;
      }

      resolvedLocations.push({
        address: loc.address,
        metro: loc.metro,
        lat: parsedCoords?.lat ?? null,
        lng: parsedCoords?.lng ?? null,
        url: loc.url,
      });
    }

    setSaving(true);
    try {
      await onSubmit({
        type,
        title,
        description,
        swipeDescription,
        priceNote,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        locations: resolvedLocations,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save");
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
        <h2 className="text-[20px] font-semibold leading-none">{type === "FOOD" ? "Venue details" : "Date details"}</h2>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className={labelClass}>Type</span>
        <div className="inline-flex w-fit gap-1 rounded-full bg-[var(--app-overlay)] p-1 ring-1 ring-[var(--app-outline)]/10">
          {([
            ["DATE", "Date", Heart],
            ["FOOD", "Food", Utensils],
          ] as const).map(([value, text, Icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              className={`${pillToggle} inline-flex items-center gap-1 border-0 ${type === value ? pillToggleActive : pillToggleInactive}`}
            >
              <Icon size={15} />
              {text}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className={labelClass}>Title</span>
        <input required placeholder={type === "FOOD" ? "Cozy café nearby" : "Picnic in the park"} value={title} onChange={(e) => setTitle(e.target.value)} className={input} />
      </div>

      <div className="flex flex-col gap-3">
        <span className={labelClass}>Locations ({locations.length})</span>
        {locations.map((loc, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-2xl bg-[var(--app-subtle-overlay)] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[var(--app-muted)]">Location {index + 1}</span>
              {locations.length > 0 && (
                <button
                  type="button"
                  onClick={() => removeLocation(index)}
                  aria-label="Remove location"
                  className={`${iconButton} size-7 bg-black/5 text-[var(--app-ink)]`}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="Street, building"
                value={loc.address}
                onChange={(e) => updateLocation(index, { address: e.target.value })}
                className={input}
              />
              <input
                placeholder="Metro"
                value={loc.metro}
                onChange={(e) => updateLocation(index, { metro: e.target.value })}
                className={input}
              />
            </div>

            <div className="flex gap-2">
              <input
                placeholder="55.75, 37.61 or a maps link"
                value={loc.coords}
                onChange={(e) => handleCoordsChange(index, e.target.value)}
                className={input}
              />
              <button
                type="button"
                onClick={() => setPickerFor(pickerFor === index ? null : index)}
                className={buttonGhost}
              >
                <MapPin size={16} />
                Map
              </button>
            </div>

            {pickerFor === index && (
              <LocationPicker
                lat={parseCoordinates(loc.coords)?.lat ?? null}
                lng={parseCoordinates(loc.coords)?.lng ?? null}
                onPick={(lat, lng) => updateLocation(index, { coords: formatCoordinates(lat, lng) })}
              />
            )}

            <input
              placeholder="Link (booking, instagram, etc.)"
              value={loc.url}
              onChange={(e) => updateLocation(index, { url: e.target.value })}
              className={input}
            />
          </div>
        ))}
        <button type="button" onClick={addLocation} className={`${buttonSecondary} self-start`}>
          <Plus size={16} />
          Add location
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <span className={labelClass}>Tags</span>
        <input placeholder="romance, art" value={tags} onChange={(e) => setTags(e.target.value)} className={input} />
      </div>

      <div className="flex flex-col gap-1">
        <span className={labelClass}>Price</span>
        <input placeholder="1500–3000 ₽" value={priceNote} onChange={(e) => setPriceNote(e.target.value)} className={input} />
      </div>

      <div className="flex flex-col gap-1">
        <span className={labelClass}>Swipe description</span>
        <textarea
          placeholder="Short: what it is, and why it's worth a like"
          value={swipeDescription}
          onChange={(e) => setSwipeDescription(e.target.value)}
          className={input}
          rows={2}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className={labelClass}>Description</span>
        <textarea
          placeholder="Free-form notes"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={input}
          rows={3}
        />
      </div>

      {error && <p className="rounded-xl bg-[var(--app-overlay)] px-3 py-2 text-[13px] font-medium text-red-500">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving} className={buttonPrimary}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} className={buttonSecondary}>
          Cancel
        </button>
      </div>
    </form>
  );
}
