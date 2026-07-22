import { parseCoordinates, parseMapsLink } from "@/lib/coords";
import { withoutMetroTags } from "@/lib/metro";
import type { DateIdeaInput } from "@/lib/types";

export type ParsedDateIdea = Pick<
  DateIdeaInput,
  "title" | "tags" | "priceNote" | "description" | "swipeDescription" | "locations"
>;

type LocationKey = "address" | "metro" | "url";
type OtherKey = "priceNote" | "swipeDescription";

type ParsedLocation = DateIdeaInput["locations"][number];

const LOCATION_KEYS: Record<string, LocationKey> = {
  "адрес": "address",
  "метро": "metro",
  "ссылка": "url",
};

const OTHER_KEYS: Record<string, OtherKey> = {
  "цена": "priceNote",
  "описание для свайпа": "swipeDescription",
  "свайп": "swipeDescription",
  "свайп описание": "swipeDescription",
  "свайп-описание": "swipeDescription",
};

const LOCATION_MARKER_KEYS = new Set(["место", "локация", "точка"]);

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

export function parseDateMarkdown(raw: string): ParsedDateIdea {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const result: ParsedDateIdea = {
    title: "",
    tags: [],
    priceNote: "",
    description: "",
    swipeDescription: "",
    locations: [],
  };
  let currentLocation: ParsedLocation | null = null;

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
        const baseLocation = currentOrNewLocation(result.locations, currentLocation);
        const location = hasFieldValue(baseLocation, field)
          ? startLocation(result.locations)
          : baseLocation;
        location[field] = value;
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

  if (result.locations.length === 0) {
    result.locations.push(emptyLocation());
  }
  result.tags = withoutMetroTags(result.tags, result.locations.map((location) => location.metro));
  result.description = descLines.join("\n").trim();
  return result;
}
