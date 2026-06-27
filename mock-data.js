// Platzhalter-Kartendecks für den Prototyp. Echte Fotos/Werte kommen später.
// Zwei wählbare Kartensets: "familie" (Standard) und "auto" (klassisches Auto-Quartett).

// --- einfacher seeded Zufallsgenerator, damit beide Decks bei jedem Laden gleich aussehen ---
function erzeugeSeededZufall(seed) {
  let zustand = seed;
  return function () {
    zustand = (zustand * 1103515245 + 12345) & 0x7fffffff;
    return zustand / 0x7fffffff;
  };
}
function zufallInt(zufall, min, max) {
  return Math.floor(zufall() * (max - min + 1)) + min;
}

const AVATAR_FARBEN_POOL = [
  "#1a56a0", "#c9941f", "#9333ea", "#057a55", "#dc2626",
  "#0891b2", "#db2777", "#ea580c", "#4338ca", "#65a30d"
];

// --- Kartenset "Familie" ---

const KATEGORIEN_FAMILIE = {
  lautstaerke: { label: "Lautstärke", icon: "📢" },
  kochkuenste: { label: "Kochkünste", icon: "🍳" },
  sportlichkeit: { label: "Sportlichkeit", icon: "⚽" },
  geduld: { label: "Geduld", icon: "🧘" },
  schlafdauer: { label: "Schlafdauer", icon: "😴" },
  humor: { label: "Humor", icon: "😂" }
};

const KARTENDECK_FAMILIE_BASIS = [
  {
    id: "fam-01", name: "Opa Heinz", rolle: "Großvater", foto: null, avatarFarbe: "#1a56a0",
    eigenschaften: { lautstaerke: 95, kochkuenste: 40, sportlichkeit: 20, geduld: 88, schlafdauer: 65, humor: 70 }
  },
  {
    id: "fam-02", name: "Oma Erna", rolle: "Großmutter", foto: null, avatarFarbe: "#c9941f",
    eigenschaften: { lautstaerke: 60, kochkuenste: 99, sportlichkeit: 15, geduld: 92, schlafdauer: 55, humor: 80 }
  },
  {
    id: "fam-03", name: "Tante Trudi", rolle: "Tante", foto: null, avatarFarbe: "#9333ea",
    eigenschaften: { lautstaerke: 85, kochkuenste: 70, sportlichkeit: 35, geduld: 45, schlafdauer: 40, humor: 95 }
  },
  {
    id: "fam-04", name: "Onkel Bert", rolle: "Onkel", foto: null, avatarFarbe: "#057a55",
    eigenschaften: { lautstaerke: 70, kochkuenste: 25, sportlichkeit: 60, geduld: 50, schlafdauer: 80, humor: 60 }
  },
  {
    id: "fam-05", name: "Cousine Mia", rolle: "Cousine", foto: null, avatarFarbe: "#dc2626",
    eigenschaften: { lautstaerke: 90, kochkuenste: 30, sportlichkeit: 85, geduld: 20, schlafdauer: 30, humor: 75 }
  },
  {
    id: "fam-06", name: "Cousin Finn", rolle: "Cousin", foto: null, avatarFarbe: "#0891b2",
    eigenschaften: { lautstaerke: 55, kochkuenste: 15, sportlichkeit: 95, geduld: 35, schlafdauer: 45, humor: 50 }
  },
  {
    id: "fam-07", name: "Mama Sabine", rolle: "Mutter", foto: null, avatarFarbe: "#db2777",
    eigenschaften: { lautstaerke: 65, kochkuenste: 85, sportlichkeit: 50, geduld: 75, schlafdauer: 35, humor: 65 }
  },
  {
    id: "fam-08", name: "Papa Robert", rolle: "Vater", foto: null, avatarFarbe: "#ea580c",
    eigenschaften: { lautstaerke: 50, kochkuenste: 60, sportlichkeit: 70, geduld: 60, schlafdauer: 90, humor: 85 }
  }
];

