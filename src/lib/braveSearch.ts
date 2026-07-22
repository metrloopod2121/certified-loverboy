/** Best-effort fallback enrichment when the page text alone is missing a fact (address/price). */
export async function braveSearchSnippets(query: string, count = 3): Promise<string[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return [];

  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(count));

  const res = await fetch(url, {
    headers: { Accept: "application/json", "X-Subscription-Token": apiKey },
  });
  if (!res.ok) return [];

  const data = await res.json();
  const results: Array<{ title?: string; description?: string }> = data?.web?.results ?? [];
  return results
    .map((r) => [r.title, r.description].filter(Boolean).join(": "))
    .filter(Boolean);
}
