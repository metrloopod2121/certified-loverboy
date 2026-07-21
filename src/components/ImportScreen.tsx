"use client";

import { useRef, useState } from "react";
import { Upload, Check } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";
import { parseDateMarkdown, type ParsedDateIdea } from "@/lib/parseDateMarkdown";
import type { DateIdeaInput } from "@/lib/types";
import DateIdeaForm from "@/components/DateIdeaForm";
import { input, buttonPrimary, buttonSecondary, buttonGhost, pageHeading, mutedText } from "@/lib/ui";

type PendingItem = {
  id: string;
  source: string;
  parsed: ParsedDateIdea;
};

let nextId = 0;

export default function ImportScreen() {
  const [raw, setRaw] = useState("");
  const [items, setItems] = useState<PendingItem[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems = await Promise.all(
      Array.from(files).map(async (file) => ({
        id: `f${nextId++}`,
        source: file.name,
        parsed: parseDateMarkdown(await file.text()),
      }))
    );
    setItems((prev) => [...prev, ...newItems]);
    e.target.value = "";
  }

  function handleParseText() {
    if (!raw.trim()) return;
    setItems((prev) => [
      ...prev,
      { id: `t${nextId++}`, source: "вставленный текст", parsed: parseDateMarkdown(raw) },
    ]);
    setRaw("");
  }

  function dismiss(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleSave(id: string, input: DateIdeaInput) {
    await apiFetch("/api/date-ideas", { method: "POST", body: JSON.stringify(input) });
    setSavedCount((n) => n + 1);
    dismiss(id);
  }

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto p-4 pb-6">
      <div>
        <h1 className={pageHeading}>Импорт идей</h1>
      </div>

      <div className="flex flex-col gap-2 rounded-[22px] border border-[var(--app-outline)]/10 bg-[var(--app-yellow)] p-4 shadow-[0_2px_0_rgba(28,26,23,0.08)]">
        <span className={mutedText}>Файлы (.md / .txt) — можно выбрать сразу несколько</span>
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
          Выбрать файлы
        </button>
      </div>

      <div className="flex flex-col gap-2 rounded-[22px] border border-[var(--app-outline)]/10 bg-[var(--app-lilac)] p-4 shadow-[0_2px_0_rgba(28,26,23,0.08)]">
        <span className={mutedText}>…или вставить текст одной свиданки</span>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={"# Название\nАдрес: ...\nМетро: ...\nКоординаты: 55.75, 37.61\nТеги: романтика, искусство\nЦена: 1500-3000 ₽\nОписание для свайпа: короткий текст для карточки\n\nСвободное описание."}
          rows={8}
          className={`${input} bg-[var(--app-overlay)] font-mono text-[13px]`}
        />
        <button onClick={handleParseText} disabled={!raw.trim()} className={`${buttonPrimary} w-full mt-1`}>
          Разобрать
        </button>
      </div>

      {savedCount > 0 && (
        <p className="flex items-center gap-1 rounded-xl bg-[var(--app-mint)] px-3 py-2 text-[14px] font-semibold text-[var(--app-ink)]">
          <Check size={16} /> Сохранено: {savedCount}
        </p>
      )}

      {items.length > 0 && (
        <p className={`${mutedText} rounded-xl bg-[var(--app-surface)] px-3 py-2`}>
          Разобрано {items.length} {items.length === 1 ? "файл" : "файла(ов)"} — проверь и сохрани каждую:
        </p>
      )}

      <div className="flex flex-col gap-4">
        {items.map((item) => (
          <div key={item.id} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className={mutedText}>{item.source}</span>
              <button onClick={() => dismiss(item.id)} className={buttonGhost}>Пропустить</button>
            </div>
            <DateIdeaForm
              initial={item.parsed}
              onSubmit={(input) => handleSave(item.id, input)}
              onCancel={() => dismiss(item.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