const VORNAMEN_MAENNLICH = [
  "Klaus", "Werner", "Manfred", "Horst", "Dieter", "Günther", "Jürgen", "Rolf", "Hans", "Wolfgang",
  "Peter", "Uwe", "Helmut", "Heinrich", "Karl", "Walter", "Gerhard", "Herbert", "Siegfried", "Otto",
  "Kurt", "Erwin", "Hermann", "Alfred", "Willi", "Fritz", "Paul", "Rudi", "Bruno", "Egon",
  "Lukas", "Ben", "Jonas", "Felix", "Tim", "Niklas", "Jan", "David", "Tom", "Niko",
  "Max", "Leon", "Moritz", "Simon", "Anton", "Theo"
];
const VORNAMEN_WEIBLICH = [
  "Ingrid", "Helga", "Renate", "Brigitte", "Ursula", "Monika", "Petra", "Christa", "Gisela", "Elke",
  "Karin", "Marianne", "Gerda", "Sigrid", "Inge", "Anneliese", "Edith", "Lieselotte", "Margot", "Gertrud",
  "Hildegard", "Irmgard", "Frieda", "Else", "Liesel", "Marlene", "Hedwig", "Lotte", "Anita", "Gabi",
  "Waltraud", "Mara", "Emma", "Lea", "Nora", "Sophie", "Lara", "Anna", "Laura", "Julia",
  "Sarah", "Marie", "Hannah", "Lena", "Lina", "Frida"
];
const ROLLEN_MAENNLICH = [
  { kurz: "Onkel", voll: "Onkel" },
  { kurz: "Opa", voll: "Großvater" },
  { kurz: "Cousin", voll: "Cousin" },
  { kurz: "Neffe", voll: "Neffe" },
  { kurz: "Schwager", voll: "Schwager" },
  { kurz: "Patenonkel", voll: "Patenonkel" },
  { kurz: "Urgroßvater", voll: "Urgroßvater" }
];
const ROLLEN_WEIBLICH = [
  { kurz: "Tante", voll: "Tante" },
  { kurz: "Oma", voll: "Großmutter" },
  { kurz: "Cousine", voll: "Cousine" },
  { kurz: "Nichte", voll: "Nichte" },
  { kurz: "Schwägerin", voll: "Schwägerin" },
  { kurz: "Patentante", voll: "Patentante" },
  { kurz: "Urgroßmutter", voll: "Urgroßmutter" }
];

function erzeugeFamilienZusatzkarten() {
  const zufall = erzeugeSeededZufall(42);
  const karten = [];
  VORNAMEN_MAENNLICH.forEach((vorname, i) => {
    const rolle = ROLLEN_MAENNLICH[i % ROLLEN_MAENNLICH.length];
    karten.push({
      id: `fam-extra-m-${i + 1}`,
      name: `${rolle.kurz} ${vorname}`,
      rolle: rolle.voll,
      foto: null,
      avatarFarbe: AVATAR_FARBEN_POOL[i % AVATAR_FARBEN_POOL.length],
      eigenschaften: {
        lautstaerke: zufallInt(zufall, 5, 99),
        kochkuenste: zufallInt(zufall, 5, 99),
        sportlichkeit: zufallInt(zufall, 5, 99),
        geduld: zufallInt(zufall, 5, 99),
        schlafdauer: zufallInt(zufall, 5, 99),
        humor: zufallInt(zufall, 5, 99)
      }
    });
  });
  VORNAMEN_WEIBLICH.forEach((vorname, i) => {
    const rolle = ROLLEN_WEIBLICH[i % ROLLEN_WEIBLICH.length];
    karten.push({
      id: `fam-extra-w-${i + 1}`,
      name: `${rolle.kurz} ${vorname}`,
      rolle: rolle.voll,
      foto: null,
      avatarFarbe: AVATAR_FARBEN_POOL[(i + 3) % AVATAR_FARBEN_POOL.length],
      eigenschaften: {
        lautstaerke: zufallInt(zufall, 5, 99),
        kochkuenste: zufallInt(zufall, 5, 99),
        sportlichkeit: zufallInt(zufall, 5, 99),
        geduld: zufallInt(zufall, 5, 99),
        schlafdauer: zufallInt(zufall, 5, 99),
        humor: zufallInt(zufall, 5, 99)
      }
    });
  });
  return karten;
}

