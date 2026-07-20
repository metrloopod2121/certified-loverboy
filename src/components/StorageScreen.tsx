"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { dateIdeaToInput, type DateIdea, type DateIdeaInput } from "@/lib/types";
import DateIdeaForm from "@/components/DateIdeaForm";
import { card, select, buttonPrimary, buttonGhost, buttonDanger, pill, pageHeading, mutedText } from "@/lib/ui";

type Sort = "newest" | "title";

export default function StorageScreen() {
  const [ideas, setIdeas] = useState<DateIdea[] | null>(null);
  const [tagFilter, setTagFilter] = useState("");
  const [metroFilter, setMetroFilter] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DateIdea | null>(null);

  async function reload() {
    const data = await apiFetch("/api/date-ideas");
    setIdeas(data);
  }

  useEffect(() => {
    reload();
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
    if (tagFilter) result = result.filter((i) => i.tags.some((t) => t.tag.name === tagFilter));
    if (metroFilter) result = result.filter((i) => i.metro === metroFilter);
    result = [...result].sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : b.createdAt.localeCompare(a.createdAt)
    );
    return result;
  }, [ideas, tagFilter, metroFilter, sort]);

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

  async function toggle(idea: DateIdea, field: "inPartnerDeck" | "showPriceToPartner") {
    await apiFetch(`/api/date-ideas/${idea.id}`, {
      method: "PATCH",
      body: JSON.stringify({ [field]: !idea[field] }),
    });
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
          {showForm ? "Закрыть" : "+ Добавить"}
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className={select}>
          <option value="">Все теги</option>
          {allTags.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select value={metroFilter} onChange={(e) => setMetroFilter(e.target.value)} className={select}>
          <option value="">Всё метро</option>
          {allMetro.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
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
            <div key={idea.id} className={`${card} flex flex-col gap-2`}>
              <div className="flex justify-between items-start gap-2">
                <h2 className="text-[16px] font-semibold">{idea.title}</h2>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setEditing(idea)} className={buttonGhost}>Правка</button>
                  <button onClick={() => remove(idea.id)} className={buttonDanger}>Удалить</button>
                </div>
              </div>
              {(idea.address || idea.metro) && (
                <p className={mutedText}>
                  {[idea.address, idea.metro && `м. ${idea.metro}`].filter(Boolean).join(" · ")}
                </p>
              )}
              {idea.priceNote && <p className="text-[14px]">{idea.priceNote}</p>}
              {idea.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {idea.tags.map((t) => (
                    <span key={t.tag.id} className={pill}>{t.tag.name}</span>
                  ))}
                </div>
              )}
              <div className="flex gap-4 pt-1 text-[13px] border-t border-black/5 dark:border-white/10 mt-1">
                <label className="flex items-center gap-1.5 py-1.5">
                  <input
                    type="checkbox"
                    checked={idea.inPartnerDeck}
                    onChange={() => toggle(idea, "inPartnerDeck")}
                    className="h-4 w-4 accent-[var(--tg-button)]"
                  />
                  В деке
                </label>
                <label className="flex items-center gap-1.5 py-1.5">
                  <input
                    type="checkbox"
                    checked={idea.showPriceToPartner}
                    onChange={() => toggle(idea, "showPriceToPartner")}
                    className="h-4 w-4 accent-[var(--tg-button)]"
                  />
                  Цена видна
                </label>
              </div>
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
