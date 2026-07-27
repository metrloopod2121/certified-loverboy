export type ExtractedIdea = {
  title: string;
  address: string | null;
  metro: string | null;
  priceNote: string | null;
  tags: string[];
  description: string | null;
  /** Ссылка на карту (Яндекс/2ГИС/Google/goo.gl), относящаяся именно к этому месту, если есть. */
  mapUrl: string | null;
  /** Любые другие ссылки на это место (Instagram, сайт, бронирование, пост), не являющиеся
   *  ссылкой на карту -- сохраняются отдельно, а не отбрасываются и не путаются с mapUrl. */
  otherLinks: string[];
};

const SYSTEM_PROMPT = `Ты помощник, который вытаскивает структурированные данные о месте (кафе, музей, парк и т.п.) из текста страницы Яндекс.Карт (и, возможно, пары строк из поиска).
Отвечай ТОЛЬКО валидным JSON без пояснений и без markdown-разметки, в формате:
{"title": string, "address": string|null, "metro": string|null, "priceNote": string|null, "tags": string[], "description": string|null}
- title: название заведения/места
- address: полный адрес, если есть в тексте
- metro: ближайшая станция метро, если упомянута (без слова "метро"/"м.")
- priceNote: диапазон цен, если есть (например "500–1000 ₽")
- tags: 2-3 коротких тега-категории на русском (одно слово каждый), например "кофе", "романтика", "искусство", "природа", "спорт", "еда" — НЕ описательные прилагательные вроде "уютный"/"дружелюбный"
- description: 1-2 предложения о месте своими словами, по-русски
Если поле не найдено в тексте — используй null (для address/metro/priceNote/description) или [] (для tags). Не выдумывай данные, которых нет в тексте.`;

const MULTI_SYSTEM_PROMPT = `Ты помощник, который вытаскивает ОДНО ИЛИ НЕСКОЛЬКО мест (кафе, музей, парк, ресторан и т.п.) из текста поста Telegram-канала. В одном посте часто перечислено несколько мест — у каждого своё название, описание, адрес, цена и, возможно, ссылка на карту.
Отвечай ТОЛЬКО валидным JSON без пояснений и без markdown-разметки, в формате:
{"places": [{"title": string, "address": string|null, "metro": string|null, "priceNote": string|null, "tags": string[], "description": string|null, "mapUrl": string|null, "otherLinks": string[]}]}
- Каждый элемент массива places — отдельное место. Если в тексте одно место — верни массив из одного элемента.
- Не объединяй разные места в одно и не дроби одно место на несколько.
- mapUrl: ссылка именно на карту (Яндекс.Карты / 2ГИС / Google Maps / goo.gl), которая явно ведёт на страницу этого места на карте. НИКОГДА не подставляй сюда ссылку на Instagram, сайт заведения, бронирование, телеграм-канал/пост или любую другую не-картографическую ссылку, даже если это единственная ссылка в посте — в таком случае верни null. Не угадывай.
- otherLinks: любые другие ссылки, относящиеся именно к этому месту, но НЕ являющиеся ссылкой на карту (Instagram, сайт, бронирование, телеграм-канал/пост и т.п.) — каждая отдельной строкой. Если таких ссылок нет — [].
- title: название заведения/места
- address: полный адрес, если есть в тексте
- metro: ближайшая станция метро, если упомянута (без слова "метро"/"м.")
- priceNote: диапазон цен, если есть (например "500–1000 ₽")
- tags: 2-3 коротких тега-категории на русском (одно слово каждый), например "кофе", "искусство", "природа", "еда" — НЕ описательные прилагательные вроде "уютный"
- description: 1-2 предложения о месте своими словами, по-русски
Если поле не найдено в тексте — используй null (или [] для tags/otherLinks). Не выдумывай данные, которых нет в тексте.`;

