export type ExtractedIdea = {
  title: string;
  address: string | null;
  metro: string | null;
  priceNote: string | null;
  tags: string[];
  description: string | null;
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

function extractJsonBlock(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
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
  };
}

/** Asks the configured Cloudflare Workers AI model to structure a place out of raw page text. */
export async function extractIdeaFromText(pageText: string): Promise<ExtractedIdea | null> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const model = process.env.CLOUDFLARE_AI_MODEL;
  if (!accountId || !token || !model) return null;

  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: pageText.slice(0, 6000) },
      ],
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
  const parsed = direct && typeof direct === "object" ? direct : extractJsonBlock(data?.result?.choices?.[0]?.message?.content ?? "");
  return toExtractedIdea(parsed);
}
