"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
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
  const [inPartnerDeck, setInPartnerDeck] = useState(initial?.inPartnerDeck ?? false);
  const [showPriceToPartner, setShowPriceToPartner] = useState(initial?.showPriceToPartner ?? false);
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

    const parsedCoords = coords.trim() ? parseCoordinates(coords) : null;
    if (coords.trim() && !parsedCoords) {
      setError("Координаты должны быть в формате: 55.75, 37.61");
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
        inPartnerDeck,
        showPriceToPartner,
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
      className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-[var(--tg-secondary-bg)] p-4 dark:border-white/10"
    >
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
            📍 На карте
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

      <div className="flex flex-col gap-2 rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.05]">
        <label className="flex items-center justify-between gap-2 text-[14px]">
          Показывать партнёрше
          <input
            type="checkbox"
            checked={inPartnerDeck}
            onChange={(e) => setInPartnerDeck(e.target.checked)}
            className="h-5 w-5 accent-[var(--tg-button)]"
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-[14px]">
          Показывать ей цену
          <input
            type="checkbox"
            checked={showPriceToPartner}
            onChange={(e) => setShowPriceToPartner(e.target.checked)}
            className="h-5 w-5 accent-[var(--tg-button)]"
          />
        </label>
      </div>

      {error && <p className="text-[13px] text-red-500">{error}</p>}

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