function extractJsonBlock(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Модель могла обернуть JSON в пояснения/```-блок — выхватываем объект или массив.
  }
  const object = trimmed.match(/\{[\s\S]*\}/);
  if (object) {
    try {
      return JSON.parse(object[0]);
    } catch {
      // fallthrough
    }
  }
  const array = trimmed.match(/\[[\s\S]*\]/);
  if (array) {
    try {
      return JSON.parse(array[0]);
    } catch {
      // fallthrough
    }
  }
  return null;
}

function toExtractedIdea(value: unknown): ExtractedIdea | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  if (typeof obj.title !== "string" || !obj.title.trim()) return null;

  return {
    title: obj.title.trim(),
    address: typeof obj.address === "string" && obj.address.trim() ? obj.address.trim() : null,
    metro: typeof obj.metro === "string" && obj.metro.trim() ? obj.metro.trim() : null,
    priceNote: typeof obj.priceNote === "string" && obj.priceNote.trim() ? obj.priceNote.trim() : null,
    tags: Array.isArray(obj.tags) ? obj.tags.filter((t): t is string => typeof t === "string") : [],
    description: typeof obj.description === "string" && obj.description.trim() ? obj.description.trim() : null,
    mapUrl: typeof obj.mapUrl === "string" && obj.mapUrl.trim() ? obj.mapUrl.trim() : null,
    otherLinks: Array.isArray(obj.otherLinks)
      ? obj.otherLinks.filter((l): l is string => typeof l === "string" && l.trim().length > 0).map((l) => l.trim())
      : [],
  };
}

/** Верхняя граница длины ответа модели. Дефолт Workers AI (~256) обрезает JSON уже на 2-3 местах,
 *  поэтому просим заметно больше — на пост с десятком мест. Переопределяется env-переменной. */
const MAX_OUTPUT_TOKENS = Number(process.env.CLOUDFLARE_AI_MAX_TOKENS) || 4096;

/** Sends one system+user turn to the configured Cloudflare Workers AI model and returns the raw
 *  text of its reply (already JSON-stringified if the model handed back an object), or null. */
async function runAiRaw(systemPrompt: string, pageText: string): Promise<string | null> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const model = process.env.CLOUDFLARE_AI_MODEL;
  if (!accountId || !token || !model) return null;

  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: pageText.slice(0, 8000) },
      ],
      max_tokens: MAX_OUTPUT_TOKENS,
    }),
  });

  if (!res.ok) {
    console.log(`[usage] cloudflare-ai request failed status=${res.status}`);
    return null;
  }
  const data = await res.json();

  const neurons = data?.result?.usage?.neurons;
  const tokens = data?.result?.usage?.total_tokens;
  console.log(`[usage] cloudflare-ai neurons=${neurons ?? "?"} tokens=${tokens ?? "?"} model=${model}`);

  const direct = data?.result?.response;
  if (direct && typeof direct === "object") return JSON.stringify(direct);
  if (typeof direct === "string" && direct.trim()) return direct;
  const content = data?.result?.choices?.[0]?.message?.content;
  return typeof content === "string" && content.trim() ? content : null;
}

/** Pulls every brace-balanced `{...}` object out of a (possibly truncated) JSON string by tracking
 *  brace depth outside of strings. Lets us salvage the places from a reply the model cut off in the
 *  middle of the array — every complete object is recovered, the trailing incomplete one dropped. */
function salvageJsonObjects(text: string): unknown[] {
  const objects: unknown[] = [];
  const startStack: number[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") startStack.push(i);
    else if (ch === "}") {
      const start = startStack.pop();
      if (start !== undefined) {
        try {
          objects.push(JSON.parse(text.slice(start, i + 1)));
        } catch {
          // не полноценный объект — пропускаем
        }
      }
    }
  }
  return objects;
}

/** Normalises whatever JSON shape the model returned into a flat list of place-candidate objects. */
function toPlaceCandidates(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const places = (value as Record<string, unknown>).places;
    if (Array.isArray(places)) return places;
    return [value];
  }
  return [];
}

/** Asks the configured Cloudflare Workers AI model to structure a single place out of raw page text. */
export async function extractIdeaFromText(pageText: string): Promise<ExtractedIdea | null> {
  const raw = await runAiRaw(SYSTEM_PROMPT, pageText);
  return raw ? toExtractedIdea(extractJsonBlock(raw)) : null;
}

/** Structures one OR several places out of a post's text. Accepts a bare array, a `{ places: [...] }`
 *  wrapper, or a single object; if the model truncated its JSON, salvages whatever whole place
 *  objects it managed to emit. Drops any element without a title. */
export async function extractIdeasFromText(pageText: string): Promise<ExtractedIdea[]> {
  const raw = await runAiRaw(MULTI_SYSTEM_PROMPT, pageText);
  if (!raw) return [];

  // Обычный путь — целиком валидный JSON.
  let candidates = toPlaceCandidates(extractJsonBlock(raw));

  // Фолбэк — модель обрезала ответ: собираем уцелевшие объекты из сырого текста.
  if (candidates.length === 0) {
    candidates = salvageJsonObjects(raw);
    console.log(`[usage] cloudflare-ai multi-parse salvaged=${candidates.length}`);
  }

  const ideas: ExtractedIdea[] = [];
  for (const item of candidates) {
    const idea = toExtractedIdea(item);
    if (idea) ideas.push(idea);
  }
  return ideas;
}

/** Sends raw audio bytes to the configured Workers AI Whisper model and returns the transcribed
 *  text, or null if not configured / the call failed. Payload shape (`{ audio: [...bytes] }`)
 *  matches Cloudflare's documented Workers-binding contract for this model family, translated
 *  to the plain REST API used everywhere else in this file. */
export async function transcribeAudio(audio: Buffer): Promise<string | null> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const model = process.env.CLOUDFLARE_WHISPER_MODEL || "@cf/openai/whisper-large-v3-turbo";
  if (!accountId || !token) return null;

  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ audio: Array.from(audio) }),
  });

  if (!res.ok) {
    console.log(`[usage] cloudflare-whisper request failed status=${res.status}`);
    return null;
  }
  const data = await res.json();

  const neurons = data?.result?.usage?.neurons;
  console.log(`[usage] cloudflare-whisper neurons=${neurons ?? "?"} model=${model}`);

  const text = data?.result?.text;
  return typeof text === "string" && text.trim() ? text.trim() : null;
}