const KARTENDECK_FAMILIE = KARTENDECK_FAMILIE_BASIS.concat(erzeugeFamilienZusatzkarten());

// --- Kartenset "Auto" ---

const KATEGORIEN_AUTO = {
  leistung: { label: "Leistung (PS)", icon: "🐎" },
  hubraum: { label: "Hubraum (ccm)", icon: "🔧" },
  hoechstgeschwindigkeit: { label: "Höchstgeschw. (km/h)", icon: "🚀" },
  drehmoment: { label: "Drehmoment (Nm)", icon: "⚙️" },
  preis: { label: "Preis (€)", icon: "💰" },
  gewicht: { label: "Gewicht (kg)", icon: "⚖️" },
  zuladung: { label: "Zuladung (kg)", icon: "📦" },
  kofferraum: { label: "Kofferraum (l)", icon: "🧳" },
  reichweite: { label: "Reichweite (km)", icon: "⛽" },
  sitzplaetze: { label: "Sitzplätze", icon: "💺" }
};

const AUTO_MARKEN = [
  "Velocir", "Nordwind", "Falkata", "Cobalt", "Ravenna",
  "Pulsar", "Orbis", "Terran", "Skyline", "Quanto"
];
const AUTO_MODELLE = ["GT", "RS", "Spyder", "Tourer", "Voyager", "X1", "Pro", "Evo", "Limited", "Sport"];
const AUTO_TYPEN = [
  "Sportwagen", "SUV", "Kombi", "Limousine", "Kleinwagen",
  "Cabrio", "Van", "Pickup", "Coupé", "Elektro-SUV"
];

function erzeugeAutoDeck() {
  const zufall = erzeugeSeededZufall(1985);
  const karten = [];
  for (let i = 0; i < 100; i++) {
    const marke = AUTO_MARKEN[Math.floor(i / 10)];
    const modell = AUTO_MODELLE[i % 10];
    const typ = AUTO_TYPEN[i % AUTO_TYPEN.length];
    karten.push({
      id: `auto-${i + 1}`,
      name: `${marke} ${modell}`,
      rolle: typ,
      foto: null,
      avatarFarbe: AVATAR_FARBEN_POOL[i % AVATAR_FARBEN_POOL.length],
      eigenschaften: {
        leistung: zufallInt(zufall, 60, 650),
        hubraum: zufallInt(zufall, 900, 6000),
        hoechstgeschwindigkeit: zufallInt(zufall, 140, 330),
        drehmoment: zufallInt(zufall, 100, 900),
        preis: zufallInt(zufall, 12000, 250000),
        gewicht: zufallInt(zufall, 900, 2800),
        zuladung: zufallInt(zufall, 300, 900),
        kofferraum: zufallInt(zufall, 150, 2200),
        reichweite: zufallInt(zufall, 350, 1100),
        sitzplaetze: zufallInt(zufall, 2, 9)
      }
    });
  }
  return karten;
}

const KARTENDECK_AUTO = erzeugeAutoDeck();

// --- Zugriff über Kartenset-Schlüssel ("familie" | "auto") ---

function getKategorien(kartenSet) {
  return kartenSet === "auto" ? KATEGORIEN_AUTO : KATEGORIEN_FAMILIE;
}

// Gibt immer eine frische Kopie zurück, damit niemand versehentlich das Original-Deck mutiert.
function getMockDeck(kartenSet) {
  const deck = kartenSet === "auto" ? KARTENDECK_AUTO : KARTENDECK_FAMILIE;
  return deck.map(karte => ({
    ...karte,
    eigenschaften: { ...karte.eigenschaften }
  }));
}

// Generischer Fisher-Yates-Shuffle, mutiert nicht das übergebene Array.
function mischeArray(array) {
  const kopie = [...array];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}
