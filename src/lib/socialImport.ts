import { extractIdeaFromText, extractIdeasFromText, type ExtractedIdea } from "@/lib/cloudflareAi";
import { braveSearchSnippets } from "@/lib/braveSearch";
import { parseMapsLink } from "@/lib/coords";

export type ParsedFromLink = ExtractedIdea & { lat: number | null; lng: number | null };

const YANDEX_MAPS_URL = /https?:\/\/(www\.)?(yandex\.[a-z.]+|ya\.ru)\/maps\/[^\s]+/iu;
const TELEGRAM_POST_URL = /https?:\/\/(t\.me|telegram\.me)\/[^\s]+/iu;

// A shared link often has trailing prose punctuation (comma, closing bracket, ellipsis)
// glued right after the URL — strip it, it's not part of the link we persist.
function stripTrailingPunctuation(url: string): string {
  return url.replace(/[.,;:!?…)}\]>"']+$/u, "");
}

export function findYandexMapsLink(text: string): string | null {
  const match = text.match(YANDEX_MAPS_URL);
  return match ? stripTrailingPunctuation(match[0]) : null;
}

export function findTelegramPostLink(text: string): string | null {
  const match = text.match(TELEGRAM_POST_URL);
  return match ? stripTrailingPunctuation(match[0]) : null;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    // &amp; последним, иначе повторно раскроем уже декодированные амперсанды.
    .replace(/&amp;/g, "&")
    .replace(/<br\s*\/?>/gi, "\n");
}

function metaContent(html: string, attr: "property" | "name", key: string): string | null {
  const re = new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']*)["']`, "i");
  const match = html.match(re);
  return match ? decodeHtmlEntities(match[1]) : null;
}

type Coordinates = { lat: number; lng: number };

function isValidCoordinate(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

/** The Yandex organization page embeds its exact pin as longitude,latitude.
 * Prefer this structured value over arbitrary number pairs elsewhere in the HTML. */
function yandexPageCoordinates(html: string): Coordinates | null {
  const dataCoordinates = html.match(
    /\bdata-coordinates=["'](-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)["']/i
  );
  const mapCenter = html.match(
    /"mapLocation"\s*:\s*\{\s*"center"\s*:\s*\[\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/i
  );
  const match = dataCoordinates ?? mapCenter;
  if (!match) return null;

  const lng = Number(match[1]);
  const lat = Number(match[2]);
  return isValidCoordinate(lat, lng) ? { lat, lng } : null;
}

type YandexPage = {
  text: string;
  coordinates: Coordinates | null;
};

/** Yandex Maps org pages are a JS SPA — the useful signal is in <meta> tags
 *  (og:title / description), not the mostly-JS page body. */
async function fetchYandexPage(url: string): Promise<YandexPage | null> {
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

    return {
      text: [ogTitle, description].filter(Boolean).join("\n"),
      coordinates: yandexPageCoordinates(html),
    };
  } catch {
    return null;
  }
}

/** Fetches a Yandex Maps venue page, structures it via the LLM, and falls back to a Brave
 *  search pass if the address or price is still missing. Coordinates prefer the page's own
 *  embedded pin, falling back to whatever's encoded in the URL. */
export async function parseYandexMapsLink(url: string): Promise<ParsedFromLink | null> {
  const page = await fetchYandexPage(url);
  if (!page) return null;

  let idea = await extractIdeaFromText(page.text);
  if (!idea) return null;

  if (!idea.address || !idea.priceNote) {
    const snippets = await braveSearchSnippets(`"${idea.title}" Москва адрес цена`);
    if (snippets.length > 0) {
      const augmented = `${page.text}\n\n--- Дополнительно из поиска ---\n${snippets.join("\n")}`;
      const refined = await extractIdeaFromText(augmented);
      if (refined) idea = refined;
    }
  }

  const coords = page.coordinates ?? parseMapsLink(url);
  return { ...idea, lat: coords?.lat ?? null, lng: coords?.lng ?? null };
}

/** Structures a Telegram post's own text (channel forward caption, pasted post text, or a
 *  fetched post embed page) directly via the LLM — no page fetch or search-fallback enrichment
 *  needed, the post already has address/price/description. Returns EVERY place mentioned — a
 *  single post can list several venues, each with its own link. Coordinates for each place come
 *  from its own `mapUrl` when the model found one, otherwise from the first maps link anywhere
 *  in the text. */
export async function parsePostTextMulti(text: string): Promise<ParsedFromLink[]> {
  const ideas = await extractIdeasFromText(text);
  const textCoords = parseMapsLink(text);
  return ideas.map((idea) => {
    const coords = (idea.mapUrl ? parseMapsLink(idea.mapUrl) : null) ?? textCoords;
    return { ...idea, lat: coords?.lat ?? null, lng: coords?.lng ?? null };
  });
}

/** Превращает HTML тела поста в текст, СОХРАНЯЯ ссылки, спрятанные за словами. Telegram прячет
 *  ссылки на карту/бронь за текстом вроде «на карте» — сам URL живёт только в <a href>, и в
 *  og:description его нет. Каждая ссылка становится "текст (url)", чтобы ЛЛМ мог привязать
 *  ссылку карты к нужному месту. */
function htmlBodyToTextWithLinks(html: string): string {
  const withLinks = html
    // <a href="url">подпись</a> → подпись (url)
    .replace(/<a\b[^>]*?href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) => {
      const text = String(label).replace(/<[^>]+>/g, "").trim();
      return text ? `${text} (${href})` : String(href);
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  return decodeHtmlEntities(withLinks).replace(/\n{3,}/g, "\n\n").trim();
}

/** Читает пост t.me через embed-страницу — для случая когда владелец кинул боту ссылку на пост
 *  вместо форварда (или форвард недоступен из-за защищённого контента канала). Основной путь —
 *  тело поста (`tgme_widget_message_text`) вместе со спрятанными ссылками; если его не нашли —
 *  фолбэк на og-мету (текст без ссылок). */
export async function fetchTelegramPostText(url: string): Promise<string | null> {
  const embedUrl = url.includes("?") ? `${url}&embed=1` : `${url}?embed=1`;
  try {
    const res = await fetch(embedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "ru-RU,ru;q=0.9",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Основной путь: тело поста со всеми ссылками. Внутри message_text бывают <a>/<b>/<i>/<span>,
    // но не вложенные <div>, поэтому нежадный `</div>` закрывает именно этот блок.
    const bodyMatch = html.match(
      /<div[^>]*class=["'][^"']*tgme_widget_message_text[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
    );
    if (bodyMatch) {
      const body = htmlBodyToTextWithLinks(bodyMatch[1]);
      if (body.length > 0) return body;
    }

    // Фолбэк: og-мета (без спрятанных ссылок, зато всегда есть).
    const description = metaContent(html, "property", "og:description");
    const title = metaContent(html, "property", "og:title");
    const text = [title, description].filter(Boolean).join("\n").trim();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
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
