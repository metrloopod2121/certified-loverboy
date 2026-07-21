import { parseCoordinates, parseMapsLink } from "@/lib/coords";
import type { DateIdeaInput } from "@/lib/types";

export type ParsedDateIdea = Pick<
  DateIdeaInput,
  | "title"
  | "address"
  | "metro"
  | "lat"
  | "lng"
  | "tags"
  | "priceNote"
  | "description"
  | "swipeDescription"
>;

const FIELD_KEYS: Record<string, "address" | "metro" | "priceNote" | "swipeDescription"> = {
  "адрес": "address",
  "метро": "metro",
  "цена": "priceNote",
  "описание для свайпа": "swipeDescription",
  "свайп": "swipeDescription",
  "свайп описание": "swipeDescription",
  "свайп-описание": "swipeDescription",
};

export function parseDateMarkdown(raw: string): ParsedDateIdea {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const result: ParsedDateIdea = {
    title: "",
    address: "",
    metro: "",
    lat: null,
    lng: null,
    tags: [],
    priceNote: "",
    description: "",
    swipeDescription: "",
  };

  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;
  if (i < lines.length && lines[i].trim().startsWith("#")) {
    result.title = lines[i].trim().replace(/^#+\s*/, "");
    i++;
  }

  const descLines: string[] = [];
  let inDescription = false;

  for (; i < lines.length; i++) {
    const line = lines[i];
    if (inDescription) {
      descLines.push(line);
      continue;
    }
    const trimmed = line.trim();
    if (trimmed === "") continue;

    const match = trimmed.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      const key = match[1].trim().toLowerCase();
      const value = match[2].trim();

      if (key === "координаты") {
        const coords = parseCoordinates(value) ?? parseMapsLink(value);
        if (coords) {
          result.lat = coords.lat;
          result.lng = coords.lng;
        }
        continue;
      }
      if (key === "теги") {
        result.tags = value.split(",").map((t) => t.trim()).filter(Boolean);
        continue;
      }
      if (key in FIELD_KEYS) {
        result[FIELD_KEYS[key]] = value;
        continue;
      }
    }

    inDescription = true;
    descLines.push(line);
  }

  result.description = descLines.join("\n").trim();
  return result;
}
