"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import type { DateIdeaInput } from "@/lib/types";
import { parseCoordinates, parseMapsLink, formatCoordinates } from "@/lib/coords";
import { input, label as labelClass, buttonPrimary, buttonSecondary, buttonGhost } from "@/lib/ui";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), { ssr: false });

export default function DateIdeaForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<DateIdeaInput>;
  onSubmit: (input: DateIdeaInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [metro, setMetro] = useState(initial?.metro ?? "");
  const [coords, setCoords] = useState(formatCoordinates(initial?.lat ?? null, initial?.lng ?? null));
  const [description, setDescription] = useState(initial?.description ?? "");
  const [swipeDescription, setSwipeDescription] = useState(initial?.swipeDescription ?? "");
  const [priceNote, setPriceNote] = useState(initial?.priceNote ?? "");
  const [tags, setTags] = useState(initial?.tags?.join(", ") ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  function handleCoordsChange(value: string) {
    if (/https?:\/\//.test(value)) {
      const parsed = parseMapsLink(value);
      if (parsed) {
        setCoords(formatCoordinates(parsed.lat, parsed.lng));
        return;
      }
    }
    setCoords(value);
  }

  function handlePick(lat: number, lng: number) {
    setCoords(formatCoordinates(lat, lng));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedCoords = coords.trim()
      ? parseCoordinates(coords) ?? parseMapsLink(coords)
      : null;
    if (coords.trim() && !parsedCoords) {
      setError("Укажи координаты 55.75, 37.61 или ссылку на Яндекс/Google Карты");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        title,
        address,
        metro,
        lat: parsedCoords?.lat ?? null,
        lng: parsedCoords?.lng ?? null,
        description,
        swipeDescription,
        priceNote,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-[22px] border border-[var(--app-outline)]/10 bg-[var(--app-mint)] p-4 shadow-[0_2px_0_rgba(28,26,23,0.08)]"
    >
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--app-muted)]">Карточка идеи</span>
        <h2 className="mt-1 text-[20px] font-semibold leading-none">Детали свидания</h2>
      </div>
      <div className="flex flex-col gap-1">
        <span className={labelClass}>Название</span>
        <input required placeholder="Пикник в парке" value={title} onChange={(e) => setTitle(e.target.value)} className={input} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <span className={labelClass}>Адрес</span>
          <input placeholder="Улица, дом" value={address} onChange={(e) => setAddress(e.target.value)} className={input} />
        </div>
        <div className="flex flex-col gap-1">
          <span className={labelClass}>Метро</span>
          <input placeholder="Охотный ряд" value={metro} onChange={(e) => setMetro(e.target.value)} className={input} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className={labelClass}>Координаты</span>
        <div className="flex gap-2">
          <input
            placeholder="55.75, 37.61 или ссылка на Яндекс/Google Карты"
            value={coords}
            onChange={(e) => handleCoordsChange(e.target.value)}
            className={input}
          />
          <button type="button" onClick={() => setShowPicker((v) => !v)} className={buttonGhost}>
            <MapPin size={16} />
            На карте
          </button>
        </div>
        {showPicker && (
          <div className="mt-2">
            <LocationPicker
              lat={parseCoordinates(coords)?.lat ?? null}
              lng={parseCoordinates(coords)?.lng ?? null}
              onPick={handlePick}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <span className={labelClass}>Теги</span>
        <input placeholder="романтика, искусство" value={tags} onChange={(e) => setTags(e.target.value)} className={input} />
      </div>

      <div className="flex flex-col gap-1">
        <span className={labelClass}>Цена</span>
        <input placeholder="1500–3000 ₽" value={priceNote} onChange={(e) => setPriceNote(e.target.value)} className={input} />
      </div>

      <div className="flex flex-col gap-1">
        <span className={labelClass}>Описание для свайпа</span>
        <textarea
          placeholder="Коротко: суть, плюсы и почему стоит лайкнуть"
          value={swipeDescription}
          onChange={(e) => setSwipeDescription(e.target.value)}
          className={input}
          rows={2}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className={labelClass}>Описание</span>
        <textarea
          placeholder="Свободный текст"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={input}
          rows={3}
        />
      </div>

      {error && <p className="rounded-xl bg-white/65 px-3 py-2 text-[13px] font-medium text-red-600">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving} className={buttonPrimary}>
          {saving ? "Сохраняю…" : "Сохранить"}
        </button>
        <button type="button" onClick={onCancel} className={buttonSecondary}>
          Отмена
        </button>
      </div>
    </form>
  );
}
