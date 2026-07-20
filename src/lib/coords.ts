export function parseCoordinates(raw: string): { lat: number; lng: number } | null {
  const match = raw.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  return { lat: Number(match[1]), lng: Number(match[2]) };
}

export function formatCoordinates(lat: number | null, lng: number | null): string {
  if (lat == null || lng == null) return "";
  return `${lat}, ${lng}`;
}
