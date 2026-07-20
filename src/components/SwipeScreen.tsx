"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import type { DateIdea } from "@/lib/types";
import { label, mutedText, pill } from "@/lib/ui";

const GENERIC_TAGS = new Set(["активити", "падел", "большой теннис"]);

const TAG_HIGHLIGHTS: Record<string, string> = {
  "бюджетно": "дружелюбный бюджет",
  "премиум": "эффектное место",
  "парковка": "парковка",
  "сауна": "сауна после игры",
  "прогулка": "прогулка рядом",
  "вднх": "сценарий на ВДНХ",
  "кафе": "кафе рядом",
  "парк": "парк вокруг",
  "крытый корт": "не зависит от погоды",
  "грунт": "грунтовое покрытие",
  "вечер": "хорошо на вечер",
  "современно": "современное пространство",
  "стильное место": "стильная локация",
  "торговый центр": "запасной план в ТЦ",
  "всесезонно": "всесезонно",
};

const FEATURE_HIGHLIGHTS: Array<[RegExp, string]> = [
  [/саун/i, "сауна после игры"],
  [/кафе|ресторан/i, "кафе рядом"],
  [/парков/i, "парковка"],
  [/прогулк|вднх|парк/i, "прогулка рядом"],
  [/душ/i, "душевые"],
  [/раздевал/i, "раздевалки"],
  [/прокат|ракетк/i, "прокат инвентаря"],
  [/крыт/i, "не зависит от погоды"],
  [/нович|перв/i, "подходит новичкам"],
];

const ADMIN_COPY = [
  /работает/i,
  /ежедневно/i,
  /стоимость/i,
  /тариф/i,
  /цен[ауеы]/i,
  /уточн/i,
  /брони/i,
  /перед поездкой/i,
];

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function compactPrice(priceNote: string | null) {
  if (!priceNote) return "";
  return truncate(normalizeText(priceNote).split(";")[0], 120);
}

function compactAddress(address: string | null) {
  if (!address) return "";
  return normalizeText(address)
    .replace(/^Москва,\s*/i, "")
    .replace(/,\s*\d+\s*этаж.*$/i, "");
}

function splitSentences(description: string | null) {
  if (!description) return [];
  return description
    .split(/(?<=[.!?])\s+|\n+/)
    .map(normalizeText)
    .filter(Boolean);
}

function getEssence(idea: DateIdea) {
  const sentences = splitSentences(idea.description);
  const preferred =
    sentences.find((sentence) => ADMIN_COPY.every((pattern) => !pattern.test(sentence))) ??
    sentences[0];

  if (preferred) return truncate(preferred, 150);

  const activity = idea.tags
    .map((tag) => tag.tag.name)
    .find((name) => name === "падел" || name === "большой теннис");
  return `Короткая активная идея${activity ? `: ${activity}` : ""}${idea.metro ? ` у м. ${idea.metro}` : ""}.`;
}

function getHighlights(idea: DateIdea) {
  const highlights: string[] = [];
  const add = (value: string) => {
    if (!highlights.includes(value)) highlights.push(value);
  };

  idea.tags.forEach(({ tag }) => {
    const normalized = tag.name.toLowerCase();
    if (TAG_HIGHLIGHTS[normalized]) add(TAG_HIGHLIGHTS[normalized]);
  });

  const description = idea.description ?? "";
  FEATURE_HIGHLIGHTS.forEach(([pattern, value]) => {
    if (pattern.test(description)) add(value);
  });

  idea.tags.forEach(({ tag }) => {
    const normalized = tag.name.toLowerCase();
    if (!GENERIC_TAGS.has(normalized) && !TAG_HIGHLIGHTS[normalized]) add(tag.name);
  });

  return highlights.slice(0, 5);
}

export default function SwipeScreen() {
  const [stack, setStack] = useState<DateIdea[] | null>(null);
  const [swiping, setSwiping] = useState(false);

  useEffect(() => {
    apiFetch("/api/deck").then(setStack);
  }, []);

  async function swipe(direction: "LIKE" | "PASS") {
    if (!stack || stack.length === 0 || swiping) return;
    const current = stack[0];
    setSwiping(true);
    try {
      await apiFetch("/api/swipe", {
        method: "POST",
        body: JSON.stringify({ dateIdeaId: current.id, direction }),
      });
      setStack(stack.slice(1));
    } finally {
      setSwiping(false);
    }
  }

  if (!stack) return <div className="p-8 text-center text-sm opacity-60">Загрузка…</div>;

  if (stack.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
        <span className="text-4xl">🤷</span>
        <p className={mutedText}>Пока больше нечего смотреть.</p>
      </div>
    );
  }

  const idea = stack[0];
  const price = compactPrice(idea.priceNote);
  const location = [idea.metro && `м. ${idea.metro}`, compactAddress(idea.address)]
    .filter(Boolean)
    .join(" · ");
  const essence = getEssence(idea);
  const highlights = getHighlights(idea);

  return (
    <div className="flex flex-col items-center gap-6 max-w-md mx-auto p-4 pt-6">
      <div className="w-full rounded-3xl border border-black/5 bg-[var(--tg-secondary-bg)] p-6 shadow-md dark:border-white/10 min-h-[300px] flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-[22px] font-semibold leading-tight">{idea.title}</h2>
          {location && <p className={mutedText}>{location}</p>}
        </div>

        {price && (
          <div className="flex flex-col gap-1 border-l-2 border-[var(--tg-button)] pl-3">
            <span className={label}>Цена</span>
            <p className="text-[14px] font-medium text-[var(--tg-button)]">{price}</p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <span className={label}>Суть</span>
          <p className="text-[15px] leading-snug">{essence}</p>
        </div>

        {highlights.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className={label}>Прелести</span>
            <div className="flex flex-wrap gap-1.5">
              {highlights.map((highlight) => (
                <span key={highlight} className={pill}>{highlight}</span>
              ))}
            </div>
          </div>
        )}

        {idea.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {idea.tags
              .filter((t) => !GENERIC_TAGS.has(t.tag.name.toLowerCase()))
              .slice(0, 4)
              .map((t) => (
                <span key={t.tag.id} className="text-[12px] text-[var(--tg-hint)]">#{t.tag.name}</span>
              ))}
          </div>
        )}
      </div>

      <div className="flex gap-8">
        <button
          onClick={() => swipe("PASS")}
          disabled={swiping}
          aria-label="Не то"
          className="w-16 h-16 rounded-full bg-black/5 dark:bg-white/10 text-3xl flex items-center justify-center active:scale-90 transition disabled:opacity-50"
        >
          ✕
        </button>
        <button
          onClick={() => swipe("LIKE")}
          disabled={swiping}
          aria-label="Нравится"
          className="w-16 h-16 rounded-full bg-[var(--tg-button)] text-[var(--tg-button-text)] text-3xl flex items-center justify-center active:scale-90 transition disabled:opacity-50 shadow-lg shadow-[var(--tg-button)]/30"
        >
          ❤
        </button>
      </div>

      <p className={mutedText}>Осталось: {stack.length}</p>
    </div>
  );
}
