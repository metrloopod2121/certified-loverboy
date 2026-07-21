export function parseCoordinates(raw: string): { lat: number; lng: number } | null {
  const match = raw.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  return { lat: Number(match[1]), lng: Number(match[2]) };
}

export function formatCoordinates(lat: number | null, lng: number | null): string {
  if (lat == null || lng == null) return "";
  return `${lat}, ${lng}`;
}

function safeDecode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

const isValidLatLng = (lat: number, lng: number) => Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

/** Extracts coordinates from a pasted Yandex/Google Maps link, or a plain "lat, lng" pair. */
export function parseMapsLink(raw: string): { lat: number; lng: number } | null {
  const text = safeDecode(raw.trim());

  // Google Maps: .../@lat,lng,15z
  const at = text.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
  if (at) {
    const lat = Number(at[1]);
    const lng = Number(at[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // Google Maps: ?q=lat,lng
  const q = text.match(/[?&]q=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
  if (q) {
    const lat = Number(q[1]);
    const lng = Number(q[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // Yandex Maps: ?ll=lon,lat (Yandex orders longitude first)
  const ll = text.match(/[?&]ll=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
  if (ll) {
    const lng = Number(ll[1]);
    const lat = Number(ll[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // Yandex Maps placemark: ?pt=lon,lat
  const pt = text.match(/[?&]pt=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
  if (pt) {
    const lng = Number(pt[1]);
    const lat = Number(pt[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // Fallback: plain "lat, lng" pair anywhere in the text
  const plain = text.match(/(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  if (plain) {
    const lat = Number(plain[1]);
    const lng = Number(plain[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  return null;
}
