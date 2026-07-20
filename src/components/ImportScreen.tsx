"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { parseDateMarkdown, type ParsedDateIdea } from "@/lib/parseDateMarkdown";
import type { DateIdeaInput } from "@/lib/types";
import DateIdeaForm from "@/components/DateIdeaForm";

export default function ImportScreen() {
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState<ParsedDateIdea | null>(null);
  const [saved, setSaved] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(setRaw);
  }

  function handleParse() {
    setSaved(false);
    setParsed(parseDateMarkdown(raw));
  }

  async function handleSave(input: DateIdeaInput) {
    await apiFetch("/api/date-ideas", { method: "POST", body: JSON.stringify(input) });
    setSaved(true);
    setParsed(null);
    setRaw("");
  }

  return (
    <div className="p-4 flex flex-col gap-4 max-w-2xl mx-auto">
      <h1 className="text-lg font-semibold">Импорт из markdown</h1>

      <input type="file" accept=".md,.txt" onChange={handleFile} className="text-sm" />

      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder={"# Название\nАдрес: ...\nМетро: ...\nКоординаты: 55.75, 37.61\nТеги: романтика, искусство\nЦена: 1500-3000 ₽\n\nСвободное описание."}
        rows={10}
        className="border rounded px-3 py-2 font-mono text-sm"
      />

      <button onClick={handleParse} disabled={!raw.trim()} className="px-4 py-2 rounded bg-foreground text-background text-sm self-start">
        Разобрать
      </button>

      {saved && <p className="text-sm text-green-700">Сохранено ✓</p>}

      {parsed && (
        <div>
          <p className="text-sm opacity-60 mb-2">Проверь и поправь перед сохранением:</p>
          <DateIdeaForm initial={parsed} onSubmit={handleSave} onCancel={() => setParsed(null)} />
        </div>
      )}
    </div>
  );
}
