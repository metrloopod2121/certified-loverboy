// Best-effort map of Moscow rail/metro stations to their line, for the colored
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
    "окружная", "владыкино", "ботанический сад", "ростокино", "белокаменная",
    "бульвар рокоссовского", "локомотив", "измайлово", "соколиная гора",
    "шоссе энтузиастов", "андроновка", "нижегородская", "новохохловская",
    "угрешская", "дубровка", "автозаводская", "зил", "верхние котлы",
    "крымская", "площадь гагарина", "лужники", "кутузовская", "деловой центр",
    "шелепиха", "хорошёво", "зорге", "панфиловская", "стрешнево", "балтийская",
    "коптево", "лихоборы",
  ],
  nekrasovskaya: [
    "некрасовка", "лухмановская", "косино", "юго-восточная", "окская", "стахановская",
  ],
  mcd1: [
    "лобня", "шереметьевская", "хлебниково", "водники", "долгопрудная", "новодачная",
    "марк", "лианозово", "бескудниково", "дегунино", "окружная", "тимирязевская",
    "савёловская", "белорусская", "беговая", "тестовская", "фили", "славянский бульвар",
    "кунцевская", "рабочий посёлок", "сетунь", "немчиновка", "сколково", "баковка",
    "одинцово",
  ],
  mcd2: [
    "нахабино", "аникеевка", "опалиха", "красногорская", "павшино", "пенягино",
    "волоколамская", "трикотажная", "тушинская", "щукинская", "стрешнево",
    "красный балтиец", "гражданская", "дмитровская", "марьина роща", "рижская",
    "площадь трёх вокзалов", "площадь трех вокзалов", "курская", "москва-товарная",
    "калитники", "новохохловская", "текстильщики", "печатники", "люблино", "депо",
    "перерва", "курьяново", "москворечье", "царицыно", "котляково", "покровское",
    "красный строитель", "битца", "бутово", "щербинка", "остафьево", "силикатная",
    "подольск",
  ],
  mcd3: [
    "зеленоград-крюково", "крюково", "малино", "фирсановская", "сходня", "подрезково",
    "новоподрезково", "молжаниново", "химки", "левобережная", "ховрино",
    "грачёвская", "грачевская", "моссельмаш", "лихоборы", "петровско-разумовская",
    "останкино", "рижская", "митьково", "электрозаводская", "сортировочная",
    "авиамоторная", "андроновка", "перово", "плющево", "вешняки", "выхино",
    "косино", "ухтомская", "люберцы", "панки", "томилино", "красково", "малаховка",
    "удельная", "быково", "ильинская", "отдых", "кратово", "есенинская", "фабричная",
    "раменское",
  ],
  mcd4: [
    "апрелевка", "победа", "крёкшино", "крекшино", "санино", "кокошкино",
    "толстопальцево", "лесной городок", "внуково", "мичуринец", "переделкино",
    "новопеределкино", "солнечная", "мещерская", "очаково", "аминьевская",
    "матвеевская", "минская", "поклонная", "кутузовская", "тестовская", "беговая",
    "белорусская", "савёловская", "марьина роща", "площадь трёх вокзалов",
    "площадь трех вокзалов", "курская", "серп и молот", "нижегородская",
    "чухлинка", "новогиреево", "реутов", "никольское", "салтыковская", "кучино",
    "ольгино", "железнодорожная",
  ],
};

type LineColor = {
  name: string;
  className: string;
  cardClassName: string;
  /** Railway lines (MCD/MCC) use a colored ring with a white center, not a filled metro dot. */
  markerClassName?: string;
  rail?: boolean;
};

