import type { DateIdea } from "@/lib/types";
import { normalizeMetroValue } from "@/lib/metro";

type ExportableIdea = Pick<DateIdea, "title" | "description" | "priceNote" | "tags" | "locations" | "links">;

/** Inverse of parseDateMarkdown — produces a file that round-trips through
 *  the "Import file" screen (see docs/import-prompt.md for the field vocabulary). */
export function serializeDateIdeaMarkdown(idea: ExportableIdea): string {
  const lines: string[] = [`# ${idea.title}`];

  if (idea.tags.length > 0) lines.push(`Теги: ${idea.tags.map((t) => t.tag.name).join(", ")}`);
  if (idea.priceNote) lines.push(`Цена: ${idea.priceNote}`);

  for (const loc of idea.locations) {
    const metro = normalizeMetroValue(loc.metro);
    const hasData = loc.address || metro || loc.url || loc.lat != null || loc.lng != null;
    if (!hasData) continue;
    lines.push("", "Место:");
    if (loc.address) lines.push(`Адрес: ${loc.address}`);
    if (metro) lines.push(`Метро: ${metro}`);
    if (loc.lat != null && loc.lng != null) lines.push(`Координаты: ${loc.lat}, ${loc.lng}`);
    if (loc.url) lines.push(`Ссылка: ${loc.url}`);
  }

  for (const link of idea.links) {
    lines.push("", `Ссылка: ${link.label ? `${link.label}: ` : ""}${link.url}`);
  }

  if (idea.description) lines.push("", idea.description);

  return lines.join("\n") + "\n";
}

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "",
  э: "e", ю: "yu", я: "ya",
};

// Zip filenames with non-ASCII bytes trip up older unzip tools even with the
// UTF-8 flag set correctly, so transliterate for the filename; file content stays Cyrillic.
function slugify(title: string): string {
  const transliterated = [...title.toLowerCase()]
    .map((ch) => CYRILLIC_TO_LATIN[ch] ?? ch)
    .join("");
  return transliterated
    .trim()
    .replace(/[^a-z0-9\s-]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Assigns each idea a unique, filesystem-safe .md filename for the export archive. */
export function exportFilenames(ideas: Pick<DateIdea, "title">[]): string[] {
  const used = new Map<string, number>();
  return ideas.map((idea) => {
    const base = slugify(idea.title) || "untitled";
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    return count === 0 ? `${base}.md` : `${base}-${count + 1}.md`;
  });
}
