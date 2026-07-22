// Best-effort map of Moscow metro stations to their line, for the colored
// dots in filters and the metro-based card tint. Not guaranteed 100%
// exhaustive (new/outer stations especially) — adding a missing station is
// just one more entry in LINE_STATIONS below.
const LINE_STATIONS: Record<string, string[]> = {
  sokolnicheskaya: [
    "бульвар рокоссовского", "черкизовская", "преображенская площадь", "сокольники",
    "красносельская", "комсомольская", "красные ворота", "чистые пруды", "тургеневская",
    "лубянка", "охотный ряд", "библиотека имени ленина", "кропоткинская", "парк культуры",
    "фрунзенская", "спортивная", "воробьёвы горы", "университет", "проспект вернадского",
    "юго-западная", "тропарёво", "румянцево", "саларьево", "филатов луг", "прокшино",
    "ольховая", "столбово", "новомосковская", "потапово",
  ],
  zamoskvoretskaya: [
    "ховрино", "речной вокзал", "беломорская", "водный стадион", "войковская", "сокол",
    "аэропорт", "динамо", "белорусская", "маяковская", "тверская", "театральная",
    "новокузнецкая", "павелецкая", "автозаводская", "технопарк", "коломенская", "каширская",
    "кантемировская", "царицыно", "орехово", "домодедовская", "красногвардейская",
    "алма-атинская",
  ],
  "arbatsko-pokrovskaya": [
    "щёлковская", "первомайская", "измайловская", "партизанская", "семёновская",
    "электрозаводская", "бауманская", "курская", "площадь революции", "арбатская",
    "смоленская", "киевская", "парк победы", "славянский бульвар", "кунцевская",
    "пионерская", "молодёжная", "крылатское", "строгино", "мякинино", "волоколамская",
    "митино", "пятницкое шоссе",
  ],
  filyovskaya: [
    "александровский сад", "студенческая", "кутузовская", "багратионовская", "фили",
    "филёвский парк", "выставочная", "международная",
  ],
  koltsevaya: [
    "проспект мира", "новослободская", "краснопресненская", "октябрьская", "добрынинская",
    "таганская",
  ],
  "kaluzhsko-rizhskaya": [
    "медведково", "бабушкинская", "свиблово", "ботанический сад", "вднх", "алексеевская",
    "рижская", "сухаревская", "китай-город", "третьяковская", "шаболовская",
    "ленинский проспект", "академическая", "профсоюзная", "новые черёмушки", "калужская",
    "беляево", "коньково", "тёплый стан", "ясенево", "новоясеневская",
  ],
  "tagansko-krasnopresnenskaya": [
    "планерная", "сходненская", "тушинская", "щукинская", "октябрьское поле",
    "полежаевская", "беговая", "улица 1905 года", "баррикадная", "пушкинская",
    "кузнецкий мост", "пролетарская", "волгоградский проспект", "текстильщики",
    "кузьминки", "рязанский проспект", "выхино", "лермонтовский проспект", "жулебино",
    "котельники",
  ],
  "kalininsko-solntsevskaya": [
    "новокосино", "новогиреево", "перово", "шоссе энтузиастов", "авиамоторная",
    "площадь ильича", "марксистская", "деловой центр", "минская",
    "ломоносовский проспект", "раменки", "мичуринский проспект", "озёрная", "говорово",
    "солнцево", "боровское шоссе", "новопеределкино", "рассказовка",
  ],
  "serpukhovsko-timiryazevskaya": [
    "алтуфьево", "бибирево", "отрадное", "владыкино", "петровско-разумовская",
    "тимирязевская", "дмитровская", "савёловская", "менделеевская", "цветной бульвар",
    "чеховская", "боровицкая", "полянка", "серпуховская", "тульская", "нагатинская",
    "нагорная", "нахимовский проспект", "севастопольская", "чертановская", "южная",
    "пражская", "улица академика янгеля", "аннино", "бульвар дмитрия донского",
  ],
  "lyublinsko-dmitrovskaya": [
    "селигерская", "верхние лихоборы", "окружная", "фонвизинская", "бутырская",
    "марьина роща", "достоевская", "трубная", "сретенский бульвар", "чкаловская",
    "римская", "крестьянская застава", "дубровка", "кожуховская", "печатники",
    "волжская", "люблино", "братиславская", "марьино", "борисово", "шипиловская",
    "зябликово",
  ],
  "bolshaya-koltsevaya": [
    "лефортово", "нижегородская", "стрешнево", "панфиловская", "коптево", "лихоборы",
    "михалково", "зорге", "шелепиха", "давыдково", "аминьевская", "новаторская",
    "воронцовская", "зюзино", "каховская", "нагатинский затон", "кленовый бульвар",
    "текстильщики", "рубцовская", "открытое шоссе", "терехово", "мнёвники",
  ],
  butovskaya: [
    "бульвар адмирала ушакова", "улица скобелевская", "улица горчакова", "бунинская аллея",
  ],
  mtsk: [
    "измайлово", "локомотив", "белокаменная", "ростокино", "балтийская", "зил",
    "верхние котлы", "крымская", "площадь гагарина", "лужники",
  ],
  nekrasovskaya: [
    "некрасовка", "лухмановская", "косино", "юго-восточная", "окская", "стахановская",
  ],
};

const LINE_COLORS: Record<string, { name: string; className: string }> = {
  sokolnicheskaya: { name: "Сокольническая", className: "bg-[var(--metro-red)]" },
  zamoskvoretskaya: { name: "Замоскворецкая", className: "bg-[var(--metro-green)]" },
  "arbatsko-pokrovskaya": { name: "Арбатско-Покровская", className: "bg-[var(--metro-blue)]" },
  filyovskaya: { name: "Филёвская", className: "bg-[var(--metro-azure)]" },
  koltsevaya: { name: "Кольцевая", className: "bg-[var(--metro-brown)]" },
  "kaluzhsko-rizhskaya": { name: "Калужско-Рижская", className: "bg-[var(--metro-orange)]" },
  "tagansko-krasnopresnenskaya": { name: "Таганско-Краснопресненская", className: "bg-[var(--metro-purple)]" },
  "kalininsko-solntsevskaya": { name: "Калининско-Солнцевская", className: "bg-[var(--metro-yellow)]" },
  "serpukhovsko-timiryazevskaya": { name: "Серпуховско-Тимирязевская", className: "bg-[var(--metro-gray)]" },
  "lyublinsko-dmitrovskaya": { name: "Люблинско-Дмитровская", className: "bg-[var(--metro-mint)]" },
  "bolshaya-koltsevaya": { name: "Большая кольцевая", className: "bg-[var(--metro-teal)]" },
  butovskaya: { name: "Бутовская", className: "bg-[var(--metro-turquoise)]" },
  mtsk: { name: "МЦК", className: "bg-[var(--metro-tan)]" },
  nekrasovskaya: { name: "Некрасовская", className: "bg-[var(--metro-pink)]" },
};

const stationLines: Record<string, string> = {};
for (const [line, stations] of Object.entries(LINE_STATIONS)) {
  for (const station of stations) stationLines[station] = line;
}

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

/** Tailwind bg-[...] class for a single station's line color, or null if unknown. */
export function metroLineTone(station: string | null | undefined): string | null {
  if (!station) return null;
  const line = stationLines[normalizeStation(station)];
  return line ? LINE_COLORS[line].className : null;
}

/** Same lookup, but takes a raw (possibly multi-station) `metro` field and uses the first station. */
export function metroPastelTone(station: string | null | undefined) {
  const firstStation = metroStations(station)[0];
  return metroLineTone(firstStation);
}
