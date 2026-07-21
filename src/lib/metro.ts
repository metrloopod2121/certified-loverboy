const stationLines = {
  "алексеевская": "orange",
  "аэропорт": "green",
  "вднх": "orange",
  "калужская": "orange",
  "коломенская": "green",
  "речной вокзал": "green",
  "савёловская": "gray",
  "сокольники": "red",
  "спортивная": "red",
  "южная": "gray",
} as const;

const lineTones = {
  red: "bg-[var(--metro-red)]",
  green: "bg-[var(--metro-green)]",
  orange: "bg-[var(--metro-orange)]",
  gray: "bg-[var(--metro-gray)]",
} as const;

function normalizeStation(value: string) {
  return value
    .toLocaleLowerCase("ru-RU")
    .replace(/^м\.?\s*/u, "")
    .trim();
}

export function metroStations(value: string | null | undefined) {
  if (!value) return [];
  return value
    .split(/[;,]/u)
    .map((station) => station.replace(/^м\.?\s*/u, "").trim())
    .filter(Boolean);
}

export function withoutMetroTags(tags: unknown[], metroValues: Array<string | null | undefined>) {
  const stations = new Set(metroValues.flatMap(metroStations).map(normalizeStation));
  return tags.filter((tag): tag is string =>
    typeof tag === "string" && !stations.has(normalizeStation(tag))
  );
}

export function metroPastelTone(station: string | null | undefined) {
  const firstStation = metroStations(station)[0];
  if (!firstStation) return null;
  const line = stationLines[normalizeStation(firstStation) as keyof typeof stationLines];
  return line ? lineTones[line] : null;
}