const LINE_COLORS: Record<string, LineColor> = {
  sokolnicheskaya: { name: "Сокольническая", className: "bg-[var(--metro-red)]", cardClassName: "bg-[var(--metro-red-pale)]" },
  zamoskvoretskaya: { name: "Замоскворецкая", className: "bg-[var(--metro-green)]", cardClassName: "bg-[var(--metro-green-pale)]" },
  "arbatsko-pokrovskaya": { name: "Арбатско-Покровская", className: "bg-[var(--metro-blue)]", cardClassName: "bg-[var(--metro-blue-pale)]" },
  filyovskaya: { name: "Филёвская", className: "bg-[var(--metro-azure)]", cardClassName: "bg-[var(--metro-azure-pale)]" },
  koltsevaya: { name: "Кольцевая", className: "bg-[var(--metro-brown)]", cardClassName: "bg-[var(--metro-brown-pale)]" },
  "kaluzhsko-rizhskaya": { name: "Калужско-Рижская", className: "bg-[var(--metro-orange)]", cardClassName: "bg-[var(--metro-orange-pale)]" },
  "tagansko-krasnopresnenskaya": { name: "Таганско-Краснопресненская", className: "bg-[var(--metro-purple)]", cardClassName: "bg-[var(--metro-purple-pale)]" },
  "kalininsko-solntsevskaya": { name: "Калининско-Солнцевская", className: "bg-[var(--metro-yellow)]", cardClassName: "bg-[var(--metro-yellow-pale)]" },
  "serpukhovsko-timiryazevskaya": { name: "Серпуховско-Тимирязевская", className: "bg-[var(--metro-gray)]", cardClassName: "bg-[var(--metro-gray-pale)]" },
  "lyublinsko-dmitrovskaya": { name: "Люблинско-Дмитровская", className: "bg-[var(--metro-mint)]", cardClassName: "bg-[var(--metro-mint-pale)]" },
  "bolshaya-koltsevaya": { name: "Большая кольцевая", className: "bg-[var(--metro-teal)]", cardClassName: "bg-[var(--metro-teal-pale)]" },
  butovskaya: { name: "Бутовская", className: "bg-[var(--metro-turquoise)]", cardClassName: "bg-[var(--metro-turquoise-pale)]" },
  mtsk: {
    name: "МЦК",
    className: "bg-[var(--metro-mcc)]",
    cardClassName: "bg-[var(--metro-mcc-pale)]",
    markerClassName: "border-2 border-[var(--metro-mcc)] bg-white",
    rail: true,
  },
  nekrasovskaya: { name: "Некрасовская", className: "bg-[var(--metro-pink)]", cardClassName: "bg-[var(--metro-pink-pale)]" },
  mcd1: {
    name: "МЦД-1",
    className: "bg-[var(--metro-mcd1)]",
    cardClassName: "bg-[var(--metro-mcd1-pale)]",
    markerClassName: "border-2 border-[var(--metro-mcd1)] bg-white",
    rail: true,
  },
  mcd2: {
    name: "МЦД-2",
    className: "bg-[var(--metro-mcd2)]",
    cardClassName: "bg-[var(--metro-mcd2-pale)]",
    markerClassName: "border-2 border-[var(--metro-mcd2)] bg-white",
    rail: true,
  },
  mcd3: {
    name: "МЦД-3",
    className: "bg-[var(--metro-mcd3)]",
    cardClassName: "bg-[var(--metro-mcd3-pale)]",
    markerClassName: "border-2 border-[var(--metro-mcd3)] bg-white",
    rail: true,
  },
  mcd4: {
    name: "МЦД-4",
    className: "bg-[var(--metro-mcd4)]",
    cardClassName: "bg-[var(--metro-mcd4-pale)]",
    markerClassName: "border-2 border-[var(--metro-mcd4)] bg-white",
    rail: true,
  },
};

const stationLines: Record<string, string> = {};
for (const [line, stations] of Object.entries(LINE_STATIONS)) {
  for (const station of stations) {
    const existing = stationLines[station];
    if (!existing || (!LINE_COLORS[line].rail && LINE_COLORS[existing]?.rail)) {
      stationLines[station] = line;
    }
  }
}

function normalizeStation(value: string) {
  return value
    .toLocaleLowerCase("ru-RU")
    .replace(/^м(?:\.\s*|\s+)/u, "")
    .replace(/(^|\s)(?:мцд|mcd|d|д)\s*-?\s*[1-5](?=\s|$)/giu, " ")
    .replace(/(^|\s)(?:мцд|mcd|мцк|mcc)(?=\s|$)/giu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function explicitLine(value: string): string | null {
  const normalized = value.toLocaleLowerCase("ru-RU");
  if (/(^|\s)(?:мцк|mcc)(?=\s|$)/u.test(normalized)) return "mtsk";

  const match = normalized.match(/(^|\s)(?:мцд|mcd|d|д)\s*-?\s*([1-4])(?=\s|$)/u);
  return match ? `mcd${match[2]}` : null;
}

function stationLine(station: string | null | undefined): string | null {
  if (!station) return null;
  const explicit = explicitLine(station);
  if (explicit) return explicit;
  return stationLines[normalizeStation(station)] ?? null;
}

export function metroStations(value: string | null | undefined) {
  if (!value) return [];
  return value
    .split(/[;,]/u)
    .map((station) => station.replace(/^м(?:\.\s*|\s+)/u, "").trim())
    .filter(Boolean);
}

// Declaration order above matches official Moscow line numbering — reused here so grouped
// station lists come out in a sensible line order, not just alphabetically by line key.
const LINE_ORDER = Object.keys(LINE_STATIONS);

/** Sorts station names so every station on the same line sits together (in official line
 *  order), alphabetically within a line; stations with no known line trail at the end. */
export function sortStationsByLine(stations: string[]): string[] {
  function lineRank(station: string): number {
    const line = stationLine(station);
    const index = line ? LINE_ORDER.indexOf(line) : -1;
    return index === -1 ? LINE_ORDER.length : index;
  }

  return [...stations].sort((a, b) => lineRank(a) - lineRank(b) || a.localeCompare(b, "ru"));
}

export function withoutMetroTags(tags: unknown[], metroValues: Array<string | null | undefined>) {
  const stations = new Set(metroValues.flatMap(metroStations).map(normalizeStation));
  return tags.filter((tag): tag is string =>
    typeof tag === "string" && !stations.has(normalizeStation(tag))
  );
}

/** Tailwind bg-[...] class for a single station's line color, or null if unknown. */
export function metroLineTone(station: string | null | undefined): string | null {
  const line = stationLine(station);
  if (!line) return null;
  return LINE_COLORS[line].markerClassName ?? LINE_COLORS[line].className;
}

/** Pale card-background version of the same lookup, for a raw (possibly multi-station) `metro` field
 *  — uses the first station. */
export function metroPastelTone(station: string | null | undefined): string | null {
  const firstStation = metroStations(station)[0];
  if (!firstStation) return null;
  const line = stationLine(firstStation);
  return line ? LINE_COLORS[line].cardClassName : null;
}
