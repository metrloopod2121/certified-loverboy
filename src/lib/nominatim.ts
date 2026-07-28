const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

/** Forward-geocodes a plain-text address via OpenStreetMap's Nominatim -- the fallback for a
 *  parsed post that mentions a real street address but carries no map link at all (a Telegram
 *  post/Instagram caption often just says "ул. Ленина, 5", nothing else). Free, no API key,
 *  unlike Yandex's Geocoder whose free/standard license explicitly forbids storing the results
 *  permanently (see docs/PROJECT_STATE.md) -- exactly what this app needs to do. Nominatim's
 *  ODbL license allows keeping derived data; its usage policy just asks for a real User-Agent
 *  and no more than ~1 request/sec, both easily satisfied by this app's per-import call volume.
 *  Biased to Moscow/Russia, matching the rest of the app's existing assumption (see
 *  braveSearch.ts's own "Москва" query bias). */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const trimmed = address.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set("q", `${trimmed}, Москва`);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "ru");

    const res = await fetch(url, {
      headers: {
        "User-Agent": "certified-loverboy/1.0 (+https://vacanator.xyz/)",
        "Accept-Language": "ru",
      },
    });
    if (!res.ok) return null;

    const results = (await res.json()) as Array<{ lat: string; lon: string }>;
    const first = results[0];
    if (!first) return null;

    const lat = Number(first.lat);
    const lng = Number(first.lon);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  } catch {
    return null;
  }
}
