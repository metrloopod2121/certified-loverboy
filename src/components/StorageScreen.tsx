"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, Plus, X, Link as LinkIcon } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";
import { dateIdeaToInput, type DateIdea, type DateIdeaInput } from "@/lib/types";
import DateIdeaForm from "@/components/DateIdeaForm";
import MultiSelectFilter from "@/components/MultiSelectFilter";
import { card, select, pill, iconButton, pageHeading, mutedText, pastelTone } from "@/lib/ui";

type Sort = "newest" | "title";

export default function StorageScreen({ readOnly = false }: { readOnly?: boolean }) {
  const [ideas, setIdeas] = useState<DateIdea[] | null>(null);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [metroFilters, setMetroFilters] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>("newest");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DateIdea | null>(null);
  const [openFilter, setOpenFilter] = useState<"tags" | "metro" | null>(null);

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
    ideas?.forEach((idea) => idea.locations.forEach((loc) => loc.metro && set.add(loc.metro)));
    return [...set].sort();
  }, [ideas]);

  const filtered = useMemo(() => {
    if (!ideas) return [];
    let result = ideas;
    if (tagFilters.length > 0) {
      result = result.filter((i) => i.tags.some((t) => tagFilters.includes(t.tag.name)));
    }
    if (metroFilters.length > 0) {
      result = result.filter((i) => i.locations.some((loc) => loc.metro && metroFilters.includes(loc.metro)));
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
    <div className="flex flex-col gap-5 max-w-2xl mx-auto p-4 pt-2 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`${pageHeading} whitespace-nowrap`}>Идеи для свиданий</h1>
        </div>
        {!readOnly && (
          <button
            onClick={() => setShowForm((v) => !v)}
            aria-label={showForm ? "Закрыть форму" : "Добавить свиданку"}
            title={showForm ? "Закрыть форму" : "Добавить свиданку"}
            className="inline-flex size-12 items-center justify-center rounded-full bg-[var(--app-ink)] text-[var(--app-canvas)] shadow-[0_3px_0_rgba(28,26,23,0.18)] active:scale-90 transition"
          >
            {showForm ? <X size={18} /> : <Plus size={18} />}
          </button>
        )}
      </div>

      <div className="relative z-10 flex flex-wrap gap-2">
        <MultiSelectFilter
          label="Теги"
          options={allTags}
          selected={tagFilters}
          onChange={setTagFilters}
          open={openFilter === "tags"}
          onOpenChange={(v) => setOpenFilter(v ? "tags" : null)}
        />
        <MultiSelectFilter
          label="Метро"
          options={allMetro}
          selected={metroFilters}
          onChange={setMetroFilters}
          open={openFilter === "metro"}
          onOpenChange={(v) => setOpenFilter(v ? "metro" : null)}
        />
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={select}>
          <option value="newest">Сначала новые</option>
          <option value="title">По названию</option>
        </select>
      </div>

      {!readOnly && showForm && <DateIdeaForm onSubmit={createIdea} onCancel={() => setShowForm(false)} />}

      {!ideas && <p className={mutedText}>Загрузка…</p>}

      <div className="flex flex-col gap-3">
        {filtered.map((idea) =>
          !readOnly && editing?.id === idea.id ? (
            <DateIdeaForm
              key={idea.id}
              initial={dateIdeaToInput(idea)}
              onSubmit={(input) => updateIdea(idea.id, input)}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <div key={idea.id} className={`${card} ${pastelTone(idea.id)} flex flex-col gap-2.5 transition`}>
              <div className="flex justify-between items-start gap-2">
                <h2 className="text-[19px] font-semibold leading-[1.05]">{idea.title}</h2>
                {!readOnly && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => setEditing(idea)}
                      aria-label="Править"
                      className={`${iconButton} bg-[var(--app-overlay)] text-[var(--app-ink)] ring-1 ring-[var(--app-outline)]/10`}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => remove(idea.id)}
                      aria-label="Удалить"
                      className={`${iconButton} bg-[var(--app-overlay)] text-red-500 ring-1 ring-[var(--app-outline)]/10`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              {idea.locations.length > 0 && (
                <div className="flex flex-col gap-1">
                  {idea.locations.map((loc) => (
                    <div key={loc.id} className="flex items-center gap-1.5">
                      <p className={mutedText}>
                        {[loc.address, loc.metro && `м. ${loc.metro}`].filter(Boolean).join(" · ") || "Без адреса"}
                      </p>
                      {loc.url && (
                        <a href={loc.url} target="_blank" rel="noreferrer" className="text-[var(--app-ink)]">
                          <LinkIcon size={12} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {idea.priceNote && <p className="text-[14px] font-semibold">{idea.priceNote}</p>}
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
          <p className={`${card} ${mutedText}`}>Пока пусто — добавь первую свиданку.</p>
        )}
      </div>
    </div>
  );
}
