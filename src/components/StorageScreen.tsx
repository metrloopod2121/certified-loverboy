"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, Plus, X } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";
import { dateIdeaToInput, type DateIdea, type DateIdeaInput } from "@/lib/types";
import DateIdeaForm from "@/components/DateIdeaForm";
import MultiSelectFilter from "@/components/MultiSelectFilter";
import { card, select, buttonPrimary, pill, iconButton, pageHeading, mutedText } from "@/lib/ui";

type Sort = "newest" | "title";

export default function StorageScreen() {
  const [ideas, setIdeas] = useState<DateIdea[] | null>(null);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [metroFilters, setMetroFilters] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>("newest");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DateIdea | null>(null);

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

  const allTags = useMemo(() => {
    const set = new Set<string>();
    ideas?.forEach((idea) => idea.tags.forEach((t) => set.add(t.tag.name)));
    return [...set].sort();
  }, [ideas]);

  const allMetro = useMemo(() => {
    const set = new Set<string>();
    ideas?.forEach((idea) => idea.metro && set.add(idea.metro));
    return [...set].sort();
  }, [ideas]);

  const filtered = useMemo(() => {
    if (!ideas) return [];
    let result = ideas;
    if (tagFilters.length > 0) {
      result = result.filter((i) => i.tags.some((t) => tagFilters.includes(t.tag.name)));
    }
    if (metroFilters.length > 0) {
      result = result.filter((i) => i.metro && metroFilters.includes(i.metro));
    }
    result = [...result].sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : b.createdAt.localeCompare(a.createdAt)
    );
    return result;
  }, [ideas, tagFilters, metroFilters, sort]);

  async function createIdea(input: DateIdeaInput) {
    await apiFetch("/api/date-ideas", { method: "POST", body: JSON.stringify(input) });
    setShowForm(false);
    await reload();
  }

  async function updateIdea(id: string, input: DateIdeaInput) {
    await apiFetch(`/api/date-ideas/${id}`, { method: "PATCH", body: JSON.stringify(input) });
    setEditing(null);
    await reload();
  }

  async function remove(id: string) {
    await apiFetch(`/api/date-ideas/${id}`, { method: "DELETE" });
    await reload();
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto p-4 pb-6">
      <div className="flex items-center justify-between">
        <h1 className={pageHeading}>Хранилище свиданок</h1>
        <button onClick={() => setShowForm((v) => !v)} className={buttonPrimary}>
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? "Закрыть" : "Добавить"}
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <MultiSelectFilter label="Теги" options={allTags} selected={tagFilters} onChange={setTagFilters} />
        <MultiSelectFilter label="Метро" options={allMetro} selected={metroFilters} onChange={setMetroFilters} />
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={select}>
          <option value="newest">Сначала новые</option>
          <option value="title">По названию</option>
        </select>
      </div>

      {showForm && <DateIdeaForm onSubmit={createIdea} onCancel={() => setShowForm(false)} />}

      {!ideas && <p className={mutedText}>Загрузка…</p>}

      <div className="flex flex-col gap-3">
        {filtered.map((idea) =>
          editing?.id === idea.id ? (
            <DateIdeaForm
              key={idea.id}
              initial={dateIdeaToInput(idea)}
              onSubmit={(input) => updateIdea(idea.id, input)}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <div key={idea.id} className={`${card} flex flex-col gap-2 transition`}>
              <div className="flex justify-between items-start gap-2">
                <h2 className="text-[16px] font-semibold">{idea.title}</h2>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => setEditing(idea)}
                    aria-label="Править"
                    className={`${iconButton} bg-black/5 dark:bg-white/10 text-[var(--tg-text)]`}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => remove(idea.id)}
                    aria-label="Удалить"
                    className={`${iconButton} bg-red-500/10 text-red-500`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {(idea.address || idea.metro) && (
                <p className={mutedText}>
                  {[idea.address, idea.metro && `м. ${idea.metro}`].filter(Boolean).join(" · ")}
                </p>
              )}
              {idea.priceNote && <p className="text-[14px]">{idea.priceNote}</p>}
              {idea.swipeDescription && (
                <p className="text-[14px] leading-snug">{idea.swipeDescription}</p>
              )}
              {idea.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {idea.tags.map((t) => (
                    <span key={t.tag.id} className={pill}>{t.tag.name}</span>
                  ))}
                </div>
              )}
            </div>
          )
        )}
        {ideas && filtered.length === 0 && (
          <p className={mutedText}>Пока пусто — добавь первую свиданку.</p>
        )}
      </div>
    </div>
  );
}
