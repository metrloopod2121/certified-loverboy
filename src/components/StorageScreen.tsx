"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { dateIdeaToInput, type DateIdea, type DateIdeaInput } from "@/lib/types";
import DateIdeaForm from "@/components/DateIdeaForm";

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
    <div className="p-4 flex flex-col gap-4 max-w-2xl mx-auto">
      <h1 className="text-lg font-semibold">Хранилище свиданок</h1>

      <div className="flex gap-2 flex-wrap text-sm">
        <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Все теги</option>
          {allTags.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select value={metroFilter} onChange={(e) => setMetroFilter(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Всё метро</option>
          {allMetro.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="border rounded px-2 py-1">
          <option value="newest">Сначала новые</option>
          <option value="title">По названию</option>
        </select>
        <button onClick={() => setShowForm((v) => !v)} className="ml-auto px-3 py-1 rounded bg-foreground text-background">
          {showForm ? "Закрыть" : "+ Добавить"}
        </button>
      </div>

      {showForm && <DateIdeaForm onSubmit={createIdea} onCancel={() => setShowForm(false)} />}

      {!ideas && <p className="opacity-60 text-sm">Загрузка…</p>}

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
            <div key={idea.id} className="border rounded-lg p-3 flex flex-col gap-1">
              <div className="flex justify-between items-start">
                <h2 className="font-medium">{idea.title}</h2>
                <div className="flex gap-2 text-xs">
                  <button onClick={() => setEditing(idea)} className="underline">Правка</button>
                  <button onClick={() => remove(idea.id)} className="underline text-red-600">Удалить</button>
                </div>
              </div>
              <p className="text-sm opacity-70">
                {[idea.address, idea.metro].filter(Boolean).join(" · ") || "Без адреса"}
              </p>
              {idea.priceNote && <p className="text-sm">{idea.priceNote}</p>}
              {idea.tags.length > 0 && (
                <p className="text-xs opacity-60">{idea.tags.map((t) => t.tag.name).join(", ")}</p>
              )}
              <div className="flex gap-4 text-xs mt-1">
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={idea.inPartnerDeck}
                    onChange={() => toggle(idea, "inPartnerDeck")}
                  />
                  В деке
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={idea.showPriceToPartner}
                    onChange={() => toggle(idea, "showPriceToPartner")}
                  />
                  Цена видна
                </label>
              </div>
            </div>
          )
        )}
        {ideas && filtered.length === 0 && (
          <p className="opacity-60 text-sm">Пока пусто — добавь первую свиданку.</p>
        )}
      </div>
    </div>
  );
}
