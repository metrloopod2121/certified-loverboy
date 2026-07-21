import { randomUUID } from "node:crypto";
import path from "node:path";
import Database from "better-sqlite3";

const ideas = [
  {
    title: "Киновечер на крыше РУФ",
    locations: [
      ["Москва, ул. Новослободская, 48", "Новослободская", 55.786253, 37.595555],
      ["Москва, Новодмитровская ул., 1 стр. 1", "Дмитровская", 55.806531, 37.584972],
      ["Москва, Николоямская ул., 38/23с3", "Таганская", 55.746983, 37.658203],
    ],
  },
  {
    title: "Прогулка по ВДНХ и Ботаническому саду РАН",
    locations: [
      ["Москва, проспект Мира, 119", "ВДНХ", 55.826296, 37.63765],
      ["Москва, Ботаническая ул., 4", "Ботанический сад, Владыкино, ВДНХ", 55.840851, 37.605434],
    ],
  },
  { title: "hoopsy", locations: [["Москва, улица Родченко, 2", "ЗИЛ, Автозаводская", 55.698267, 37.631519]] },
  { title: "Masa Madre", locations: [["Москва, ул. Солянка, 1/2с1", "Китай-город", 55.754093, 37.638663]] },
  { title: "Zoe", locations: [["Москва, Мясницкая ул., 13с20", "Чистые пруды, Тургеневская, Сретенский бульвар", 55.763373, 37.633592]] },
  { title: "Skrepka Cafe", locations: [["Москва, Девяткин пер., 7", "Китай-город", 55.758909, 37.639749]] },
  {
    title: "Roaster Coffee",
    locations: [
      ["Москва, 4-я Тверская-Ямская ул., 2/11с2", "Маяковская", 55.771929, 37.59828],
      ["Москва, Долгоруковская ул., 32", "Новослободская, Менделеевская", 55.776926, 37.602958],
      ["Москва, Новая Дорога, 9к3", "", 55.772453, 37.700636],
    ],
  },
  { title: "Интеллигенция", locations: [["Москва, ул. Александра Солженицына, 17/1", "Марксистская, Таганская", 55.743852, 37.661651]] },
  { title: "Домик в саду", locations: [["Москва, проспект Мира, 119с512", "ВДНХ", 55.832603, 37.631577]] },
  { title: "SHARE", locations: [["Москва, Вознесенский пер., 5с1", "Арбатская, Тверская, Александровский сад", 55.757665, 37.603917]] },
  { title: "Cépage", locations: [["Москва, ул. Красная Пресня, 32-34с3", "Улица 1905 года, Краснопресненская", 55.762732, 37.568249]] },
  { title: "THAT PLACE", locations: [["Москва, Чистопрудный бул., 12к4", "Чистые пруды, Тургеневская, Сретенский бульвар", 55.761596, 37.64303]] },
  { title: "BSHUSHU", locations: [["Москва, 3-я ул. Ямского Поля, 2к3", "Белорусская, Савёловская", 55.781846, 37.581611]] },
  { title: "Grand Crew", locations: [["Москва, Новодмитровская ул., 1с9", "Дмитровская", 55.806916, 37.583197]] },
  {
    title: "Fettucciamo",
    locations: [
      ["Москва, Мясницкая ул., 16", "Лубянка, Китай-город", 55.76091, 37.632427],
      ["Москва, ул. Рождественка, 5/7с2", "Кузнецкий Мост", 55.760997, 37.623469],
    ],
  },
  { title: "Senti Menti", locations: [["Москва, ул. Солянка, 1/2с1", "Китай-город", 55.754244, 37.63749]] },
  { title: "Marta's Deli", locations: [["Московская область, деревня Сколково, Новая ул., 100с4", "Сколково", 55.692922, 37.385878]] },
  { title: "Лолита", locations: [["Москва, Яузская ул., 6", "Таганская, Китай-город", 55.747482, 37.646366]] },
  { title: "Кафе Дома Наркомфина", locations: [["Москва, Новинский бул., 25", "Баррикадная, Краснопресненская, Смоленская", 55.75685, 37.581139]] },
  { title: "La Mortazza", locations: [["Москва, ул. Сущёвская, 9", "Новослободская, Менделеевская", 55.780658, 37.601821]] },
  { title: "Chuck", locations: [["Санкт-Петербург, Гороховая ул., 41", "Сенная площадь, Спасская, Садовая", 59.928829, 30.32116]] },
];

function yandexMapsUrl(lat, lng) {
  const point = `${lng.toFixed(6)},${lat.toFixed(6)}`;
  return `https://yandex.ru/maps/?ll=${point}&z=18&pt=${point},pm2rdm`;
}

const db = new Database(path.resolve(process.cwd(), "data/app.db"));
const findIdea = db.prepare("SELECT id FROM DateIdea WHERE title = ?");
const deleteLocations = db.prepare("DELETE FROM Location WHERE dateIdeaId = ?");
const insertLocation = db.prepare(
  "INSERT INTO Location (id, dateIdeaId, address, metro, lat, lng, url) VALUES (?, ?, ?, ?, ?, ?, ?)"
);

const backfill = db.transaction(() => {
  let locationCount = 0;

  for (const idea of ideas) {
    const matches = findIdea.all(idea.title);
    if (matches.length !== 1) {
      throw new Error(`Expected one DateIdea titled \"${idea.title}\", found ${matches.length}`);
    }

    deleteLocations.run(matches[0].id);
    for (const [address, metro, lat, lng] of idea.locations) {
      insertLocation.run(
        `backfill-${randomUUID()}`,
        matches[0].id,
        address,
        metro || null,
        lat,
        lng,
        yandexMapsUrl(lat, lng)
      );
      locationCount += 1;
    }
  }

  return locationCount;
});

const locationCount = backfill();
console.log(`Updated ${ideas.length} ideas and ${locationCount} locations.`);
