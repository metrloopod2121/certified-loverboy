"use client";

import { useState } from "react";
import type { DateIdeaInput } from "@/lib/types";
import { parseCoordinates, formatCoordinates } from "@/lib/coords";

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
  const [priceNote, setPriceNote] = useState(initial?.priceNote ?? "");
  const [tags, setTags] = useState(initial?.tags?.join(", ") ?? "");
  const [inPartnerDeck, setInPartnerDeck] = useState(initial?.inPartnerDeck ?? false);
  const [showPriceToPartner, setShowPriceToPartner] = useState(initial?.showPriceToPartner ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 border rounded-lg">
      <input
        required
        placeholder="Название"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="border rounded px-3 py-2"
      />
      <input
        placeholder="Адрес"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        className="border rounded px-3 py-2"
      />
      <input
        placeholder="Метро"
        value={metro}
        onChange={(e) => setMetro(e.target.value)}
        className="border rounded px-3 py-2"
      />
      <input
        placeholder="Координаты: 55.75, 37.61"
        value={coords}
        onChange={(e) => setCoords(e.target.value)}
        className="border rounded px-3 py-2"
      />
      <input
        placeholder="Теги через запятую"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        className="border rounded px-3 py-2"
      />
      <input
        placeholder="Цена (свободный текст)"
        value={priceNote}
        onChange={(e) => setPriceNote(e.target.value)}
        className="border rounded px-3 py-2"
      />
      <textarea
        placeholder="Описание"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="border rounded px-3 py-2"
        rows={3}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={inPartnerDeck}
          onChange={(e) => setInPartnerDeck(e.target.checked)}
        />
        Показывать партнёрше (в деке для свайпа)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={showPriceToPartner}
          onChange={(e) => setShowPriceToPartner(e.target.checked)}
        />
        Показывать ей цену
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded bg-foreground text-background text-sm"
        >
          {saving ? "Сохраняю…" : "Сохранить"}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded border text-sm">
          Отмена
        </button>
      </div>
    </form>
  );
}
