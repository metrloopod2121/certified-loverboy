"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { parseDateMarkdown, type ParsedDateIdea } from "@/lib/parseDateMarkdown";
import type { DateIdeaInput } from "@/lib/types";
import DateIdeaForm from "@/components/DateIdeaForm";
import { input, buttonPrimary, pageHeading, mutedText } from "@/lib/ui";

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
    <div className="flex flex-col gap-4 max-w-2xl mx-auto p-4 pb-6">
      <h1 className={pageHeading}>Импорт из markdown</h1>

      <label className="flex flex-col gap-1.5">
        <span className={mutedText}>Файл (.md / .txt)</span>
        <input type="file" accept=".md,.txt" onChange={handleFile} className="text-[14px]" />
      </label>

      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder={"# Название\nАдрес: ...\nМетро: ...\nКоординаты: 55.75, 37.61\nТеги: романтика, искусство\nЦена: 1500-3000 ₽\n\nСвободное описание."}
        rows={10}
        className={`${input} font-mono text-[13px]`}
      />

      <button onClick={handleParse} disabled={!raw.trim()} className={`${buttonPrimary} self-start`}>
        Разобрать
      </button>

      {saved && <p className="text-[14px] text-emerald-500">Сохранено ✓</p>}

      {parsed && (
        <div>
          <p className={`${mutedText} mb-2`}>Проверь и поправь перед сохранением:</p>
          <DateIdeaForm initial={parsed} onSubmit={handleSave} onCancel={() => setParsed(null)} />
        </div>
      )}
    </div>
  );
}
