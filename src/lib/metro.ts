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

export function metroPastelTone(station: string | null | undefined) {
  if (!station) return null;
  const line = stationLines[normalizeStation(station) as keyof typeof stationLines];
  return line ? lineTones[line] : null;
}
