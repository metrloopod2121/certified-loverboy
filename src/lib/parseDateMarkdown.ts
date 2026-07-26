import { parseCoordinates, parseMapsLink, isYandexMapsUrl, stripTrailingPunctuation } from "@/lib/coords";
import { metroStations, withoutMetroTags } from "@/lib/metro";
import type { DateIdeaInput, PlaceLinkInput } from "@/lib/types";

export type ParsedDateIdea = Pick<
  DateIdeaInput,
  "title" | "tags" | "priceNote" | "description" | "locations" | "links"
>;

type LocationKey = "address" | "metro" | "url";
type OtherKey = "priceNote";

type ParsedLocation = DateIdeaInput["locations"][number];

const LOCATION_KEYS: Record<string, LocationKey> = {
  "адрес": "address",
  "метро": "metro",
  "ссылка": "url",
};

const OTHER_KEYS: Record<string, OtherKey> = {
  "цена": "priceNote",
};

const LOCATION_MARKER_KEYS = new Set(["место", "локация", "точка"]);
const URL_IN_TEXT = /https?:\/\/\S+/iu;

function emptyLocation(): ParsedLocation {
  return { address: "", metro: "", lat: null, lng: null, url: "" };
}

function hasLocationData(location: ParsedLocation): boolean {
  return Boolean(
    location.address.trim() ||
      location.metro.trim() ||
      location.url.trim() ||
      location.lat != null ||
      location.lng != null
  );
}

function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^[-*]\s*/, "")
    .replace(/\s+\d+$/, "");
}

function startLocation(locations: ParsedLocation[]): ParsedLocation {
  const last = locations[locations.length - 1];
  if (last && !hasLocationData(last)) return last;

  const location = emptyLocation();
  locations.push(location);
  return location;
}

function currentOrNewLocation(locations: ParsedLocation[], current: ParsedLocation | null): ParsedLocation {
  if (current) return current;
  return startLocation(locations);
}

function hasFieldValue(location: ParsedLocation, field: LocationKey | "coordinates"): boolean {
  if (field === "coordinates") return location.lat != null || location.lng != null;
  return location[field].trim() !== "";
}

function parseLinkValue(value: string): PlaceLinkInput | null {
  const match = value.match(URL_IN_TEXT);
  if (!match) return null;

  const url = stripTrailingPunctuation(match[0]);
  const label = value
    .slice(0, match.index)
    .trim()
    .replace(/[:—–-]+$/u, "")
    .trim();

  return { label, url };
}

function dedupeLinks(links: PlaceLinkInput[]): PlaceLinkInput[] {
  const seen = new Set<string>();
  return links.filter((link) => {
    const url = stripTrailingPunctuation(link.url.trim());
    if (!url || seen.has(url)) return false;
    seen.add(url);
    link.url = url;
    link.label = link.label.trim();
    return true;
  });
}

function mergeMetroValues(first: string, second: string): string {
  const stations: string[] = [];
  const seen = new Set<string>();
  for (const station of [...metroStations(first), ...metroStations(second)]) {
    const key = station.toLocaleLowerCase("ru-RU");
    if (seen.has(key)) continue;
    seen.add(key);
    stations.push(station);
  }
  return stations.join(", ");
}

function locationMergeKey(location: ParsedLocation): string | null {
  const address = location.address.trim().toLocaleLowerCase("ru-RU");
  if (address) return `address:${address}`;
  if (location.lat != null && location.lng != null) {
    return `coords:${location.lat.toFixed(6)},${location.lng.toFixed(6)}`;
  }
  return null;
}

function mergeLocations(locations: ParsedLocation[]): ParsedLocation[] {
  const merged: ParsedLocation[] = [];
  const byKey = new Map<string, ParsedLocation>();

  for (const location of locations) {
    if (!hasLocationData(location)) continue;

    const next: ParsedLocation = {
      address: location.address.trim(),
      metro: location.metro.trim(),
      lat: location.lat,
      lng: location.lng,
      url: stripTrailingPunctuation(location.url.trim()),
    };
    const key = locationMergeKey(next);
    const existing = key ? byKey.get(key) : null;

    if (!existing) {
      merged.push(next);
      if (key) byKey.set(key, next);
      continue;
    }

    if (!existing.address && next.address) existing.address = next.address;
    if (next.metro) existing.metro = existing.metro ? mergeMetroValues(existing.metro, next.metro) : next.metro;
    if (existing.lat == null && next.lat != null) existing.lat = next.lat;
    if (existing.lng == null && next.lng != null) existing.lng = next.lng;
    if (!existing.url && next.url) existing.url = next.url;
  }

  return merged;
}

export function parseDateMarkdown(raw: string): ParsedDateIdea {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const result: ParsedDateIdea = {
    title: "",
    tags: [],
    priceNote: "",
    description: "",
    locations: [],
    links: [],
  };
  let currentLocation: ParsedLocation | null = null;
  let typeTag: string | null = null;
  let swipeDescriptionFallback = "";

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
      const key = normalizeKey(match[1]);
      const value = match[2].trim();

      if (LOCATION_MARKER_KEYS.has(key)) {
        currentLocation = startLocation(result.locations);
        continue;
      }
      if (key === "тип") {
        if (value.toLowerCase() === "date") typeTag = "date";
        continue;
      }
      if (key === "описание") {
        if (value) descLines.push(value);
        continue;
      }
      if (key === "описание для свайпа") {
        if (value && !swipeDescriptionFallback) swipeDescriptionFallback = value;
        continue;
      }
      if (key === "координаты") {
        const baseLocation = currentOrNewLocation(result.locations, currentLocation);
        const location = hasFieldValue(baseLocation, "coordinates")
          ? startLocation(result.locations)
          : baseLocation;
        const coords = parseCoordinates(value) ?? parseMapsLink(value);
        if (coords) {
          location.lat = coords.lat;
          location.lng = coords.lng;
        }
        currentLocation = location;
        continue;
      }
      if (key === "теги") {
        result.tags = value.split(",").map((t) => t.trim()).filter(Boolean);
        continue;
      }
      if (key in LOCATION_KEYS) {
        const field = LOCATION_KEYS[key];
        // "Ссылка:" is ambiguous in this legacy format -- it could be the map link or just some
        // other link the author pasted in (Instagram, booking...). Only a real Yandex Maps link
        // is trusted as the location's map link; anything else goes to the idea's link list
        // instead of silently becoming (and being displayed as) the map link.
        const parsedLink = field === "url" ? parseLinkValue(value) : null;
        const url = parsedLink?.url ?? value;
        if (field === "url" && !isYandexMapsUrl(url)) {
          if (parsedLink) result.links.push(parsedLink);
          continue;
        }
        const baseLocation = currentOrNewLocation(result.locations, currentLocation);
        const location = hasFieldValue(baseLocation, field)
          ? startLocation(result.locations)
          : baseLocation;
        location[field] = field === "url" ? url : value;
        currentLocation = location;
        continue;
      }
      if (key in OTHER_KEYS) {
        const field = OTHER_KEYS[key];
        result[field] = value;
        continue;
      }
    }

    inDescription = true;
    descLines.push(line);
  }

  result.locations = mergeLocations(result.locations);
  if (result.locations.length === 0) {
    result.locations.push(emptyLocation());
  }
  if (typeTag && !result.tags.some((tag) => tag.toLowerCase() === typeTag)) {
    result.tags.push(typeTag);
  }
  result.links = dedupeLinks(result.links);
  result.tags = withoutMetroTags(result.tags, result.locations.map((location) => location.metro));
  result.description = descLines.join("\n").trim() || swipeDescriptionFallback;
  return result;
}
