import { extractIdeaFromText, type ExtractedIdea } from "@/lib/cloudflareAi";
import { braveSearchSnippets } from "@/lib/braveSearch";
import { parseMapsLink } from "@/lib/coords";

export type ParsedFromLink = ExtractedIdea & { lat: number | null; lng: number | null };

const YANDEX_MAPS_URL = /https?:\/\/(www\.)?(yandex\.[a-z.]+|ya\.ru)\/maps\/[^\s]+/iu;

export function findYandexMapsLink(text: string): string | null {
  const match = text.match(YANDEX_MAPS_URL);
  return match ? match[0] : null;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»");
}

function metaContent(html: string, attr: "property" | "name", key: string): string | null {
  const re = new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']*)["']`, "i");
  const match = html.match(re);
  return match ? decodeHtmlEntities(match[1]) : null;
}

/** Yandex Maps org pages are a JS SPA — the useful signal is in <meta> tags
 *  (og:title / description), not the mostly-JS page body. */
async function fetchYandexMeta(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "ru-RU,ru;q=0.9",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();

    const ogTitle = metaContent(html, "property", "og:title");
    const description = metaContent(html, "name", "description") ?? metaContent(html, "property", "og:description");
    if (!ogTitle && !description) return null;

    return [ogTitle, description].filter(Boolean).join("\n");
  } catch {
    return null;
  }
}

/** Fetches a Yandex Maps venue page, structures it via the LLM, and falls back to a Brave
 *  search pass if the address or price is still missing. Coordinates come from the URL itself. */
export async function parseYandexMapsLink(url: string): Promise<ParsedFromLink | null> {
  const pageText = await fetchYandexMeta(url);
  if (!pageText) return null;

  let idea = await extractIdeaFromText(pageText);
  if (!idea) return null;

  if (!idea.address || !idea.priceNote) {
    const snippets = await braveSearchSnippets(`"${idea.title}" Москва адрес цена`);
    if (snippets.length > 0) {
      const augmented = `${pageText}\n\n--- Дополнительно из поиска ---\n${snippets.join("\n")}`;
      const refined = await extractIdeaFromText(augmented);
      if (refined) idea = refined;
    }
  }

  const coords = parseMapsLink(url);
  return { ...idea, lat: coords?.lat ?? null, lng: coords?.lng ?? null };
}

/** Structures a Telegram post's own text (channel forward caption, or pasted post text) directly
 *  via the LLM — such posts already contain address/price/description, so no page fetch or
 *  search-fallback enrichment is needed. Coordinates are pulled from any maps link in the text. */
export async function parsePostText(text: string): Promise<ParsedFromLink | null> {
  const idea = await extractIdeaFromText(text);
  if (!idea) return null;

  const coords = parseMapsLink(text);
  return { ...idea, lat: coords?.lat ?? null, lng: coords?.lng ?? null };
}

export function formatIdeaPreview(idea: ParsedFromLink, header = "📍 Новое место с Яндекс.Карт:"): string {
  const lines = [header, "", idea.title];
  if (idea.address) lines.push(`Адрес: ${idea.address}`);
  if (idea.metro) lines.push(`Метро: ${idea.metro}`);
  if (idea.priceNote) lines.push(`Цена: ${idea.priceNote}`);
  if (idea.tags.length > 0) lines.push(`Теги: ${idea.tags.join(", ")}`);
  if (idea.description) lines.push("", idea.description);
  lines.push("", "Добавить в базу?");
  return lines.join("\n");
}
